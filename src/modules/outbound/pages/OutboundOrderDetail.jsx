import React, { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { 
  Printer, FileText, Clock, Truck, Package, 
  MapPin, User, Calendar, CheckCircle2, AlertCircle, FileCheck
} from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { OutboundOrderService } from '../../../domain/outbound/OutboundOrderService'
import { OutboundOrderValidator } from '../../../domain/outbound/OutboundOrderValidator'

// TOPICS - Subscribe to real-time order data
const TOPIC_COST_DB = "Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB"
const TOPIC_SYNC_STATUS = "Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status"
const TOPIC_SHIPMENT_LIST = "Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List"

// Business Types (matching OutboundOrders.jsx)
const BUSINESS_TYPES = {
  'SALES_ORDER': { label: 'Sales Shipment (DN)', color: 'bg-blue-50 text-blue-700' },
  'TRANSFER_OUT': { label: 'Inter-WH Transfer', color: 'bg-purple-50 text-purple-700' }
}

export default function OutboundOrderDetail({ order: initialOrder, open, onClose, onAction }) {
  const { data, status } = useGlobalUNS()
  const [currentOrder, setCurrentOrder] = useState(initialOrder)

  // --- MQTT/UNS PATTERN: Real-time data subscription and merging ---
  // Merge real-time data from MQTT topics with initial order prop
  useEffect(() => {
    if (!initialOrder?.id) return

    // Get data from all sources
    const rawCostDNs = Array.isArray(data.dns) ? data.dns : []
    
    // Unwrap UNS envelope for sync status
    const syncRaw = data.raw[TOPIC_SYNC_STATUS]
    let syncPacket = syncRaw
    if (syncRaw?.topics && Array.isArray(syncRaw.topics) && syncRaw.topics.length > 0) {
      syncPacket = syncRaw.topics[0].value || syncRaw.topics[0]
    }
    const syncRecords = Array.isArray(syncPacket) 
      ? syncPacket 
      : syncPacket?.sync_records || syncPacket?.items || []
    
    // Unwrap UNS envelope for shipment list
    const shipmentRaw = data.raw[TOPIC_SHIPMENT_LIST]
    let shipmentPacket = shipmentRaw
    if (shipmentRaw?.topics && Array.isArray(shipmentRaw.topics) && shipmentRaw.topics.length > 0) {
      shipmentPacket = shipmentRaw.topics[0].value || shipmentRaw.topics[0]
    }
    const rawShipments = Array.isArray(shipmentPacket)
      ? shipmentPacket
      : shipmentPacket?.items || shipmentPacket?.shipments || []

    // Normalize and merge all sources
    const costingOrders = rawCostDNs
      .map(dn => OutboundOrderService.normalizeOrder(dn, 'costing'))
      .filter(o => o && o.id === initialOrder.id)

    const syncOrders = syncRecords
      .filter(r => {
        const type = (r.type || '').toUpperCase()
        return (type.includes('OUTBOUND') || type.includes('DN')) && (r.ref_no === initialOrder.id || r.id === initialOrder.id)
      })
      .map(r => OutboundOrderService.normalizeOrder(r, 'sync'))
      .filter(o => o && o.id === initialOrder.id)

    const shipmentOrders = rawShipments
      .filter(s => (s.dn_id === initialOrder.id || s.id === initialOrder.id))
      .map(s => OutboundOrderService.normalizeOrder(s, 'shipment'))
      .filter(o => o && o.id === initialOrder.id)

    // Merge orders (prioritize costing data for breakdown)
    const merged = OutboundOrderService.mergeOrders(costingOrders, syncOrders, shipmentOrders)
    
    if (merged.length > 0) {
      // Update with latest real-time data
      setCurrentOrder(merged[0])
    } else {
      // Fallback to initial order if no real-time data found
      setCurrentOrder(initialOrder)
    }
  }, [data, initialOrder])

  // Update when initialOrder prop changes
  useEffect(() => {
    setCurrentOrder(initialOrder)
  }, [initialOrder])

  // --- DDD PATTERN: Use domain service for progress steps ---
  const progressSteps = useMemo(() => {
    if (!currentOrder?.status) return []
    return OutboundOrderService.getProgressSteps(currentOrder.status)
  }, [currentOrder?.status])

  // --- DDD PATTERN: Use domain validator for status badge ---
  const statusConfig = useMemo(() => {
    if (!currentOrder?.status) {
      return { label: 'Unknown', className: 'bg-slate-100 text-slate-600' }
    }
    return OutboundOrderValidator.getStatusBadgeConfig(currentOrder.status)
  }, [currentOrder?.status])

  // --- Handle line items from multiple sources ---
  const lineItems = useMemo(() => {
    if (!currentOrder) return []
    // Priority: order.lines > order.items > empty array
    if (currentOrder.lines && Array.isArray(currentOrder.lines) && currentOrder.lines.length > 0) {
      return currentOrder.lines
    }
    if (currentOrder.items && Array.isArray(currentOrder.items) && currentOrder.items.length > 0) {
      return currentOrder.items.map(item => ({
        code: item.sku || item.code || 'UNKNOWN',
        qty: item.qty || 0,
        desc: item.desc || item.description || 'Standard Material'
      }))
    }
    return []
  }, [currentOrder?.lines, currentOrder?.items])

  // Early return AFTER all hooks
  if (!currentOrder) return null

  // --- Cost Breakdown with Fallbacks (reused from OutboundOrders) ---
  const renderCostBreakdown = () => {
    if (!currentOrder.breakdown) {
      return (
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle size={16} />
            <span className="text-sm font-semibold">Cost Breakdown Not Available</span>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            This order does not have cost breakdown data. It may have been created from a non-costing source.
          </p>
          {currentOrder.cost && (
            <p className="text-xs text-amber-600 mt-1">
              Total Cost: ¥{Number(currentOrder.cost).toFixed(2)}
            </p>
          )}
        </div>
      )
    }

    // Normalize breakdown values with fallbacks
    const breakdown = currentOrder.breakdown
    const inboundTotal = Number(breakdown.inbound_total || breakdown.inboundTotal || 0)
    const inboundUnitPrice = Number(breakdown.inbound_unit_price || breakdown.inboundUnitPrice || breakdown.inbound_unit || 0)
    const outboundTotal = Number(breakdown.outbound_total || breakdown.outboundTotal || 0)
    const outboundUnitPrice = Number(breakdown.outbound_unit_price || breakdown.outboundUnitPrice || breakdown.outbound_unit || 0)
    const storageTotal = Number(breakdown.storage_total || breakdown.storageTotal || 0)
    const storageUnitPrice = Number(breakdown.storage_unit_price || breakdown.storageUnitPrice || breakdown.storage_unit || 0)
    const storageDays = Number(breakdown.storage_days || breakdown.storageDays || 10)

    return (
      <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Cost Breakdown</h3>
        <div className="space-y-4">
          {/* Inbound - Always show, even if 0 */}
          <div className={`flex justify-between items-center py-2 border-b border-dashed border-slate-200 ${inboundTotal === 0 ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-md">
                <Truck size={18} />
              </div>
              <div>
                <div className="font-medium text-slate-900">
                  Inbound (入库)
                  {inboundTotal === 0 && <span className="ml-2 text-xs text-slate-400">(Not calculated)</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {currentOrder.qty || 0} Units × ¥{inboundUnitPrice.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="font-mono font-semibold text-slate-900">
              ¥{inboundTotal.toFixed(2)}
            </div>
          </div>

          {/* Outbound - Always show, even if 0 */}
          <div className={`flex justify-between items-center py-2 border-b border-dashed border-slate-200 ${outboundTotal === 0 ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-md">
                <Package size={18} />
              </div>
              <div>
                <div className="font-medium text-slate-900">
                  Outbound (出库)
                  {outboundTotal === 0 && <span className="ml-2 text-xs text-slate-400">(Not calculated)</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {currentOrder.qty || 0} Units × ¥{outboundUnitPrice.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="font-mono font-semibold text-slate-900">
              ¥{outboundTotal.toFixed(2)}
            </div>
          </div>

          {/* Storage - Always show, even if 0 */}
          <div className={`flex justify-between items-center py-2 border-b border-dashed border-slate-200 ${storageTotal === 0 ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-md">
                <Clock size={18} />
              </div>
              <div>
                <div className="font-medium text-slate-900">
                  Storage (仓储)
                  {storageTotal === 0 && <span className="ml-2 text-xs text-slate-400">(Not calculated)</span>}
                </div>
                <div className="text-xs text-slate-500">
                  {currentOrder.qty || 0} Units × {storageDays} Days × ¥{storageUnitPrice.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="font-mono font-semibold text-slate-900">
              ¥{storageTotal.toFixed(2)}
            </div>
          </div>
        </div>
        {/* Totals */}
        <div className="pt-2">
          {currentOrder.basic_cost !== undefined && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">Basic Cost Total:</span>
              <span className="font-mono text-slate-700">¥{Number(currentOrder.basic_cost).toFixed(2)}</span>
            </div>
          )}
          {currentOrder.vas_cost !== undefined && (
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">VAS Cost:</span>
              <span className="font-mono text-slate-700">¥{Number(currentOrder.vas_cost).toFixed(2)}</span>
            </div>
          )}
          {currentOrder.cost && (
            <div className="flex justify-between text-lg pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-900">Total Billable:</span>
              <span className="font-bold text-[#b2ed1d] text-xl">¥{Number(currentOrder.cost).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-[900px] h-[90vh] max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {BUSINESS_TYPES[currentOrder.type]?.label || currentOrder.type}
                </Badge>
                <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
              </div>
              <DialogTitle className="text-2xl font-mono text-slate-900">{currentOrder.id}</DialogTitle>
              <DialogDescription>
                {currentOrder.customer || currentOrder.destination || 'Unknown'}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
              {onAction && (
                <Button size="sm" className="bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121]" onClick={() => onAction(currentOrder)}>
                  Actions
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-8 flex-1 flex flex-col min-h-0">
          {/* UNS Connection Status */}
          <div className="mb-4">
            <UNSConnectionInfo topic={TOPIC_COST_DB} />
          </div>

          <Tabs defaultValue="overview" className="w-full flex flex-col flex-1 min-h-0">
            <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 space-x-6 flex-shrink-0">
              <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-[#b2ed1d] data-[state=active]:shadow-none rounded-none px-0 pb-2">Overview</TabsTrigger>
              <TabsTrigger value="lines" className="data-[state=active]:border-b-2 data-[state=active]:border-[#b2ed1d] data-[state=active]:shadow-none rounded-none px-0 pb-2">
                Line Items ({lineItems.length})
              </TabsTrigger>
              {currentOrder.type === 'SALES_ORDER' && (
                <TabsTrigger value="financials" className="data-[state=active]:border-b-2 data-[state=active]:border-[#b2ed1d] data-[state=active]:shadow-none rounded-none px-0 pb-2">Financials</TabsTrigger>
              )}
              <TabsTrigger value="documents" className="data-[state=active]:border-b-2 data-[state=active]:border-[#b2ed1d] data-[state=active]:shadow-none rounded-none px-0 pb-2">Documents</TabsTrigger>
            </TabsList>

            {/* --- TAB 1: OVERVIEW (Progress & Context) --- */}
            <TabsContent value="overview" className="pt-6 pb-6 flex-1 overflow-y-auto min-h-0">
              <div className="space-y-6">
                {/* Workflow Progress - Using Domain Service */}
                <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Order Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-1">
                  {progressSteps.map((step, index) => (
                    <div key={index} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                          ${step.status === 'completed' ? 'bg-[#b2ed1d] text-slate-900' : ''}
                          ${step.status === 'active' ? 'bg-[#b2ed1d] text-slate-900 ring-4 ring-[#b2ed1d]/20' : ''}
                          ${step.status === 'pending' ? 'bg-slate-100 text-slate-400' : ''}
                        `}>
                          {step.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : index + 1}
                      </div>
                        <span className={`text-[10px] mt-1 text-center font-medium ${step.status === 'active' ? 'text-[#b2ed1d]' : 'text-slate-500'}`}>
                        {step.label}
                      </span>
                      </div>
                      {index < progressSteps.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-0.5 ${step.status === 'completed' ? 'bg-[#b2ed1d]' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <InfoCard icon={User} label="Operator" value={currentOrder.operator || currentOrder.submitted_by || "System"} />
              <InfoCard icon={Calendar} label="Requested Date" value={currentOrder.requestedDate || currentOrder.requested_date || "ASAP"} />
              <InfoCard icon={MapPin} label="Destination" value={currentOrder.destination || currentOrder.customer || "Unknown"} />
              <InfoCard icon={Package} label="Total Qty" value={currentOrder.qty || 0} sub="Units" />
              
              {/* Carrier and Tracking (for shipped orders) */}
              {currentOrder.status === 'SHIPPED' && currentOrder.carrier && (
                <InfoCard icon={Truck} label="Carrier" value={currentOrder.carrier} />
              )}
              {currentOrder.status === 'SHIPPED' && currentOrder.trackingNumber && (
                <InfoCard icon={FileCheck} label="Tracking Number" value={currentOrder.trackingNumber} />
              )}
            </div>
              </div>
            </TabsContent>

            {/* --- TAB 2: LINES (Inventory Allocation) --- */}
            <TabsContent value="lines" className="pt-6 pb-6 flex-1 overflow-y-auto min-h-0">
              <div>
                <Card>
                <div className="overflow-x-auto">
                  <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty Req</TableHead>
                    <TableHead className="text-center">Allocation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.length > 0 ? (
                    lineItems.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono font-medium">{line.code || line.sku}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                          {line.desc || line.description || "Standard Material"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{line.qty}</TableCell>
                      <TableCell className="text-center">
                          {currentOrder.status === 'NEW' || currentOrder.status === 'PENDING_APPROVAL' ? (
                          <Badge variant="outline" className="text-slate-400 border-slate-200">Pending</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Reserved
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-400">No line items found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
                </div>
              </Card>
              </div>
            </TabsContent>

            {/* --- TAB 3: FINANCIALS (Cost Breakdown with Fallbacks) --- */}
            <TabsContent value="financials" className="pt-6 pb-6 flex-1 overflow-y-auto min-h-0">
              <div>
                {renderCostBreakdown()}
              </div>
            </TabsContent>

            {/* --- TAB 4: DOCUMENTS (Mock Generation) --- */}
            <TabsContent value="documents" className="pt-6 pb-6 flex-1 overflow-y-auto min-h-0">
              <div>
                <div className="grid grid-cols-2 gap-4">
                <DocCard title="Pick List" type="PDF" status={currentOrder.status === 'PICKING' || currentOrder.status === 'PACKING' || currentOrder.status === 'READY_TO_SHIP' || currentOrder.status === 'SHIPPED' ? 'Ready' : 'Pending'} />
                <DocCard title="Delivery Note (DN)" type="PDF" status={currentOrder.status === 'SHIPPED' ? 'Final' : 'Draft'} />
                <DocCard title="Shipping Label" type="ZPL" status={currentOrder.status === 'SHIPPED' ? 'Ready' : 'Pending'} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Sub-components for cleaner code ---
function InfoCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-3">
      <div className="p-2 bg-white rounded shadow-sm">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-slate-400">{label}</div>
        <div className="font-medium text-slate-900 text-sm">
          {value} {sub && <span className="text-xs text-slate-400 font-normal">{sub}</span>}
        </div>
      </div>
    </div>
  )
}

function DocCard({ title, type, status }) {
  return (
    <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded group-hover:bg-white group-hover:shadow-sm transition-all">
          <FileText className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <div className="font-medium text-sm text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">{type} • {status}</div>
        </div>
      </div>
      <FileCheck className="w-4 h-4 text-slate-300 group-hover:text-[#b2ed1d]" />
    </div>
  )
}

