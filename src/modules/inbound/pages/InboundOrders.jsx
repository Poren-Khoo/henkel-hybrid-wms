import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Plus, Search, RotateCcw, FileDown, Filter, User, Trash2, Factory, Truck } from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { MaterialSelect } from '../../../components/selectors/Material'
import { WarehouseSelect } from '../../../components/selectors/WarehouseSelect'
import { InboundOrderValidator, InboundOrderValidationError } from '../../../domain/inbound/InboundOrderValidator'
import { InboundOrderService } from '../../../domain/inbound/InboundOrderService'

// TOPICS
const TOPIC_PLAN = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inbound_Plan"
const TOPIC_CREATE_ACTION = "Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Create_Inbound_Plan"

// --- 1. ENTERPRISE CONSTANTS (Unified Inbound) ---
const BUSINESS_TYPES = {
  // Commercial / External
  'PO': { label: 'Purchase Receipt', color: 'bg-blue-50 text-blue-700', icon: Truck },
  'ASN': { label: 'Supplier Delivery', color: 'bg-purple-50 text-purple-700', icon: Truck },
  'RMA': { label: 'Sales Return', color: 'bg-orange-50 text-orange-700', icon: RotateCcw },
  
  // Manufacturing / Internal (NEW)
  'PROD_FG': { label: 'Finished Goods Receipt', color: 'bg-emerald-50 text-emerald-700', icon: Factory },
  'PROD_SFG': { label: 'Semi-Finished Receipt', color: 'bg-teal-50 text-teal-700', icon: Factory },
  'SUB_RET': { label: 'Subcontract Return', color: 'bg-indigo-50 text-indigo-700', icon: Truck },
  
  // Logistics
  'TRANSFER': { label: 'Inter-WH Transfer', color: 'bg-slate-100 text-slate-700', icon: Truck }
}

const INITIAL_FILTER_STATE = {
  docId: '',
  warehouse: '',
  supplier: '',
  operator: '',
  status: 'ALL',
  type: 'ALL',
}

const INITIAL_ORDER_STATE = {
  type: 'PO',
  supplier: '',
  // New Fields for Manufacturing
  productionOrder: '', 
  lineId: '',
  
  warehouse: 'WH01',
  operator: 'Current User', 
  eta: new Date().toLocaleDateString('en-CA'), 
  lines: [{ code: '', qty: '1000' }]
}

