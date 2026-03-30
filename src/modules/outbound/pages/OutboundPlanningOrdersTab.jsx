import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Sheet, SheetHeader, SheetTitle, SheetContent, SheetFooter } from '../../../components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import {
  Search, Filter, Truck, Factory,
  CheckCircle, AlertCircle, Loader2,
  ClipboardCheck, Box, ArrowRight, Plus, FileDown, RotateCcw, User, Trash2,
  Pause, Play, X, Package, Calendar, MapPin, CheckCircle2
} from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { WarehouseSelect } from '../../../components/selectors/WarehouseSelect'
import { MaterialSelect } from '../../../components/selectors/Material'
import { CustomerSelect } from '../../../components/selectors/CustomerSelect'
import { OutboundOrderValidator, OutboundOrderValidationError } from '../../../domain/outbound/OutboundOrderValidator'
import { OutboundOrderService } from '../../../domain/outbound/OutboundOrderService'
import OutboundOrderDetail from './OutboundOrderDetail'

// TOPICS
const TOPIC_COST_DB = "Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB"
const TOPIC_SYNC_STATUS = "Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status"
const TOPIC_SHIPMENT_LIST = "Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List"
const TOPIC_ACTION_REVIEW = "Henkelv2/Shanghai/Logistics/Costing/Action/Review_DN"
const TOPIC_UPDATE_ACTION = "Henkelv2/Shanghai/Logistics/External/Integration/Action/Update_Status"
const TOPIC_CREATE_ACTION = "Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Order"

const TOPIC_HOLD_ORDER = "Henkelv2/Shanghai/Logistics/Outbound/Action/Hold_Order"
const TOPIC_RELEASE_HOLD = "Henkelv2/Shanghai/Logistics/Outbound/Action/Release_Hold"

const BUSINESS_TYPES = {
  'SALES_ORDER': { label: 'Sales Shipment (DN)', color: 'bg-blue-50 text-blue-700', icon: Truck },
  'TRANSFER_OUT': { label: 'Inter-WH Transfer', color: 'bg-purple-50 text-purple-700', icon: Factory }
}

const STATUS_PILLS = ['ALL', 'NEW', 'RELEASED', 'PICKING', 'PACKED', 'SHIPPED']
const STATUS_PILL_LABELS = { ALL: 'All', NEW: 'Awaiting Approval', RELEASED: 'Released', PICKING: 'Picking', PACKED: 'Packed', SHIPPED: 'Shipped' }

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

