import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Plus, Search, RotateCcw, FileDown, Filter, User, Trash2, Factory, Truck, X, Clock, ArrowRight, Package } from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { MaterialSelect } from '../../../components/selectors/Material'
import { WarehouseSelect } from '../../../components/selectors/WarehouseSelect'
import { WorkerSelect } from '../../../components/selectors/WorkerSelect'
import { InboundOrderValidator, InboundOrderValidationError } from '../../../domain/inbound/InboundOrderValidator'
import { InboundOrderService } from '../../../domain/inbound/InboundOrderService'


// TOPICS
const TOPIC_PLAN = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inbound_Plan"
const TOPIC_CREATE_ACTION = "Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Create_Inbound_Plan"
const TOPIC_ACTION_RECEIPT = "Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Post_Goods_Receipt"
const TOPIC_PARTNERS = "Henkelv2/Shanghai/Logistics/MasterData/State/BusinessPartners"
const TOPIC_PLATFORMS = "Henkelv2/Shanghai/Logistics/MasterData/State/Platforms"
const TOPIC_VEHICLES = "Henkelv2/Shanghai/Logistics/MasterData/State/Vehicles"

const BUSINESS_TYPES = {
  'PO': { label: 'Purchase Receipt', color: 'bg-blue-50 text-blue-700', icon: Truck },
  'ASN': { label: 'Supplier Delivery', color: 'bg-purple-50 text-purple-700', icon: Truck },
  'RMA': { label: 'Sales Return', color: 'bg-orange-50 text-orange-700', icon: RotateCcw },
  // [PAUSED - 内仓 scope] manufacturing inbound types
  // 'PROD_FG': { label: 'Finished Goods Receipt', color: 'bg-emerald-50 text-emerald-700', icon: Factory },
  // 'PROD_SFG': { label: 'Semi-Finished Receipt', color: 'bg-teal-50 text-teal-700', icon: Factory },
  // 'SUB_RET': { label: 'Subcontract Return', color: 'bg-indigo-50 text-indigo-700', icon: Truck },
  'TRANSFER': { label: 'Inter-WH Transfer', color: 'bg-slate-100 text-slate-700', icon: Truck }
}

const STATUS_PILLS = ['ALL', 'PLANNED', 'RECEIVING', 'QC', 'COMPLETED']