export default function InboundOrders() {
  const { data, publish } = useGlobalUNS()
  
  // --- FILTER STATE ---
  const [filterInputs, setFilterInputs] = useState(INITIAL_FILTER_STATE)
  const [activeQuery, setActiveQuery] = useState(INITIAL_FILTER_STATE)

  // --- MODAL & FORM STATE ---
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewLinesOrder, setViewLinesOrder] = useState(null)
  const [newOrder, setNewOrder] = useState(INITIAL_ORDER_STATE)

  // --- DATA HANDLING ---
  const orders = useMemo(() => {
    const packet = data?.raw?.[TOPIC_PLAN]
    if (!packet || typeof packet !== 'object') return []
    
    const rawList = Array.isArray(packet.asns) ? packet.asns : 
                    Array.isArray(packet.items) ? packet.items : 
                    Array.isArray(packet.orders) ? packet.orders : []
    
    return rawList.map(o => ({
      ...o,
      id: String(o.id || ''),
      operator: String(o.operator || 'Admin'),
      warehouse: String(o.warehouse || 'WH01'),
      supplier: String(o.supplier || ''),
      // Map Line ID if supplier is missing (for Prod Orders)
      source: o.supplier || o.lineId || 'Internal', 
      status: String(o.status || 'PLANNED'),
      businessType: o.businessType || BUSINESS_TYPES[o.type]?.label || o.type,
      // Explicitly preserve lines array
      lines: o.lines || (o.sku ? [{ code: o.sku, desc: o.desc, qty: o.qty_expected || o.qty || 0 }] : [])
    }))
  }, [data.raw])

  // --- FILTER LOGIC ---
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchType = activeQuery.type === 'ALL' || o.type === activeQuery.type
      const matchStatus = activeQuery.status === 'ALL' || o.status === activeQuery.status
      
      const matchId = !activeQuery.docId || o.id.toLowerCase().includes(activeQuery.docId.toLowerCase())
      // Search both Supplier OR Line ID
      const matchSource = !activeQuery.supplier || o.source.toLowerCase().includes(activeQuery.supplier.toLowerCase())
      const matchOp = !activeQuery.operator || o.operator.toLowerCase().includes(activeQuery.operator.toLowerCase())
      const matchWh = !activeQuery.warehouse || o.warehouse === activeQuery.warehouse

      return matchType && matchId && matchSource && matchStatus && matchOp && matchWh
    })
  }, [orders, activeQuery])



  // --- ACTIONS ---
  
  const handleQuery = () => setActiveQuery(filterInputs)

  const handleResetFilters = () => {
    setFilterInputs(INITIAL_FILTER_STATE)
    setActiveQuery(INITIAL_FILTER_STATE)
  }

  const handleQuickFilter = (type) => {
    const newState = { ...INITIAL_FILTER_STATE, type }
    setFilterInputs(newState)
    setActiveQuery(newState)
  }

  const handleCreate = () => {
    try {
      // Service handles validation + command building (DDD pattern)
      const payload = InboundOrderService.buildCreateCommand(newOrder)
      
      // Publish to MQTT
      publish(TOPIC_CREATE_ACTION, payload)
      
      // Reset form
      setIsCreateOpen(false)
      setNewOrder(INITIAL_ORDER_STATE)
    } catch (error) {
      if (error instanceof InboundOrderValidationError) {
        alert(error.message)
        return
      }
      // Re-throw unexpected errors
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

  const handleDeleteOrder = (id) => {
    if(!window.confirm(`Delete order ${id}?`)) return
    console.log("Delete requested for:", id)
  }

  const getStatusBadge = (status) => {
      const s = status.toUpperCase()
      if (s === 'RECEIVED') return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Received</Badge>
      if (s === 'ARRIVED') return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Arrived</Badge>
      if (s === 'PLANNED') return <Badge variant="outline" className="text-slate-500 bg-slate-50">Planned</Badge>
      return <Badge variant="outline">{status}</Badge>
  }

  return (
    <PageContainer title="Inbound Orders" subtitle="Manage POs, ASNs, and Returns (Control Tower)">
      <div className="space-y-4">
        <UNSConnectionInfo topic={TOPIC_PLAN} />

        {/* === SECTION 1: FILTER MATRIX (FULL RESTORED) === */}
        <Card className="border-slate-200 shadow-sm bg-slate-50/50">
            <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* 1. Document Number */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-500">Document #</Label>
                        <Input 
                            placeholder="e.g. PO-2026..." 
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
                    {/* 3. Source (Polymorphic) */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-500">Source (Partner/Line)</Label>
                        <Input 
                            placeholder="Search Supplier or Line..." 
                            className="bg-white h-8 text-sm"
                            value={filterInputs.supplier}
                            onChange={e => setFilterInputs(prev => ({...prev, supplier: e.target.value}))}
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
                                <SelectItem value="PLANNED">Planned</SelectItem>
                                <SelectItem value="ARRIVED">Arrived</SelectItem>
                                <SelectItem value="RECEIVED">Received</SelectItem>
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

        {/* === SECTION 2: TABLE & TOOLBAR === */}
        <div className="flex justify-between items-center pt-2">
             <div className="flex gap-2">
                <Button variant={activeQuery.type === 'PO' ? 'default' : 'outline'} size="sm" onClick={() => handleQuickFilter('PO')} className="rounded-full h-7 text-xs">Purchase</Button>
                <Button variant={activeQuery.type === 'PROD_FG' ? 'default' : 'outline'} size="sm" onClick={() => handleQuickFilter('PROD_FG')} className="rounded-full h-7 text-xs">Production FG</Button>
                <Button variant={activeQuery.type === 'RMA' ? 'default' : 'outline'} size="sm" onClick={() => handleQuickFilter('RMA')} className="rounded-full h-7 text-xs">Returns</Button>
             </div>
             
             <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-9 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
                    <FileDown className="h-4 w-4 mr-2" /> Export
                </Button>
                <Button className="bg-[#a3e635] text-slate-900 font-bold hover:bg-[#8cd121] shadow-sm h-9 text-xs" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Create Inbound Plan
                </Button>
             </div>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                        <TableHead className="h-10 text-xs font-bold text-slate-700 w-[60px]">Seq</TableHead>
                        <TableHead className="h-10 text-xs font-bold text-slate-700">Document #</TableHead>
                        <TableHead className="h-10 text-xs font-bold text-slate-700 text-center">Status</TableHead>
                        <TableHead className="h-10 text-xs font-bold text-slate-700">Business Type</TableHead>
                        <TableHead className="h-10 text-xs font-bold text-slate-700">Warehouse</TableHead>
                        <TableHead className="h-10 text-xs font-bold text-slate-700">Source (Partner/Line)</TableHead>
                        <TableHead className="h-10 text-xs font-bold text-slate-700">Operator</TableHead>
                        <TableHead className="h-10 text-xs font-bold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="h-48 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <Filter className="h-8 w-8 text-slate-300" />
                                    <p>No orders match your query.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        filtered.map((order, index) => {
                            const bizStyle = BUSINESS_TYPES[order.type] || { label: order.type, color: 'bg-slate-100 text-slate-600' }
                            const Icon = bizStyle.icon || Truck
                            return (
                                <TableRow key={order.id} className="hover:bg-blue-50/50 transition-colors border-b border-slate-100">
                                    <TableCell className="text-xs text-slate-500">{index + 1}</TableCell>
                                    <TableCell 
                                        className="font-mono text-xs font-bold text-blue-600 cursor-pointer hover:underline"
                                        onClick={() => setViewLinesOrder(order)}
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
                                    <TableCell className="text-xs text-slate-600 font-medium">{order.warehouse}</TableCell>
                                    <TableCell className="text-xs text-slate-900 font-medium">{order.source}</TableCell>
                                    <TableCell className="text-xs text-slate-600">{order.operator}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setViewLinesOrder(order)}>View</Button>
                                            <Button size="sm" variant="ghost" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteOrder(order.id)}>Delete</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </Card>

        {/* --- CREATE MODAL (POLYMORPHIC) --- */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Create Inbound Plan</DialogTitle>
                    <DialogDescription>
                    {InboundOrderValidator.isManufacturing(newOrder.type) ? "Register Internal Production Output" : "Register External Supplier Document"}
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
                            <Label className="text-xs">Target Warehouse</Label>
                            <WarehouseSelect value={newOrder.warehouse} onChange={v => setNewOrder(prev => ({...prev, warehouse: v}))} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">ETA / Prod Date</Label>
                            <Input type="date" value={newOrder.eta} onChange={e => setNewOrder(prev => ({...prev, eta: e.target.value}))} />
                        </div>
                    </div>

                    {/* Row 2: Polymorphic Fields (Changes based on Type) */}
                    <div className="bg-slate-50 p-3 rounded border border-slate-100">
                    {InboundOrderValidator.isManufacturing(newOrder.type) ? (
                            // MANUFACTURING VIEW
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-emerald-700">Production Order # (工单)</Label>
                                    <Input 
                                        placeholder="e.g. MO-2026-001" 
                                        value={newOrder.productionOrder}
                                        onChange={e => setNewOrder(prev => ({...prev, productionOrder: e.target.value}))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-emerald-700">Production Line (产线)</Label>
                                    <Select value={newOrder.lineId} onValueChange={v => setNewOrder(prev => ({...prev, lineId: v}))}>
                                        <SelectTrigger><SelectValue placeholder="Select Line" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LINE-01">Filling Line 01</SelectItem>
                                            <SelectItem value="LINE-02">Mixing Line 02</SelectItem>
                                            <SelectItem value="LINE-03">Packaging Line 03</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            // COMMERCIAL VIEW
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-blue-700">Supplier / Customer</Label>
                                    <Input 
                                        placeholder="Search Partner..." 
                                        value={newOrder.supplier}
                                        onChange={e => setNewOrder(prev => ({...prev, supplier: e.target.value}))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Operator</Label>
                                    <Input value={newOrder.operator} onChange={e => setNewOrder(prev => ({...prev, operator: e.target.value}))} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Row 3: Lines Area (Shared) */}
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

        {/* View Lines Modal (Existing) */}
        <Dialog open={!!viewLinesOrder} onOpenChange={() => setViewLinesOrder(null)}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="font-mono">{viewLinesOrder?.id}</DialogTitle>
                    <DialogDescription>
                        {viewLinesOrder?.source} • {viewLinesOrder?.businessType}
                    </DialogDescription>
                </DialogHeader>
                {viewLinesOrder?.lines && viewLinesOrder.lines.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Material</TableHead>
                                <TableHead className="text-right">Qty Expected</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {viewLinesOrder.lines.map((line, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-bold text-slate-700">{line.sku || line.code || 'Unknown'}</TableCell>
                                    <TableCell className="text-right font-mono">{line.qty || line.qty_expected || 0}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="py-8 text-center text-slate-500">
                        <p className="text-sm">No line items found for this order.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}