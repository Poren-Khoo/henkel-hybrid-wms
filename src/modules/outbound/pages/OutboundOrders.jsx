import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Sheet, SheetHeader, SheetTitle, SheetContent, SheetFooter } from '../../../components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs'
import { 
  Search, Filter, FileText, Truck, Factory, 
  CheckCircle, AlertCircle, Clock, Package, CheckCircle2,
  ClipboardCheck, Box, ArrowRight, Plus, FileDown, RotateCcw, User, Trash2
} from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { WarehouseSelect } from '../../../components/selectors/WarehouseSelect'
import { MaterialSelect } from '../../../components/selectors/Material'
import { OutboundOrderValidator, OutboundOrderValidationError } from '../../../domain/outbound/OutboundOrderValidator'
import { OutboundOrderService } from '../../../domain/outbound/OutboundOrderService'
import OutboundOrderDetail from './OutboundOrderDetail'

// TOPICS - Unified Control Tower subscribes to multiple sources
const TOPIC_COST_DB = "Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB"
const TOPIC_SYNC_STATUS = "Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status"
const TOPIC_SHIPMENT_LIST = "Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List"
const TOPIC_ACTION_REVIEW = "Henkelv2/Shanghai/Logistics/Costing/Action/Review_DN"
const TOPIC_UPDATE_ACTION = "Henkelv2/Shanghai/Logistics/External/Integration/Action/Update_Status"
const TOPIC_CREATE_ACTION = "Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Order"

// --- ENTERPRISE CONSTANTS ---
const BUSINESS_TYPES = {
  'SALES_ORDER': { label: 'Sales Shipment (DN)', color: 'bg-blue-50 text-blue-700', icon: Truck },
  'TRANSFER_OUT': { label: 'Inter-WH Transfer', color: 'bg-purple-50 text-purple-700', icon: Factory }
}

const INITIAL_FILTER_STATE = {
  docId: '',
  customer: '',
  warehouse: '',
  operator: '',
  status: 'ALL',
  type: 'ALL',
}

const INITIAL_ORDER_STATE = {
  type: 'SALES_ORDER',
  customer: '',
  destination: '',
  warehouse: 'WH01',
  operator: 'Current User',
  requestedDate: new Date().toLocaleDateString('en-CA'),
  lines: [{ code: '', qty: '100' }]
}