const STATUS_BADGE_MAP = {
  'PLANNED':    { label: 'Planned',    className: 'bg-slate-50 text-slate-600 border-slate-200' },
  'REGISTERED': { label: 'Registered', className: 'bg-slate-50 text-slate-600 border-slate-200' },
  'ARRIVED':    { label: 'Arrived',    className: 'bg-blue-100 text-blue-700 border-blue-200' },
  'RECEIVING':  { label: 'Receiving',  className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'QC':         { label: 'QC',         className: 'bg-purple-100 text-purple-700 border-purple-200' },
  'PUTAWAY':    { label: 'Putaway',    className: 'bg-green-100 text-green-700 border-green-200' },
  'RECEIVED':   { label: 'Received',   className: 'bg-emerald-600 text-white border-emerald-600' },
  'COMPLETED':  { label: 'Completed',  className: 'bg-emerald-600 text-white border-emerald-600' },
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
  request_id: crypto.randomUUID(),
  type: 'PO',
  supplier: '',
  platform: '',
  vehicleLicense: '',
  productionOrder: '',
  lineId: '',
  warehouse: 'WH01',
  operator: '',
  eta: new Date().toLocaleDateString('en-CA'),
  platform: '',
  vehicleLicense: '',
  lines: [{ code: '', qty: '1000', lot: '', expiry: '' }]
}

function getStatusBadge(status) {
  const s = (status || '').toUpperCase()
  const cfg = STATUS_BADGE_MAP[s]
  if (cfg) return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
  return <Badge variant="outline">{status}</Badge>
}

function getSourceBadge(order) {
  const isSAP = order.source_system === 'SAP' || order.id?.startsWith('PO-') || order.id?.startsWith('ASN-')
  return isSAP
    ? <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0 h-4 font-semibold">SAP</Badge>
    : <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-slate-500 border-slate-300">Manual</Badge>
}

function LotReceivingModal({ order, line, onClose, onSubmit }) {
  const [form, setForm] = useState({
    batch: '',
    mfgDate: new Date().toLocaleDateString('en-CA'),
    expiry: '',
    qty: line.qty_expected || line.qty || 0,
    containerId: '',
    stagingLocation: 'RCV-01',
    receiver: '',
    outcome: 'ACCEPT_QUARANTINE'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = () => {
    if (isSubmitting) return
    if (!form.batch.trim()) { alert('Batch / Lot number is required'); return }
    if (!form.expiry) { alert('Expiry date is required'); return }
    setIsSubmitting(true)
    onSubmit(form)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            扫码收货 — {line.code}
          </DialogTitle>
          <p className="text-xs text-slate-500">
            {order.id} · Expected: {line.qty_expected || line.qty} · Received so far: {line.received_qty || 0}
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Lot / Batch No. *</Label>
              <Input
                placeholder="e.g. LOT-2026-001"
                className="h-8 text-xs"
                value={form.batch}
                onChange={e => setForm(p => ({ ...p, batch: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expiry Date *</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={form.expiry}
                onChange={e => setForm(p => ({ ...p, expiry: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Mfg Date</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={form.mfgDate}
                onChange={e => setForm(p => ({ ...p, mfgDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Actual Qty *</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                value={form.qty}
                onChange={e => setForm(p => ({ ...p, qty: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Pallet ID / LPN</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Scan or generate"
                className="h-8 text-xs"
                value={form.containerId}
                onChange={e => setForm(p => ({ ...p, containerId: e.target.value }))}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs shrink-0"
                onClick={() => setForm(p => ({ ...p, containerId: 'PLT-' + Math.floor(Math.random() * 100000) }))}
              >
                Gen
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Staging Location</Label>
              <select
                className="w-full h-8 text-xs border border-slate-200 rounded-md px-2 bg-white"
                value={form.stagingLocation}
                onChange={e => setForm(p => ({ ...p, stagingLocation: e.target.value }))}
              >
                <option value="RCV-01">RCV-01</option>
                <option value="RCV-02">RCV-02</option>
                <option value="DOCK-IN-01">DOCK-IN-01</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Receiver</Label>
              <Input
                placeholder="Your name"
                className="h-8 text-xs"
                value={form.receiver}
                onChange={e => setForm(p => ({ ...p, receiver: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <Label className="text-xs font-bold">Outcome</Label>
            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => setForm(p => ({ ...p, outcome: 'ACCEPT_QUARANTINE' }))}
                className={`cursor-pointer p-2 rounded border text-xs text-center transition-all ${form.outcome === 'ACCEPT_QUARANTINE' ? 'bg-[#b2ed1d]/20 border-[#b2ed1d] font-bold' : 'border-slate-200'}`}
              >
                Accept to Quarantine
              </div>
              <div
                onClick={() => setForm(p => ({ ...p, outcome: 'REJECT' }))}
                className={`cursor-pointer p-2 rounded border text-xs text-center transition-all ${form.outcome === 'REJECT' ? 'bg-red-50 border-red-300 font-bold text-red-700' : 'border-slate-200'}`}
              >
                Refuse Delivery
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={isSubmitting}
            className="bg-[#b2ed1d] text-slate-900 font-bold hover:bg-[#8cd121]"
            onClick={handleConfirm}
          >
            {isSubmitting ? 'Posting...' : 'Confirm Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function InboundOrders() {
  const navigate = useNavigate()
  const { data, publish } = useGlobalUNS()

  // --- STATE ---
  const isCreatingRef = useRef(false)
  const [filterInputs, setFilterInputs] = useState(INITIAL_FILTER_STATE)
  const [activeQuery, setActiveQuery] = useState(INITIAL_FILTER_STATE)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newOrder, setNewOrder] = useState(INITIAL_ORDER_STATE)
  const [lotModal, setLotModal] = useState(null) // null when closed; { order, line, lineIndex } when open

  // --- DATA ---
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
      source: o.supplier || o.lineId || 'Internal',
      status: String(o.status || 'PLANNED'),
      businessType: o.businessType || BUSINESS_TYPES[o.type]?.label || o.type,
      vehicleLicense: o.vehicleLicense || o.vehicle_license || '',
      vehicleArrivalTime: o.vehicleArrivalTime || o.vehicle_arrival_time || '',
      lines: o.lines || (o.sku ? [{ code: o.sku, desc: o.desc, qty: o.qty_expected || o.qty || 0 }] : [])
    }))
  }, [data.raw])

  // Keep selectedOrder in sync with live MQTT data so the detail panel
  // (progress bars, status badges, etc.) updates without closing/reopening.
  useEffect(() => {
    if (!selectedOrder) return
    const updated = orders.find(o => o.id === selectedOrder.id)
    if (updated) setSelectedOrder(updated)
  }, [orders])

  const suppliers = useMemo(() => {
    const raw = data?.raw?.[TOPIC_PARTNERS]
    const list = raw?.topics?.[0]?.value || raw || []
    return Array.isArray(list) ? list.filter(p => p.roles?.includes('Supplier')) : []
  }, [data.raw])

  const platforms = useMemo(() => {
    const raw = data?.raw?.[TOPIC_PLATFORMS]
    const list = raw?.topics?.[0]?.value || raw || []
    return Array.isArray(list) ? list : []
  }, [data.raw])

  const vehicles = useMemo(() => {
    const raw = data?.raw?.[TOPIC_VEHICLES]
    const list = raw?.topics?.[0]?.value || raw || []
    return Array.isArray(list) ? list : []
  }, [data.raw])

  // --- STATUS COUNTS ---
  const statusCounts = useMemo(() => {
    const counts = { ALL: orders.length }
    STATUS_PILLS.forEach(s => { if (s !== 'ALL') counts[s] = 0 })
    orders.forEach(o => {
      const s = (o.status || '').toUpperCase()
      if (counts[s] !== undefined) counts[s]++
      if (s === 'RECEIVED') counts['COMPLETED'] = (counts['COMPLETED'] || 0) + 1
    })
    return counts
  }, [orders])

  // --- FILTER ---
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchType = activeQuery.type === 'ALL' || o.type === activeQuery.type
      const matchStatus = activeQuery.status === 'ALL' || o.status.toUpperCase() === activeQuery.status ||
        (activeQuery.status === 'COMPLETED' && o.status.toUpperCase() === 'RECEIVED')
      const matchId = !activeQuery.docId || o.id.toLowerCase().includes(activeQuery.docId.toLowerCase())
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

  const handleStatusPill = (status) => {
    const newState = { ...activeQuery, status }
    setFilterInputs(prev => ({ ...prev, status }))
    setActiveQuery(newState)
  }

  const handleQuickFilter = (type) => {
    const newState = { ...INITIAL_FILTER_STATE, type }
    setFilterInputs(newState)
    setActiveQuery(newState)
  }

  const handleCreate = () => {
    if (isCreatingRef.current) return
    isCreatingRef.current = true
    try {
      const payload = InboundOrderService.buildCreateCommand(newOrder)
      publish(TOPIC_CREATE_ACTION, payload)
      setIsCreateOpen(false)
      setNewOrder({ ...INITIAL_ORDER_STATE, request_id: crypto.randomUUID() })
    } catch (error) {
      if (error instanceof InboundOrderValidationError) {
        alert(error.message)
        return
      }
      throw error
    } finally {
      isCreatingRef.current = false
    }
  }

  const handleLotReceiptSubmit = (form) => {
    const order = lotModal.order
    const line = lotModal.line

    // Payload structure aligned with ReceiptService.buildReceiptCommand
    const payload = {
      doc_id: order.id,
      type: order.type || 'ASN',
      context: { dock: 'DOCK-IN-01', vehicleLicense: order.vehicleLicense || '' },
      lines: [{
        code: line.code,
        desc: line.desc || '',
        batch: form.batch,
        mfgDate: form.mfgDate,
        expiry: form.expiry || '',
        qty: Number(form.qty),
        uom: line.uom || 'KG',
        containerId: form.containerId || '',
        stagingLocation: form.stagingLocation || 'RCV-01',
        receiver: form.receiver || ''
      }],
      outcome: form.outcome,
      inspection: { packagingOk: true, noLeaks: true, notes: '' },
      operator: form.receiver || 'CurrentUser',
      timestamp: Date.now()
    }

    publish(TOPIC_ACTION_RECEIPT, payload)
    setLotModal(null)
    setSelectedOrder(prev => prev ? { ...prev } : null)
  }

  const addLine = () => {
    setNewOrder(prev => ({ ...prev, lines: [...prev.lines, { code: '', qty: '100', lot: '', expiry: '' }] }))
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
    if (!window.confirm(`Delete order ${id}?`)) return
    publish("Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Delete_Inbound_Plan", {
      doc_id: id,
      timestamp: Date.now()
    })
    if (selectedOrder?.id === id) setSelectedOrder(null)
  }

  return (
    <PageContainer title="Inbound Orders" subtitle="Manage POs, ASNs, and Returns (Control Tower)" variant="compact">
      <div className="flex flex-col md:flex-row gap-0 h-auto md:h-[calc(100vh-120px)] min-h-[500px]">

        {/* ═══════════ LEFT PANEL: List ═══════════ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">

            <UNSConnectionInfo topic={TOPIC_PLAN} />

            {/* --- Filter Matrix --- */}
            <Card className="border-slate-200 shadow-sm bg-slate-50/50">
              <CardContent className="p-3 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase">Document #</Label>
                    <Input
                      placeholder="e.g. PO-2026..."
                      className="bg-white h-7 text-xs"
                      value={filterInputs.docId}
                      onChange={e => setFilterInputs(prev => ({ ...prev, docId: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase">Warehouse</Label>
                    <WarehouseSelect
                      value={filterInputs.warehouse}
                      onChange={v => setFilterInputs(prev => ({ ...prev, warehouse: v }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase">Source</Label>
                    <Input
                      placeholder="Supplier or Line..."
                      className="bg-white h-7 text-xs"
                      value={filterInputs.supplier}
                      onChange={e => setFilterInputs(prev => ({ ...prev, supplier: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase">Operator</Label>
                    <div className="relative">
                      <User className="absolute left-2 top-1.5 h-3 w-3 text-slate-400" />
                      <Input
                        placeholder="Operator"
                        className="bg-white h-7 text-xs pl-7"
                        value={filterInputs.operator}
                        onChange={e => setFilterInputs(prev => ({ ...prev, operator: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase">Business Type</Label>
                    <Select value={filterInputs.type} onValueChange={v => setFilterInputs(prev => ({ ...prev, type: v }))}>
                      <SelectTrigger className="bg-white h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Types</SelectItem>
                        {Object.entries(BUSINESS_TYPES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500 uppercase">Status</Label>
                    <Select value={filterInputs.status} onValueChange={v => setFilterInputs(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger className="bg-white h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="PLANNED">Planned</SelectItem>
                        <SelectItem value="RECEIVING">Receiving</SelectItem>
                        <SelectItem value="QC">QC</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 flex justify-end items-end gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-white" onClick={handleResetFilters}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Reset
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4" onClick={handleQuery}>
                      <Search className="h-3 w-3 mr-1" /> Query
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* --- Status Pills + Toolbar --- */}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATUS_PILLS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusPill(s)}
                    className={`px-3 py-1.5 sm:py-1 text-xs font-medium rounded-full transition-colors ${
                      activeQuery.status === s
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                    <span className="ml-1 opacity-70">({statusCounts[s] || 0})</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 shrink-0 max-sm:w-full">
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
                  <FileDown className="h-3.5 w-3.5 mr-1.5" /> Export
                </Button>
                <Button className="bg-[#b2ed1d] text-slate-900 font-bold hover:bg-[#8cd121] shadow-sm h-8 text-xs" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Inbound
                </Button>
              </div>
            </div>

            {/* --- Quick Type Filters --- */}
            <div className="flex gap-1.5">
              <Button variant={activeQuery.type === 'PO' ? 'default' : 'outline'} size="sm" onClick={() => handleQuickFilter('PO')} className="rounded-full h-6 text-[10px] px-2.5">Purchase</Button>
              {/* [PAUSED - 内仓 scope] manufacturing inbound types */}
              {/* <Button variant={activeQuery.type === 'PROD_FG' ? 'default' : 'outline'} size="sm" onClick={() => handleQuickFilter('PROD_FG')} className="rounded-full h-6 text-[10px] px-2.5">Production FG</Button> */}
              <Button variant={activeQuery.type === 'RMA' ? 'default' : 'outline'} size="sm" onClick={() => handleQuickFilter('RMA')} className="rounded-full h-6 text-[10px] px-2.5">Returns</Button>
            </div>

            {/* --- Table --- */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase w-[40px]">#</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Document</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase text-center">Status</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Type</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Source</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Vehicle</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Arrival</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Filter className="h-8 w-8 text-slate-300" />
                          <p className="text-sm">No orders match your query.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((order, index) => {
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
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-xs font-bold text-blue-600">{order.id}</span>
                              <div className="flex items-center gap-1">
                                {getSourceBadge(order)}
                                <span className="text-[10px] text-slate-400">{order.warehouse}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${bizStyle.color} flex items-center gap-1 w-fit`}>
                              <Icon className="h-3 w-3" />
                              {bizStyle.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700 font-medium max-w-[120px] truncate">{order.source}</TableCell>
                          <TableCell>
                            {order.vehicleLicense ? (
                              <span className="font-mono text-xs text-slate-700">{order.vehicleLicense}</span>
                            ) : (
                              <span className="text-[10px] text-slate-300">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {order.vehicleArrivalTime ? (
                              <div className="flex items-center gap-1 text-xs text-slate-600">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {order.vehicleArrivalTime}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                              onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id) }}
                            >
                              <Trash2 className="h-3 w-3" />
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

        {/* ═══════════ RIGHT PANEL: Detail ═══════════ */}
        {selectedOrder && (
          <div className="w-full md:w-[440px] shrink-0 border-t md:border-t-0 md:border-l border-slate-200 bg-white flex flex-col overflow-hidden ml-0 max-md:max-h-[60vh]">

            {/* --- Header --- */}
            <div className="px-5 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-mono text-base font-bold text-slate-900">{selectedOrder.id}</h2>
                    {getSourceBadge(selectedOrder)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(selectedOrder.status)}
                    {(() => {
                      const biz = BUSINESS_TYPES[selectedOrder.type]
                      if (!biz) return null
                      const BizIcon = biz.icon || Truck
                      return (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${biz.color} flex items-center gap-1`}>
                          <BizIcon className="h-3 w-3" />
                          {biz.label}
                        </span>
                      )
                    })()}
                  </div>
                  {selectedOrder.source && (
                    <p className="text-xs text-slate-500">{selectedOrder.source}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* --- Scrollable Body --- */}
            <div className="flex-1 overflow-y-auto">

              {/* Vehicle Card */}
              {(selectedOrder.vehicleLicense || selectedOrder.vehicleArrivalTime) && (
                <div className="mx-5 mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Truck className="h-3 w-3" /> Vehicle
                  </h4>
                  <div className="space-y-1.5">
                    {selectedOrder.vehicleLicense && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">License Plate</span>
                        <span className="font-mono font-medium text-slate-800">{selectedOrder.vehicleLicense}</span>
                      </div>
                    )}
                    {selectedOrder.vehicleArrivalTime && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Arrived</span>
                        <span className="flex items-center gap-1 font-medium text-slate-800">
                          <Clock className="h-3 w-3 text-blue-500" /> {selectedOrder.vehicleArrivalTime}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Info */}
              <div className="mx-5 mt-4 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Warehouse</span>
                  <span className="font-medium text-slate-800">{selectedOrder.warehouse}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Operator</span>
                  <span className="font-medium text-slate-800">{selectedOrder.operator}</span>
                </div>
                {selectedOrder.eta && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">ETA</span>
                    <span className="font-medium text-slate-800">{selectedOrder.eta}</span>
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="mx-5 mt-5">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Package className="h-3 w-3" /> Line Items ({selectedOrder.lines?.length || 0})
                </h4>
                {selectedOrder.lines && selectedOrder.lines.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.lines.map((line, i) => {
                      const lineStatus = line.status || selectedOrder.status
                      const canReceive = ['PLANNED', 'REGISTERED', 'RECEIVING'].includes(
                        (selectedOrder.status || '').toUpperCase()
                      )

                      return (
                        <div
                          key={i}
                          className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <p className="font-mono text-xs font-bold text-slate-900 truncate">
                                {line.sku || line.code || `Line ${i + 1}`}
                              </p>
                              {(line.desc || line.description) && (
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {line.desc || line.description}
                                </p>
                              )}
                            </div>
                            {getStatusBadge(lineStatus)}
                          </div>

                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>
                                <span className="font-mono font-bold">{line.received_qty ?? 0}</span>
                                <span className="text-slate-400"> / </span>
                                <span className="font-mono font-bold">
                                  {line.qty_expected || line.qty || 0}
                                </span>
                                <span className="text-slate-400 ml-1">received</span>
                              </span>
                              {line.uom && <span className="text-slate-400">{line.uom}</span>}
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div
                                className="bg-green-500 h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ((line.received_qty ?? 0) /
                                      (line.qty_expected || line.qty || 1)) *
                                      100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          {canReceive && (
                            <Button
                              size="sm"
                              className="mt-3 w-full h-7 text-xs bg-[#b2ed1d] text-slate-900 font-bold hover:bg-[#8cd121]"
                              onClick={() =>
                                setLotModal({
                                  order: selectedOrder,
                                  line,
                                  lineIndex: i,
                                })
                              }
                            >
                              扫码收货
                            </Button>
                          )}
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

            {/* --- Actions Footer --- */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 space-y-2">
              {selectedOrder.status?.toUpperCase() === 'QC' && (
                <Button
                  className="w-full h-9 text-xs gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  onClick={() => navigate('/quality/samples')}
                >
                  Go to QA Samples <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
              {selectedOrder.status?.toUpperCase() === 'PUTAWAY' && (
                <Button
                  variant="outline"
                  className="w-full h-9 text-xs gap-2 border-slate-200"
                  onClick={() => navigate('/operations/inbound/execution')}
                >
                  Open Putaway <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ CREATE MODAL (unchanged) ═══════════ */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create Inbound Plan</DialogTitle>
            <DialogDescription>
              {InboundOrderValidator.isManufacturing(newOrder.type) ? "Register Internal Production Output" : "Register External Supplier Document"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Business Type</Label>
                <Select value={newOrder.type} onValueChange={v => setNewOrder(prev => ({ ...prev, type: v }))}>
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
                <WarehouseSelect value={newOrder.warehouse} onChange={v => setNewOrder(prev => ({ ...prev, warehouse: v }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ETA / Prod Date</Label>
                <Input type="date" value={newOrder.eta} onChange={e => setNewOrder(prev => ({ ...prev, eta: e.target.value }))} />
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded border border-slate-100">
              {InboundOrderValidator.isManufacturing(newOrder.type) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-emerald-700">Production Order #</Label>
                    <Input
                      placeholder="e.g. MO-2026-001"
                      value={newOrder.productionOrder}
                      onChange={e => setNewOrder(prev => ({ ...prev, productionOrder: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-emerald-700">Production Line</Label>
                    <Select value={newOrder.lineId} onValueChange={v => setNewOrder(prev => ({ ...prev, lineId: v }))}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-blue-700">Supplier</Label>
                    <Select
                      value={newOrder.supplier}
                      onValueChange={v => setNewOrder(prev => ({ ...prev, supplier: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white">
                        <SelectValue placeholder="Select Supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(s => (
                          <SelectItem key={s.code} value={s.name}>{s.code} — {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Operator</Label>
                    <WorkerSelect
                      value={newOrder.operator}
                      onChange={v => setNewOrder(prev => ({ ...prev, operator: v }))}
                      placeholder="Select Operator"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Platform / Dock</Label>
                <Select
                  value={newOrder.platform}
                  onValueChange={v => setNewOrder(prev => ({ ...prev, platform: v }))}
                >
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Select Dock" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map(p => (
                      <SelectItem key={p.code} value={p.code}>{p.code} — {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vehicle License</Label>
                <Select
                  value={newOrder.vehicleLicense}
                  onValueChange={v => setNewOrder(prev => ({ ...prev, vehicleLicense: v }))}
                >
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Select Vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.code} value={v.license}>{v.license} ({v.carrier})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-bold">Line Items</Label>
                <Button size="sm" variant="ghost" onClick={addLine} className="h-6 text-xs"><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
              </div>
              {newOrder.lines.map((line, idx) => (
                <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center border-b border-slate-100 pb-2 sm:border-0 sm:pb-0">
                  <div className="flex-1 min-w-[140px]">
                    <MaterialSelect value={line.code} onChange={(val) => updateLine(idx, 'code', val)} />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="h-8 text-xs bg-white"
                      value={line.qty}
                      onChange={e => updateLine(idx, 'qty', e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      placeholder="Lot No."
                      className="h-8 text-xs bg-white"
                      value={line.lot}
                      onChange={e => updateLine(idx, 'lot', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="date"
                      className="h-8 text-xs bg-white"
                      value={line.expiry}
                      onChange={e => updateLine(idx, 'expiry', e.target.value)}
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
            <Button onClick={handleCreate} className="bg-[#b2ed1d] text-slate-900 font-bold hover:bg-[#8cd121]">Confirm Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {lotModal && (
        <LotReceivingModal
          order={lotModal.order}
          line={lotModal.line}
          onClose={() => setLotModal(null)}
          onSubmit={handleLotReceiptSubmit}
        />
      )}
    </PageContainer>
  )
}