const KPICard = ({ label, value, icon: Icon, colorClass }) => (
  <Card className="border-slate-200 shadow-sm bg-white">
    <CardContent className="p-3 flex justify-between items-start">
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
      </div>
      <div className={`h-7 w-7 rounded-md flex items-center justify-center bg-slate-50 ${colorClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
    </CardContent>
  </Card>
)

export default function OutboundPlanningOrdersTab() {
  const navigate = useNavigate()
  const { data, publish } = useGlobalUNS()

  const [filterInputs, setFilterInputs] = useState(INITIAL_FILTER_STATE)
  const [activeQuery, setActiveQuery] = useState(INITIAL_FILTER_STATE)

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewDetailsOrder, setViewDetailsOrder] = useState(null)
  const [actionOrder, setActionOrder] = useState(null)
  const [newOrder, setNewOrder] = useState(INITIAL_ORDER_STATE)

  const [rejectReason, setRejectReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(null)
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  const [holdReason, setHoldReason] = useState('')

  useEffect(() => {
    if (actionOrder) {
      setCurrentStatus(actionOrder.status)
    }
  }, [actionOrder])

  // --- DATA ---
  const orders = useMemo(() => {
    let costPacket = data.raw[TOPIC_COST_DB]
    if (costPacket?.topics && Array.isArray(costPacket.topics) && costPacket.topics.length > 0) {
      costPacket = costPacket.topics[0].value || costPacket.topics[0]
    }
    let rawCostDNs = Array.isArray(costPacket) ? costPacket : (costPacket?.items ?? [])
    if (!Array.isArray(rawCostDNs)) rawCostDNs = []

    const syncRaw = data.raw[TOPIC_SYNC_STATUS]
    let syncPacket = syncRaw
    if (syncRaw?.topics && Array.isArray(syncRaw.topics) && syncRaw.topics.length > 0) {
      syncPacket = syncRaw.topics[0].value || syncRaw.topics[0]
    }
    let syncRecords = Array.isArray(syncPacket) ? syncPacket : (syncPacket?.sync_records ?? syncPacket?.items ?? [])
    if (!Array.isArray(syncRecords)) syncRecords = []

    const syncDNs = syncRecords
      .filter(record => {
        const type = (record.type || '').toUpperCase()
        return type.includes('OUTBOUND') || type.includes('DN')
      })
      .map(record => OutboundOrderService.normalizeOrder(record, 'sync'))
      .filter(order => order !== null)

    const shipmentRaw = data.raw[TOPIC_SHIPMENT_LIST]
    let shipmentPacket = shipmentRaw
    if (shipmentRaw?.topics && Array.isArray(shipmentRaw.topics) && shipmentRaw.topics.length > 0) {
      shipmentPacket = shipmentRaw.topics[0].value || shipmentRaw.topics[0]
    }
    let rawShipments = Array.isArray(shipmentPacket) ? shipmentPacket : shipmentPacket?.items ?? shipmentPacket?.shipments ?? []
    if (!Array.isArray(rawShipments)) rawShipments = []

    const formattedShipments = rawShipments
      .map(s => OutboundOrderService.normalizeOrder(s, 'shipment'))
      .filter(order => order !== null)

    const costingOrders = rawCostDNs
      .map(dn => OutboundOrderService.normalizeOrder(dn, 'costing'))
      .filter(order => order !== null)

    return OutboundOrderService.mergeOrders(costingOrders, syncDNs, formattedShipments)
  }, [data.raw])

  // Keep selectedOrder in sync with live data
  useEffect(() => {
    if (!selectedOrder) return
    const updated = orders.find(o => o.id === selectedOrder.id)
    if (updated) setSelectedOrder(updated)
  }, [orders])

  // --- STATUS COUNTS ---
  const statusCounts = useMemo(() => {
    const counts = { ALL: orders.length }
    STATUS_PILLS.forEach(s => { if (s !== 'ALL') counts[s] = 0 })
    orders.forEach(o => {
      const s = (o.status || '').toUpperCase()
      if (counts[s] !== undefined) counts[s]++
      if (s === 'PENDING_APPROVAL' || s === 'PENDING' || s === 'AWAITING_APPROVAL') counts['NEW'] = (counts['NEW'] || 0) + 1
      if (s === 'READY_TO_SHIP') counts['PACKED'] = (counts['PACKED'] || 0) + 1
      if (s === 'DELIVERED') counts['SHIPPED'] = (counts['SHIPPED'] || 0) + 1
    })
    return counts
  }, [orders])

  // --- KPIs ---
  const kpiData = useMemo(() => {
    const inExecution = orders.filter(o => {
      const s = (o.status || '').toUpperCase()
      return ['PICKING', 'PICKED', 'PACKING', 'PACKED', 'STAGING', 'LOADING'].includes(s)
    }).length
    return {
      total: orders.length,
      awaitingApproval: statusCounts['NEW'] || 0,
      inExecution,
      shipped: statusCounts['SHIPPED'] || 0,
    }
  }, [orders, statusCounts])

  // --- FILTER ---
  const filteredOrders = useMemo(() => {
    let filtered = orders

    if (activeQuery.docId) {
      filtered = filtered.filter(o => o.id.toLowerCase().includes(activeQuery.docId.toLowerCase()))
    }
    if (activeQuery.customer) {
      filtered = filtered.filter(o =>
        (o.customer || o.destination || '').toLowerCase().includes(activeQuery.customer.toLowerCase())
      )
    }
    if (activeQuery.warehouse) {
      filtered = filtered.filter(o => (o.warehouse || o.source_warehouse || '') === activeQuery.warehouse)
    }
    if (activeQuery.operator) {
      filtered = filtered.filter(o =>
        (o.operator || o.created_by || '').toLowerCase().includes(activeQuery.operator.toLowerCase())
      )
    }
    if (activeQuery.type !== 'ALL') {
      filtered = OutboundOrderService.filterOrdersByType(filtered, activeQuery.type)
    }
    if (activeQuery.status !== 'ALL') {
      filtered = filtered.filter(o => {
        const status = (o.status || '').toUpperCase()
        const target = activeQuery.status.toUpperCase()
        if (target === 'NEW') return status === 'NEW' || status === 'PENDING_APPROVAL' || status === 'PENDING' || status === 'AWAITING_APPROVAL'
        if (target === 'PACKED') return status === 'PACKED' || status === 'READY_TO_SHIP'
        if (target === 'SHIPPED') return status === 'SHIPPED' || status === 'DELIVERED'
        return status === target
      })
    }

    return filtered
  }, [orders, activeQuery])

  // --- ACTIONS ---
  const handleQuery = () => setActiveQuery(filterInputs)

  const handleResetFilters = () => {
    setFilterInputs(INITIAL_FILTER_STATE)
    setActiveQuery(INITIAL_FILTER_STATE)
  }

  const handleStatusPill = (status) => {
    const newState = { ...INITIAL_FILTER_STATE, status }
    setFilterInputs(newState)
    setActiveQuery(newState)
  }

  const handleExport = () => {
    const headers = ['Order #', 'Type', 'Customer', 'Destination', 'Qty', 'Cost', 'Status']
    const rows = filteredOrders.map(order => [
      order.id, order.type, order.customer || '', order.destination || '',
      order.qty || 0, order.cost ? `¥${Number(order.cost).toFixed(2)}` : '-', order.status
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

  const handleApprove = () => {
    if (!actionOrder) return
    try {
      OutboundOrderValidator.validateApprovalAction(actionOrder.id, actionOrder.status)
      publish(TOPIC_ACTION_REVIEW, OutboundOrderService.buildApproveCommand(actionOrder.id))
      closeActionSheet()
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) { alert(error.message); return }
      throw error
    }
  }

  const handleReject = () => {
    if (!actionOrder) return
    try {
      publish(TOPIC_ACTION_REVIEW, OutboundOrderService.buildRejectCommand(actionOrder.id, rejectReason, actionOrder.status))
      closeActionSheet()
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) { alert(error.message); return }
      throw error
    }
  }

  const sendStatusUpdate = (newStatus) => {
    if (!actionOrder) return
    try {
      publish(TOPIC_UPDATE_ACTION, OutboundOrderService.buildStatusUpdateCommand(
        actionOrder.id, newStatus, currentStatus || actionOrder.status, carrier, trackingNumber
      ))
      setCurrentStatus(newStatus)
      setActionOrder({ ...actionOrder, status: newStatus })
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) { alert(error.message); return }
      throw error
    }
  }

  const handleReleaseToPicking = () => sendStatusUpdate('PICKING')
  const handleConfirmPacking = () => sendStatusUpdate('PACKING')
  const handleReadyToShip = () => sendStatusUpdate('READY_TO_SHIP')
  const handleConfirmShipment = () => { sendStatusUpdate('SHIPPED'); setCarrier(''); setTrackingNumber('') }

  const handleHoldOrder = () => {
    if (!actionOrder) return
    try {
      publish(TOPIC_HOLD_ORDER, OutboundOrderService.buildHoldCommand(actionOrder.id, holdReason, actionOrder.status))
      setCurrentStatus('ON_HOLD')
      setActionOrder({ ...actionOrder, status: 'ON_HOLD' })
      setHoldReason('')
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) { alert(error.message); return }
      throw error
    }
  }

  const handleReleaseHold = () => {
    if (!actionOrder) return
    try {
      publish(TOPIC_RELEASE_HOLD, OutboundOrderService.buildReleaseHoldCommand(actionOrder.id, actionOrder.status))
      setCurrentStatus('RELEASED')
      setActionOrder({ ...actionOrder, status: 'RELEASED' })
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) { alert(error.message); return }
      throw error
    }
  }

  const closeActionSheet = () => {
    setActionOrder(null); setShowRejectDialog(false); setRejectReason('')
    setCurrentStatus(null); setCarrier(''); setTrackingNumber(''); setHoldReason('')
  }

  const openActions = (order) => {
    setActionOrder(order); setViewDetailsOrder(null)
    setCarrier(order.carrier || ''); setTrackingNumber(order.trackingNumber || '')
  }

  const handleCreate = () => {
    try {
      const payload = OutboundOrderService.buildCreateCommand
        ? OutboundOrderService.buildCreateCommand(newOrder)
        : {
            type: newOrder.type, customer: newOrder.customer || newOrder.destination,
            destination: newOrder.destination, warehouse: newOrder.warehouse,
            operator: newOrder.operator, requested_date: newOrder.requestedDate,
            lines: newOrder.lines.filter(l => l.code && l.qty)
          }
      publish(TOPIC_CREATE_ACTION, payload)
      setIsCreateOpen(false)
      setNewOrder(INITIAL_ORDER_STATE)
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) { alert(error.message); return }
      throw error
    }
  }

  const addLine = () => setNewOrder(prev => ({ ...prev, lines: [...prev.lines, { code: '', qty: '100' }] }))

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

  const getStatusBadge = (status) => {
    const config = OutboundOrderValidator.getStatusBadgeConfig(status)
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const getProgressPercentage = (status) => OutboundOrderService.calculateProgressPercentage(status)

  // Progress steps for the selected order detail panel
  const progressSteps = useMemo(() => {
    if (!selectedOrder?.status) return []
    return OutboundOrderService.getProgressSteps(selectedOrder.status)
  }, [selectedOrder?.status])

  const lineItems = useMemo(() => {
    if (!selectedOrder) return []
    if (selectedOrder.lines?.length > 0) return selectedOrder.lines
    if (selectedOrder.items?.length > 0) {
      return selectedOrder.items.map(item => ({
        code: item.sku || item.code || 'UNKNOWN', qty: item.qty || 0,
        desc: item.desc || item.description || '', picked_qty: item.picked_qty || 0
      }))
    }
    return []
  }, [selectedOrder])

  return (
    <div className="flex gap-0 h-[calc(100vh-160px)] min-h-[500px]">

      {/* ═══════════ LEFT PANEL ═══════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">

          <UNSConnectionInfo topic={TOPIC_COST_DB} />

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Total Orders" value={kpiData.total} icon={ClipboardCheck} colorClass="text-slate-600" />
            <KPICard label="Awaiting Approval" value={kpiData.awaitingApproval} icon={AlertCircle} colorClass="text-amber-600" />
            <KPICard label="In Execution" value={kpiData.inExecution} icon={Package} colorClass="text-blue-600" />
            <KPICard label="Shipped" value={kpiData.shipped} icon={Truck} colorClass="text-green-600" />
          </div>

          {/* Filter Bar */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-1 min-w-[140px] flex-1">
                  <Label className="text-[10px] font-semibold text-slate-500 uppercase">Document #</Label>
                  <Input placeholder="e.g. DN-2026..." className="bg-white h-8 text-xs" value={filterInputs.docId}
                    onChange={e => setFilterInputs(prev => ({ ...prev, docId: e.target.value }))} />
                </div>
                <div className="space-y-1 min-w-[130px] flex-1">
                  <Label className="text-[10px] font-semibold text-slate-500 uppercase">Warehouse</Label>
                  <WarehouseSelect value={filterInputs.warehouse} onChange={v => setFilterInputs(prev => ({ ...prev, warehouse: v }))} />
                </div>
                <div className="space-y-1 min-w-[130px] flex-1">
                  <Label className="text-[10px] font-semibold text-slate-500 uppercase">Customer</Label>
                  <Input placeholder="Search..." className="bg-white h-8 text-xs" value={filterInputs.customer}
                    onChange={e => setFilterInputs(prev => ({ ...prev, customer: e.target.value }))} />
                </div>
                <div className="space-y-1 min-w-[150px] flex-1">
                  <Label className="text-[10px] font-semibold text-slate-500 uppercase">Business Type</Label>
                  <Select value={filterInputs.type} onValueChange={v => setFilterInputs(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger className="bg-white h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      {Object.entries(BUSINESS_TYPES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 shrink-0 pb-px">
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-700" onClick={handleResetFilters}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-4" onClick={handleQuery}>
                    <Search className="h-3 w-3 mr-1" /> Query
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Pills + Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_PILLS.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusPill(s)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    activeQuery.status === s
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {STATUS_PILL_LABELS[s]}
                  <span className="ml-1 opacity-70">({statusCounts[s] || 0})</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50" onClick={handleExport}>
                <FileDown className="h-3.5 w-3.5 mr-1.5" /> Export
              </Button>
              <Link to="/operations/outbound/order/new"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-bold h-8 px-4 py-2 bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] shadow-sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Order
              </Link>
            </div>
          </div>

          {/* Table */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                  <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase w-[40px]">#</TableHead>
                  <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Document</TableHead>
                  <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase text-center">Status</TableHead>
                  <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Type</TableHead>
                  <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Customer</TableHead>
                  <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase text-right">Qty</TableHead>
                  <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Progress</TableHead>
                  <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase text-right w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-40 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Filter className="h-8 w-8 text-slate-300" />
                        <p className="text-sm">No orders match your query.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order, index) => {
                    const bizStyle = BUSINESS_TYPES[order.type] || { label: order.type, color: 'bg-slate-100 text-slate-600' }
                    const Icon = bizStyle.icon || Truck
                    const isSelected = selectedOrder?.id === order.id
                    return (
                      <TableRow
                        key={order.id}
                        className={`cursor-pointer transition-colors border-b border-slate-100 ${
                          isSelected ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <TableCell className="text-[10px] text-slate-400 font-mono">{index + 1}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-blue-600">{order.id}</span>
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${bizStyle.color} flex items-center gap-1 w-fit`}>
                            <Icon className="h-3 w-3" />{bizStyle.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 font-medium max-w-[120px] truncate">{order.customer || order.destination}</TableCell>
                        <TableCell className="text-xs text-slate-600 text-right font-mono">{order.qty || 0}</TableCell>
                        <TableCell>
                          <div className="w-20">
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-[#b2ed1d] transition-all" style={{ width: `${getProgressPercentage(order.status)}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                            onClick={(e) => { e.stopPropagation(); openActions(order) }}>
                            Actions
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      {/* ═══════════ RIGHT PANEL: Order Detail ═══════════ */}
      {selectedOrder && (
        <div className="w-[440px] shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden ml-0">

          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-mono text-base font-bold text-slate-900">{selectedOrder.id}</h2>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const biz = BUSINESS_TYPES[selectedOrder.type]
                    if (!biz) return null
                    const BizIcon = biz.icon || Truck
                    return (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${biz.color} flex items-center gap-1`}>
                        <BizIcon className="h-3 w-3" />{biz.label}
                      </span>
                    )
                  })()}
                </div>
                {(selectedOrder.customer || selectedOrder.destination) && (
                  <p className="text-xs text-slate-500">{selectedOrder.customer || selectedOrder.destination}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={() => { setViewDetailsOrder(selectedOrder) }}>
                  Full View
                </Button>
                <button onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto">

            {/* Progress Stepper */}
            {progressSteps.length > 0 && (
              <div className="mx-5 mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Progress</h4>
                <div className="flex items-center space-x-1">
                  {progressSteps.map((step, i) => (
                    <div key={i} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all
                          ${step.status === 'completed' ? 'bg-[#b2ed1d] text-slate-900' : ''}
                          ${step.status === 'active' ? 'bg-[#b2ed1d] text-slate-900 ring-3 ring-[#b2ed1d]/20' : ''}
                          ${step.status === 'pending' ? 'bg-slate-100 text-slate-400' : ''}
                        `}>
                          {step.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                        </div>
                        <span className={`text-[8px] mt-1 text-center font-medium leading-tight ${step.status === 'active' ? 'text-[#65a30d]' : 'text-slate-400'}`}>
                          {step.label}
                        </span>
                      </div>
                      {i < progressSteps.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-0.5 ${step.status === 'completed' ? 'bg-[#b2ed1d]' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Info */}
            <div className="mx-5 mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Warehouse</span>
                <span className="font-medium text-slate-800">{selectedOrder.warehouse || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Operator</span>
                <span className="font-medium text-slate-800">{selectedOrder.operator || selectedOrder.submitted_by || 'System'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Requested Date</span>
                <span className="font-medium text-slate-800">{selectedOrder.requestedDate || selectedOrder.requested_date || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total Qty</span>
                <span className="font-mono font-bold text-slate-800">{selectedOrder.qty || 0}</span>
              </div>
              {selectedOrder.cost && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total Cost</span>
                  <span className="font-mono font-bold text-[#65a30d]">¥{Number(selectedOrder.cost).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Carrier Info */}
            {(selectedOrder.carrier || selectedOrder.tracking_number || selectedOrder.trackingNumber) && (
              <div className="mx-5 mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Truck className="h-3 w-3" /> Carrier
                </h4>
                <div className="space-y-1.5">
                  {selectedOrder.carrier && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Carrier</span>
                      <span className="font-medium text-slate-800">{selectedOrder.carrier}</span>
                    </div>
                  )}
                  {(selectedOrder.tracking_number || selectedOrder.trackingNumber) && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Tracking</span>
                      <span className="font-mono text-slate-800">{selectedOrder.tracking_number || selectedOrder.trackingNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="mx-5 mt-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Package className="h-3 w-3" /> Line Items ({lineItems.length})
              </h4>
              {lineItems.length > 0 ? (
                <div className="space-y-2">
                  {lineItems.map((line, i) => {
                    const pickedQty = line.picked_qty || 0
                    const totalQty = line.qty || 0
                    const pickPct = totalQty > 0 ? Math.min(100, Math.round((pickedQty / totalQty) * 100)) : 0
                    return (
                      <div key={i} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-bold text-slate-900 truncate">{line.code || line.sku || `Line ${i + 1}`}</p>
                            {(line.desc || line.description) && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{line.desc || line.description}</p>
                            )}
                          </div>
                          <span className="font-mono text-xs text-slate-600">{totalQty}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Picked: <span className="font-mono font-bold text-slate-700">{pickedQty}</span> / {totalQty}</span>
                            <span className="font-mono">{pickPct}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div className="bg-[#b2ed1d] h-1.5 rounded-full transition-all" style={{ width: `${pickPct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                  No line items
                </div>
              )}
            </div>
          </div>

          {/* Footer: Context-Aware Actions */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 space-y-2">
            {(() => {
              const status = (selectedOrder.status || '').toUpperCase()

              if (status === 'NEW' || OutboundOrderValidator.isPendingApproval(selectedOrder.status)) {
                return (
                  <>
                    <Button className="w-full h-9 text-xs gap-2 bg-[#b2ed1d] text-slate-900 font-bold hover:bg-[#8cd121]"
                      onClick={() => openActions(selectedOrder)}>
                      <CheckCircle className="h-3.5 w-3.5" /> Approve & Bill
                    </Button>
                    <Button variant="outline" className="w-full h-9 text-xs gap-2 border-slate-200"
                      onClick={() => openActions(selectedOrder)}>
                      Dispute / Reject
                    </Button>
                  </>
                )
              }

              if (status === 'ON_HOLD') {
                return (
                  <Button className="w-full h-9 text-xs gap-2 bg-[#b2ed1d] text-slate-900 font-bold hover:bg-[#8cd121]"
                    onClick={() => openActions(selectedOrder)}>
                    <Play className="h-3.5 w-3.5" /> Release Hold
                  </Button>
                )
              }

              if (status === 'RELEASED' || status === 'APPROVED') {
                return (
                  <Button variant="outline" className="w-full h-9 text-xs gap-2 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => openActions(selectedOrder)}>
                    <Pause className="h-3.5 w-3.5" /> Put on Hold
                  </Button>
                )
              }

              if (['PICKING', 'IN_PROGRESS', 'ALLOCATED', 'ALLOCATING'].includes(status)) {
                return (
                  <Button className="w-full h-9 text-xs gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    onClick={() => navigate('/operations/outbound/execution')}>
                    Open Execution <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )
              }

              if (['PACKED', 'READY_TO_SHIP', 'PACKING', 'PICKED'].includes(status)) {
                return (
                  <Button className="w-full h-9 text-xs gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    onClick={() => navigate('/operations/outbound/execution?tab=dispatch')}>
                    Open Dispatch <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )
              }

              if (status === 'SHIPPED' || status === 'DELIVERED') {
                return (
                  <div className="text-center py-2 text-sm text-green-600 bg-green-50 rounded border border-green-200 flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" /> Order completed
                  </div>
                )
              }

              return null
            })()}
          </div>
        </div>
      )}

      {/* --- VIEW DETAILS DIALOG --- */}
      <OutboundOrderDetail
        order={viewDetailsOrder}
        open={!!viewDetailsOrder}
        onClose={() => setViewDetailsOrder(null)}
        onAction={(order) => { openActions(order); setViewDetailsOrder(null) }}
      />

      {/* --- ACTIONS SHEET (for complex workflows) --- */}
      <Sheet open={!!actionOrder} onOpenChange={(open) => !open && closeActionSheet()}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          {actionOrder && (
            <>
              <SheetHeader className="mb-6 border-b border-slate-100 pb-4">
                <SheetTitle>Workflow Actions: {actionOrder.id}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                {!OutboundOrderValidator.isPendingApproval(actionOrder.status) && (
                  <div className="pt-4">
                    <Card className="border border-slate-200 shadow-sm bg-slate-50/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          Workflow Actions
                          <span className="text-[10px] font-normal text-slate-400 bg-white border px-1.5 py-0.5 rounded-full">Live</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(() => {
                          const status = (currentStatus || actionOrder.status || '').toUpperCase().trim()
                          const orderType = actionOrder.type || 'SALES_ORDER'
                          const isTrading = orderType === 'SALES_ORDER'

                          if (status === 'ON_HOLD') return (
                            <div className="space-y-3">
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700 font-medium flex items-center gap-2"><Pause className="h-4 w-4" /> Order is on hold</p>
                                {actionOrder.hold_reason && <p className="text-xs text-red-600 mt-1">Reason: {actionOrder.hold_reason}</p>}
                              </div>
                              <Button onClick={handleReleaseHold} className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                                <Play className="h-4 w-4" /> Release Hold
                              </Button>
                            </div>
                          )
                          if (status === 'RELEASED' || status === 'APPROVED') return (
                            <div className="space-y-4">
                              <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-md p-3">Shipment and picking tasks are created automatically by the backend after release.</p>
                              <div className="border-t pt-3 space-y-2">
                                <Input value={holdReason} onChange={(e) => setHoldReason(e.target.value)} placeholder="Reason for hold (optional)" className="h-8 text-sm" />
                                <Button onClick={handleHoldOrder} variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 h-9"><Pause className="h-4 w-4 mr-2" /> Put on Hold</Button>
                              </div>
                            </div>
                          )
                          if (status === 'ALLOCATING') return (
                            <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg text-center">
                              <div className="animate-pulse flex items-center justify-center gap-2 text-cyan-700"><Loader2 className="h-5 w-5 animate-spin" /><span className="font-medium">Allocating inventory...</span></div>
                            </div>
                          )
                          if (status === 'ALLOCATED' || status === 'READY_TO_PICK') return (
                            <Button onClick={handleReleaseToPicking} className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Create Pick Tasks</Button>
                          )
                          if (status === 'PICKING') return (
                            <Button onClick={handleConfirmPacking} className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2"><Box className="h-4 w-4" /> {isTrading ? 'Confirm Packing' : 'Confirm Delivery'}</Button>
                          )
                          if (status === 'PACKING' || status === 'PICKED') return (
                            <Button onClick={handleReadyToShip} className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Ready to Ship</Button>
                          )
                          if (status === 'READY_TO_SHIP' || status === 'READY TO SHIP' || status === 'PACKED') return (
                            <div className="space-y-3">
                              <div className="space-y-2"><Label className="text-xs font-semibold text-slate-700">Carrier</Label><Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. DHL" className="h-8 text-sm" /></div>
                              <div className="space-y-2"><Label className="text-xs font-semibold text-slate-700">Tracking #</Label><Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking ID" className="h-8 text-sm" /></div>
                              <Button onClick={handleConfirmShipment} className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2"><Truck className="h-4 w-4" /> Confirm Shipment</Button>
                            </div>
                          )
                          if (status === 'SHIPPED' || status === 'DELIVERED') return (
                            <div className="text-center py-3 text-sm text-green-600 bg-green-50 rounded border border-green-200 flex items-center justify-center gap-2"><CheckCircle className="h-4 w-4" /> Order completed</div>
                          )
                          return <div className="text-center py-2 text-sm text-slate-500 bg-white rounded border border-slate-100">No actions available for status: {status}</div>
                        })()}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {showRejectDialog && OutboundOrderValidator.isPendingApproval(actionOrder.status) && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2 text-red-700 font-semibold"><AlertCircle size={16} />Reject Reason</div>
                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full h-24 rounded-md border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Enter reason for rejection..." />
                  </div>
                )}
              </div>

              <SheetFooter className="mt-6 flex-col sm:flex-col gap-3">
                {OutboundOrderValidator.isPendingApproval(actionOrder.status) ? (
                  !showRejectDialog ? (
                    <>
                      <Button onClick={handleApprove} className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold h-12 shadow-sm px-4 inline-flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" /> Approve & Bill
                      </Button>
                      <Button onClick={() => setShowRejectDialog(true)} variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50">Dispute / Reject</Button>
                    </>
                  ) : (
                    <div className="flex gap-3 w-full">
                      <Button onClick={() => setShowRejectDialog(false)} variant="outline" className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button>
                      <Button onClick={handleReject} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Confirm Reject</Button>
                    </div>
                  )
                ) : null}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* --- CREATE MODAL --- */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Outbound Order</DialogTitle>
            <DialogDescription>{newOrder.type === 'SALES_ORDER' ? "Create Sales Shipment (DN)" : "Create Inter-Warehouse Transfer"}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Business Type</Label>
                <Select value={newOrder.type} onValueChange={v => setNewOrder(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(BUSINESS_TYPES).map(([key, val]) => (<SelectItem key={key} value={key}>{val.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Warehouse</Label><WarehouseSelect value={newOrder.warehouse} onChange={v => setNewOrder(prev => ({ ...prev, warehouse: v }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Requested Ship Date</Label><Input type="date" value={newOrder.requestedDate} onChange={e => setNewOrder(prev => ({ ...prev, requestedDate: e.target.value }))} /></div>
            </div>
            <div className="bg-slate-50 p-3 rounded border border-slate-100">
              {newOrder.type === 'SALES_ORDER' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="text-xs font-bold text-blue-700">Customer</Label><CustomerSelect value={newOrder.customer} onChange={(v) => setNewOrder(prev => ({ ...prev, customer: v }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Operator</Label><Input value={newOrder.operator} onChange={e => setNewOrder(prev => ({ ...prev, operator: e.target.value }))} /></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label className="text-xs font-bold text-purple-700">Destination</Label><Input placeholder="Destination Warehouse..." value={newOrder.destination} onChange={e => setNewOrder(prev => ({ ...prev, destination: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Operator</Label><Input value={newOrder.operator} onChange={e => setNewOrder(prev => ({ ...prev, operator: e.target.value }))} /></div>
                </div>
              )}
            </div>
            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-bold">Line Items</Label>
                <Button size="sm" variant="ghost" onClick={addLine} className="h-6 text-xs"><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
              </div>
              {newOrder.lines.map((line, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="flex-1"><MaterialSelect value={line.code} onChange={(val) => updateLine(idx, 'code', val)} /></div>
                  <div className="w-24"><Input type="number" placeholder="Qty" className="h-8 text-xs bg-white" value={line.qty} onChange={e => updateLine(idx, 'qty', e.target.value)} /></div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => removeLine(idx)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-[#b2ed1d] text-slate-900 font-bold hover:bg-[#8cd121]">Confirm Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