export default function OutboundOrders() {
  const { data, publish } = useGlobalUNS()
  
  // --- FILTER STATE (separate input vs active query) ---
  const [filterInputs, setFilterInputs] = useState(INITIAL_FILTER_STATE)
  const [activeQuery, setActiveQuery] = useState(INITIAL_FILTER_STATE)
  
  // --- MODAL STATES ---
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewDetailsOrder, setViewDetailsOrder] = useState(null) // For view-only modal
  const [actionOrder, setActionOrder] = useState(null) // For workflow actions sheet
  const [newOrder, setNewOrder] = useState(INITIAL_ORDER_STATE)
  
  // --- APPROVAL & WORKFLOW STATE (for action sheet) ---
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(null)
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  // Sync currentStatus with actionOrder
  useEffect(() => {
    if (actionOrder) {
      setCurrentStatus(actionOrder.status)
    }
  }, [actionOrder])

  // --- DATA MERGING (The "Control Tower" Logic) ---
  const orders = useMemo(() => {
    // 1. Commercial DNs (from costing workflow)
    const rawCostDNs = Array.isArray(data.dns) ? data.dns : []
    
    // 2. Commercial DNs (from sync status - for logistics view)
    // Handle UNS envelope unwrapping
    const syncRaw = data.raw[TOPIC_SYNC_STATUS]
    let syncPacket = syncRaw
    if (syncRaw?.topics && Array.isArray(syncRaw.topics) && syncRaw.topics.length > 0) {
      syncPacket = syncRaw.topics[0].value || syncRaw.topics[0]
    }
    
    // Handle different data structures
    const syncRecords = Array.isArray(syncPacket) 
      ? syncPacket 
      : syncPacket?.sync_records || syncPacket?.items || []
    
    // Filter for outbound/DN records and normalize
    const syncDNs = syncRecords
      .filter(record => {
        const type = (record.type || '').toUpperCase()
        return type.includes('OUTBOUND') || type.includes('DN')
      })
      .map(record => OutboundOrderService.normalizeOrder(record, 'sync'))
      .filter(order => order !== null)

    // 3. Manufacturing Shipments (from dispatch)
    // Handle UNS envelope unwrapping
    const shipmentRaw = data.raw[TOPIC_SHIPMENT_LIST]
    let shipmentPacket = shipmentRaw
    if (shipmentRaw?.topics && Array.isArray(shipmentRaw.topics) && shipmentRaw.topics.length > 0) {
      shipmentPacket = shipmentRaw.topics[0].value || shipmentRaw.topics[0]
    }
    
    // Handle different data structures
    const rawShipments = Array.isArray(shipmentPacket)
      ? shipmentPacket
      : shipmentPacket?.items || shipmentPacket?.shipments || []
    
    // Normalize shipments
    const formattedShipments = rawShipments
      .map(s => OutboundOrderService.normalizeOrder(s, 'shipment'))
      .filter(order => order !== null)

    // 4. Normalize costing DNs
    const costingOrders = rawCostDNs
      .map(dn => OutboundOrderService.normalizeOrder(dn, 'costing'))
      .filter(order => order !== null)

    // 5. Merge all orders (prioritizes costing for cost info)
    const merged = OutboundOrderService.mergeOrders(costingOrders, syncDNs, formattedShipments)
    
    // Debug logging for orders with PENDING_APPROVAL status
    const pendingApproval = merged.filter(o => (o.status || '').toUpperCase() === 'PENDING_APPROVAL')
    if (pendingApproval.length > 0) {
      console.log('[OutboundOrders] PENDING_APPROVAL orders found:', pendingApproval.map(o => ({
        id: o.id,
        hasBreakdown: !!o.breakdown,
        breakdown: o.breakdown,
        hasCost: !!o.cost,
        source: o.raw ? 'has raw data' : 'no raw data'
      })))
    }
    
    return merged
  }, [data.dns, data.raw])

  // --- FILTERING (using activeQuery) ---
  const filteredOrders = useMemo(() => {
    let filtered = orders
    
    // Apply active query filters
    if (activeQuery.docId) {
      filtered = filtered.filter(o => o.id.toLowerCase().includes(activeQuery.docId.toLowerCase()))
    }
    if (activeQuery.customer) {
      filtered = filtered.filter(o => 
        (o.customer || o.destination || '').toLowerCase().includes(activeQuery.customer.toLowerCase())
      )
    }
    if (activeQuery.warehouse) {
      // Filter by warehouse if order has warehouse field
      filtered = filtered.filter(o => {
        const orderWh = o.warehouse || o.source_warehouse || ''
        return orderWh === activeQuery.warehouse
      })
    }
    if (activeQuery.operator) {
      // Filter by operator if order has operator field
      filtered = filtered.filter(o => {
        const orderOp = o.operator || o.created_by || ''
        return orderOp.toLowerCase().includes(activeQuery.operator.toLowerCase())
      })
    }
    if (activeQuery.type !== 'ALL') {
      filtered = OutboundOrderService.filterOrdersByType(filtered, activeQuery.type)
    }
    if (activeQuery.status !== 'ALL') {
      filtered = filtered.filter(o => {
        const status = (o.status || '').toUpperCase()
        return status === activeQuery.status.toUpperCase()
      })
    }
    
    return filtered
  }, [orders, activeQuery])

  // --- FILTER HANDLERS ---
  const handleQuery = () => setActiveQuery(filterInputs)
  
  const handleResetFilters = () => {
    setFilterInputs(INITIAL_FILTER_STATE)
    setActiveQuery(INITIAL_FILTER_STATE)
  }

  // --- EXPORT FUNCTIONALITY ---
  const handleExport = () => {
    const headers = ['Order #', 'Type', 'Customer', 'Destination', 'Qty', 'Cost', 'Status']
    const rows = filteredOrders.map(order => [
      order.id,
      order.type,
      order.customer || '',
      order.destination || '',
      order.qty || 0,
      order.cost ? `¥${Number(order.cost).toFixed(2)}` : '-',
      order.status
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `outbound-orders-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // --- ACTIONS ---
  
  // Approval Actions (from DnApproval)
  const handleApprove = () => {
    if (!actionOrder) return
    
    try {
      // Validate and build command
      OutboundOrderValidator.validateApprovalAction(actionOrder.id, actionOrder.status)
      const payload = OutboundOrderService.buildApproveCommand(actionOrder.id)
      publish(TOPIC_ACTION_REVIEW, payload)
      closeActionSheet()
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) {
        alert(error.message)
        return
      }
      throw error
    }
  }

  const handleReject = () => {
    if (!actionOrder) return
    
    try {
      // Validate and build command
      const payload = OutboundOrderService.buildRejectCommand(
        actionOrder.id, 
        rejectReason, 
        actionOrder.status
      )
      publish(TOPIC_ACTION_REVIEW, payload)
      closeActionSheet()
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) {
        alert(error.message)
        return
      }
      throw error
    }
  }

  // Release & Workflow Actions (from OutboundDN)
  const sendStatusUpdate = (newStatus) => {
    if (!actionOrder) return
    
    try {
      // Validate and build command
      const payload = OutboundOrderService.buildStatusUpdateCommand(
        actionOrder.id,
        newStatus,
        currentStatus || actionOrder.status,
        carrier,
        trackingNumber
      )
      publish(TOPIC_UPDATE_ACTION, payload)
      setCurrentStatus(newStatus)
      if (actionOrder) {
        setActionOrder({ ...actionOrder, status: newStatus })
      }
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) {
        alert(error.message)
        return
      }
      throw error
    }
  }

  const handleReleaseToPicking = () => sendStatusUpdate('PICKING')
  const handleConfirmPacking = () => sendStatusUpdate('PACKING')
  const handleReadyToShip = () => sendStatusUpdate('READY_TO_SHIP')
  const handleConfirmShipment = () => {
    sendStatusUpdate('SHIPPED')
    setCarrier('')
    setTrackingNumber('')
  }

  // Modal/Sheet handlers
  const closeActionSheet = () => {
    setActionOrder(null)
    setShowRejectDialog(false)
    setRejectReason('')
    setCurrentStatus(null)
    setCarrier('')
    setTrackingNumber('')
  }

  const openViewDetails = (order) => {
    setViewDetailsOrder(order)
    setActionOrder(null)
  }

  const openActions = (order) => {
    setActionOrder(order)
    setViewDetailsOrder(null)
    setCarrier(order.carrier || '')
    setTrackingNumber(order.trackingNumber || '')
  }

  // Create form handlers
  const handleCreate = () => {
    try {
      // Will need to add buildCreateCommand to OutboundOrderService
      const payload = OutboundOrderService.buildCreateCommand ? 
        OutboundOrderService.buildCreateCommand(newOrder) :
        {
          type: newOrder.type,
          customer: newOrder.customer || newOrder.destination,
          destination: newOrder.destination,
          warehouse: newOrder.warehouse,
          operator: newOrder.operator,
          requested_date: newOrder.requestedDate,
          lines: newOrder.lines.filter(l => l.code && l.qty)
        }
      
      publish(TOPIC_CREATE_ACTION, payload)
      setIsCreateOpen(false)
      setNewOrder(INITIAL_ORDER_STATE)
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) {
        alert(error.message)
        return
      }
      throw error
    }
  }

  const addLine = () => {
    setNewOrder(prev => ({ ...prev, lines: [...prev.lines, { code: '', qty: '100' }] }))
  }

  const updateLine = (index, field, value) => {
    setNewOrder(prev => {
      const updatedLines = [...prev.lines]
      updatedLines[index] = { ...updatedLines[index], [field]: value }
      return { ...prev, lines: updatedLines }
    })
  }

  const removeLine = (index) => {
    if (newOrder.lines.length <= 1) return
    setNewOrder(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }))
  }

  // --- HELPERS ---
  
  const getStatusBadge = (status) => {
    const config = OutboundOrderValidator.getStatusBadgeConfig(status)
    return (
      <Badge 
        variant={config.variant} 
        className={config.className}
      >
        {config.label}
      </Badge>
    )
  }

  // Progress calculation (from OutboundDN)
  const getProgressSteps = (order) => {
    if (!order) return []
    const status = order.status || ''
    return OutboundOrderService.getProgressSteps(status)
  }

  const getProgressPercentage = (status) => {
    return OutboundOrderService.calculateProgressPercentage(status)
  }

  return (
    <PageContainer title="Outbound Orders" subtitle="Unified Dispatch Control Tower (Sales & Production)">
      <div className="space-y-4">
        <UNSConnectionInfo topic={TOPIC_COST_DB} />

        {/* === SECTION 1: FILTER MATRIX (ENTERPRISE SCALE) === */}
        <Card className="border-slate-200 shadow-sm bg-slate-50/50">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* 1. Document Number */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500">Document #</Label>
                <Input 
                  placeholder="e.g. DN-2026..." 
                  className="bg-white h-8 text-sm"
                  value={filterInputs.docId}
                  onChange={e => setFilterInputs(prev => ({...prev, docId: e.target.value}))}
                />
              </div>
              {/* 2. Warehouse */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500">Warehouse</Label>
                <WarehouseSelect 
                  value={filterInputs.warehouse} 
                  onChange={v => setFilterInputs(prev => ({...prev, warehouse: v}))} 
                />
              </div>
              {/* 3. Customer/Destination */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500">Customer / Destination</Label>
                <Input 
                  placeholder="Search Customer or Destination..." 
                  className="bg-white h-8 text-sm"
                  value={filterInputs.customer}
                  onChange={e => setFilterInputs(prev => ({...prev, customer: e.target.value}))}
                />
              </div>
              {/* 4. Operator */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500">Operator</Label>
                <div className="relative">
                  <User className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                  <Input 
                    placeholder="Select Operator" 
                    className="bg-white h-8 text-sm pl-8"
                    value={filterInputs.operator}
                    onChange={e => setFilterInputs(prev => ({...prev, operator: e.target.value}))}
                  />
                </div>
              </div>
              {/* 5. Business Type */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500">Business Type</Label>
                <Select value={filterInputs.type} onValueChange={v => setFilterInputs(prev => ({...prev, type: v}))}>
                  <SelectTrigger className="bg-white h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    {Object.entries(BUSINESS_TYPES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 6. Status */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-500">Status</Label>
                <Select value={filterInputs.status} onValueChange={v => setFilterInputs(prev => ({...prev, status: v}))}>
                  <SelectTrigger className="bg-white h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="PICKING">Picking</SelectItem>
                    <SelectItem value="PACKING">Packing</SelectItem>
                    <SelectItem value="READY_TO_SHIP">Ready to Ship</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="md:col-span-2 flex justify-end items-end gap-2">
                <Button variant="outline" size="sm" className="h-8 bg-white" onClick={handleResetFilters}>
                  <RotateCcw className="h-3 w-3 mr-2" /> Reset
                </Button>
                <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6" onClick={handleQuery}>
                  <Search className="h-3 w-3 mr-2" /> Query
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* === SECTION 2: QUICK FILTERS & TOOLBAR === */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
            <Button 
              variant={activeQuery.status === 'PENDING_APPROVAL' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => {
                const newState = { ...INITIAL_FILTER_STATE, status: 'PENDING_APPROVAL' }
                setFilterInputs(newState)
                setActiveQuery(newState)
              }} 
              className="rounded-full h-7 text-xs"
            >
              Pending Approval
            </Button>
            <Button 
              variant={activeQuery.status === 'READY_TO_SHIP' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => {
                const newState = { ...INITIAL_FILTER_STATE, status: 'READY_TO_SHIP' }
                setFilterInputs(newState)
                setActiveQuery(newState)
              }} 
              className="rounded-full h-7 text-xs"
            >
              Ready to Ship
            </Button>
            <Button 
              variant={activeQuery.type === 'SALES_ORDER' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => {
                const newState = { ...INITIAL_FILTER_STATE, type: 'SALES_ORDER' }
                setFilterInputs(newState)
                setActiveQuery(newState)
              }} 
              className="rounded-full h-7 text-xs"
            >
              Sales Orders
            </Button>
            <Button 
              variant={activeQuery.type === 'TRANSFER_OUT' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => {
                const newState = { ...INITIAL_FILTER_STATE, type: 'TRANSFER_OUT' }
                setFilterInputs(newState)
                setActiveQuery(newState)
              }} 
              className="rounded-full h-7 text-xs"
            >
              Transfers
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50" onClick={handleExport}>
              <FileDown className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button className="bg-[#a3e635] text-slate-900 font-bold hover:bg-[#8cd121] shadow-sm h-9 text-xs" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Order
            </Button>
          </div>
        </div>

        {/* === SECTION 3: MAIN TABLE === */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                <TableHead className="h-10 text-xs font-bold text-slate-700 w-[60px]">Seq</TableHead>
                <TableHead className="h-10 text-xs font-bold text-slate-700">Document #</TableHead>
                <TableHead className="h-10 text-xs font-bold text-slate-700 text-center">Status</TableHead>
                <TableHead className="h-10 text-xs font-bold text-slate-700">Business Type</TableHead>
                <TableHead className="h-10 text-xs font-bold text-slate-700">Customer / Destination</TableHead>
                <TableHead className="h-10 text-xs font-bold text-slate-700 text-right">Qty</TableHead>
                <TableHead className="h-10 text-xs font-bold text-slate-700 text-right">Total Cost</TableHead>
                <TableHead className="h-10 text-xs font-bold text-slate-700">Progress</TableHead>
                <TableHead className="h-10 text-xs font-bold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="h-8 w-8 text-slate-300" />
                      <p>No orders match your query.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order, index) => {
                  const bizStyle = BUSINESS_TYPES[order.type] || { label: order.type, color: 'bg-slate-100 text-slate-600' }
                  const Icon = bizStyle.icon || Truck
                  return (
                    <TableRow key={order.id} className="hover:bg-blue-50/50 transition-colors border-b border-slate-100">
                      <TableCell className="text-xs text-slate-500">{index + 1}</TableCell>
                      <TableCell 
                        className="font-mono text-xs font-bold text-blue-600 cursor-pointer hover:underline"
                        onClick={() => openViewDetails(order)}
                      >
                        {order.id}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${bizStyle.color} flex items-center gap-1 w-fit`}>
                          <Icon className="h-3 w-3" />
                          {bizStyle.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-900 font-medium">{order.customer || order.destination}</TableCell>
                      <TableCell className="text-xs text-slate-600 text-right font-mono">{order.qty || 0}</TableCell>
                      <TableCell className="text-xs text-slate-600 text-right font-mono">
                        {order.cost ? `¥${Number(order.cost).toFixed(2)}` : <span className="text-slate-400">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#a3e635] transition-all"
                              style={{ width: `${getProgressPercentage(order.status)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => openViewDetails(order)}>View</Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openActions(order)}>Actions</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* --- VIEW DETAILS SHEET (Read-only) --- */}
        <OutboundOrderDetail
          order={viewDetailsOrder}
          open={!!viewDetailsOrder}
          onClose={() => setViewDetailsOrder(null)}
          onAction={(order) => {
            openActions(order)
            setViewDetailsOrder(null)
          }}
        />

        {/* --- ACTIONS SHEET (Workflow Actions) --- */}
        <Sheet open={!!actionOrder} onOpenChange={(open) => !open && closeActionSheet()}>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            {actionOrder && (
              <>
                <SheetHeader className="mb-6 border-b border-slate-100 pb-4">
                  <SheetTitle>Workflow Actions: {actionOrder.id}</SheetTitle>
                </SheetHeader>
                
                <div className="space-y-6">
                  {/* Workflow Actions */}
                  {actionOrder.status !== 'PENDING_APPROVAL' && (
                    <div className="pt-4">
                      <Card className="border border-slate-200 shadow-sm bg-slate-50/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            Workflow Actions
                            <span className="text-[10px] font-normal text-slate-400 bg-white border px-1.5 py-0.5 rounded-full">Live</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const status = (currentStatus || actionOrder.status || '').toUpperCase().trim()
                            
                            if (status === 'NEW' || status === 'PENDING') {
                              return (
                                <Button onClick={handleReleaseToPicking} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                                  <ClipboardCheck className="h-4 w-4" /> Release to Picking
                                </Button>
                              )
                            }
                            if (status === 'PICKING') {
                              return (
                                <Button onClick={handleConfirmPacking} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                                  <Box className="h-4 w-4" /> Confirm Packing
                                </Button>
                              )
                            }
                            if (status === 'PACKING') {
                              return (
                                <Button onClick={handleReadyToShip} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                                  <ArrowRight className="h-4 w-4" /> Ready to Ship
                                </Button>
                              )
                            }
                            if (status === 'READY_TO_SHIP' || status === 'READY TO SHIP') {
                              return (
                                <div className="space-y-3">
                                  <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-700">Carrier</Label>
                                    <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. DHL" className="h-8 text-sm" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-700">Tracking #</Label>
                                    <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking ID" className="h-8 text-sm" />
                                  </div>
                                  <Button onClick={handleConfirmShipment} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                                    <Truck className="h-4 w-4" /> Confirm Shipment
                                  </Button>
                                </div>
                              )
                            }
                            return (
                              <div className="text-center py-2 text-sm text-slate-500 bg-white rounded border border-slate-100">
                                All actions completed for this order.
                              </div>
                            )
                          })()}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Reject Dialog (for approval orders) */}
                  {showRejectDialog && actionOrder.status === 'PENDING_APPROVAL' && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 mb-2 text-red-700 font-semibold">
                        <AlertCircle size={16} />
                        Reject Reason
                      </div>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full h-24 rounded-md border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter reason for rejection (e.g. Rate Card mismatch)..."
                      />
                    </div>
                  )}
                </div>

                <SheetFooter className="mt-6 flex-col sm:flex-col gap-3">
                  {actionOrder.status === 'PENDING_APPROVAL' ? (
                    !showRejectDialog ? (
                      <>
                        <Button 
                          onClick={handleApprove}
                          className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold h-12 shadow-sm px-4 inline-flex items-center gap-2"
                        >
                          <CheckCircle className="h-5 w-5" /> Approve & Bill
                        </Button>
                        <Button 
                          onClick={() => setShowRejectDialog(true)}
                          variant="outline"
                          className="w-full border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          Dispute / Reject
                        </Button>
                      </>
                    ) : (
                      <div className="flex gap-3 w-full">
                        <Button 
                          onClick={() => setShowRejectDialog(false)}
                          variant="outline"
                          className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleReject}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                          Confirm Reject
                        </Button>
                      </div>
                    )
                  ) : null}
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* --- CREATE MODAL (POLYMORPHIC) --- */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Create Outbound Order</DialogTitle>
              <DialogDescription>
                {newOrder.type === 'SALES_ORDER' ? "Create Sales Shipment (DN)" : "Create Inter-Warehouse Transfer"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {/* Row 1: Common Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Business Type</Label>
                  <Select value={newOrder.type} onValueChange={v => setNewOrder(prev => ({...prev, type: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(BUSINESS_TYPES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Warehouse</Label>
                  <WarehouseSelect value={newOrder.warehouse} onChange={v => setNewOrder(prev => ({...prev, warehouse: v}))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Requested Ship Date</Label>
                  <Input type="date" value={newOrder.requestedDate} onChange={e => setNewOrder(prev => ({...prev, requestedDate: e.target.value}))} />
                </div>
              </div>

              {/* Row 2: Polymorphic Fields */}
              <div className="bg-slate-50 p-3 rounded border border-slate-100">
                {newOrder.type === 'SALES_ORDER' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-blue-700">Customer</Label>
                      <Input 
                        placeholder="Search Customer..." 
                        value={newOrder.customer}
                        onChange={e => setNewOrder(prev => ({...prev, customer: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Operator</Label>
                      <Input value={newOrder.operator} onChange={e => setNewOrder(prev => ({...prev, operator: e.target.value}))} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-purple-700">Destination</Label>
                      <Input 
                        placeholder="Destination Warehouse..." 
                        value={newOrder.destination}
                        onChange={e => setNewOrder(prev => ({...prev, destination: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Operator</Label>
                      <Input value={newOrder.operator} onChange={e => setNewOrder(prev => ({...prev, operator: e.target.value}))} />
                    </div>
                  </div>
                )}
              </div>

              {/* Row 3: Lines Area */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs font-bold">Line Items</Label>
                  <Button size="sm" variant="ghost" onClick={addLine} className="h-6 text-xs"><Plus className="h-3 w-3 mr-1"/> Add Line</Button>
                </div>
                {newOrder.lines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <MaterialSelect value={line.code} onChange={(val) => updateLine(idx, 'code', val)} />
                    </div>
                    <div className="w-24">
                      <Input 
                        type="number" 
                        placeholder="Qty" 
                        className="h-8 text-xs bg-white"
                        value={line.qty}
                        onChange={e => updateLine(idx, 'qty', e.target.value)}
                      />
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => removeLine(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} className="bg-[#a3e635] text-slate-900 font-bold hover:bg-[#8cd121]">Confirm Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}