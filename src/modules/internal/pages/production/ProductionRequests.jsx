import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/ui/dialog'
import { Label } from '../../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { Textarea } from '../../../../components/ui/textarea'
import { ClipboardList, Plus, Search, ArrowRight, X } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_ORDER_LIST = "Henkelv2/Shanghai/Logistics/Production/State/Order_List"
const TOPIC_ACTION_CREATE_RESERVATION = "Henkelv2/Shanghai/Logistics/Production/Action/Create_Reservation"
// NEW TOPIC: We need to listen to the list of created reservations to populate the table
const TOPIC_RESERVATION_LIST = "Henkelv2/Shanghai/Logistics/Production/State/Reservation_List"

export default function ProductionRequests() {
  const { data, publish } = useGlobalUNS()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState('')
  const [items, setItems] = useState([]) 
  const [neededBy, setNeededBy] = useState('')
  const [stagingInstructions, setStagingInstructions] = useState('')

  // 1. GET LIVE ORDERS (For the Dropdown)
  const orders = useMemo(() => {
    const rawData = data.raw[TOPIC_ORDER_LIST]
    const rawOrders = Array.isArray(rawData) ? rawData : rawData?.items || []
    
    const mappedOrders = Array.isArray(rawOrders) ? rawOrders.map(order => ({
      order_id: order.order_id || 'N/A',
      productCode: order.productCode || 'N/A',
      // Fallback logic to ensure we see the Product Name or Code
      product: order.product || order.product_name || order.productName || order.description || order.productCode || 'N/A',
      qty: order.qty || 0,
      qtyUnit: order.qtyUnit || 'KG',
      line: order.line || 'N/A',
      status: (order.status || '').toUpperCase()
    })) : []
    
    // Show only active orders
    return mappedOrders.filter(order => order.status === 'PLANNED' || order.status === 'IN_PROGRESS' || order.status === 'RELEASED')
  }, [data.raw])

  // 2. GET LIVE REQUESTS (For the Main Table) - REPLACES MOCK DATA
  const liveRequests = useMemo(() => {
    const rawData = data.raw[TOPIC_RESERVATION_LIST]
    // The backend sends { items: [...] }
    const list = rawData?.items || []
    return list
  }, [data.raw])

  // --- DIALOG LOGIC ---

  const handleOrderSelect = (orderId) => {
    setSelectedOrder(orderId)
    const selectedOrderData = orders.find(o => o.order_id === orderId)
    
    if (!selectedOrderData) { setItems([]); return }
    
    const orderQty = parseFloat(selectedOrderData.qty) || 0;
    const pCode = (selectedOrderData.productCode || '').toUpperCase();

    // Auto-BOM Logic
    if (pCode.includes('GLUE') || pCode.includes('ADH') || pCode.includes('IND')) {
      setItems([
        { 
          id: Date.now(), 
          material: 'ADH-001', 
          desc: 'Epoxy Adhesive Base Resin', 
          qty: Math.round(orderQty * 0.5), 
          uom: 'KG', 
          available: '1000 KG', // Hardcoded availability check for demo
          locked: true 
        }
      ])
    } else {
      setItems([])
    }
  }

  const handleAddRow = () => {
    setItems([...items, { id: Date.now(), material: '', desc: '-', qty: 0, uom: 'KG', available: '-', locked: false }])
  }

  const handleDeleteRow = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const handleSubmitRequest = () => {
    if (!selectedOrder || items.length === 0) return
    const selectedOrderData = orders.find(o => o.order_id === selectedOrder)
    
    // Generate a base ID for this batch of requests
    const reservationBaseId = 'REQ-' + Math.floor(Math.random() * 10000)
    
    items.forEach((item, index) => {
      const payload = {
        reservation_id: reservationBaseId + '-' + (index + 1),
        order_id: selectedOrderData.order_id,
        material_code: item.material || "UNKNOWN",
        material_name: item.desc || "Unknown Material",
        qty_required: parseFloat(item.qty) || 0,
        line: selectedOrderData.line,
        needed_by: neededBy || new Date().toISOString(),
        status: 'OPEN',
        created_at: Date.now()
      }
      // Publish to Node-RED
      publish(TOPIC_ACTION_CREATE_RESERVATION, payload)
    })
    
    setIsCreateOpen(false)
    setSelectedOrder('')
    setItems([])
    setNeededBy('')
    setStagingInstructions('')
  }

  const getStatusBadge = (status) => {
    if (status === 'ALLOCATED') return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 border rounded-sm">Allocated</Badge>
    if (status === 'PARTIAL') return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 border rounded-sm">Partial</Badge>
    return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm">{status || 'OPEN'}</Badge>
  }

  return (
    <PageContainer title="Production Requests" subtitle="Convert production orders into material picking requests (BOM Explosion)">
      <div className="space-y-6">
        
        {/* Connection Info */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <UNSConnectionInfo topic={TOPIC_RESERVATION_LIST} />
        </div>

        {/* KPI Summary (Preserved) */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-3xl font-bold text-slate-900">{liveRequests.filter(r => r.status === 'OPEN').length}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Open Requests</div></CardContent></Card>
          <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-3xl font-bold text-slate-900">{liveRequests.filter(r => r.status === 'PARTIAL').length}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Partial</div></CardContent></Card>
          <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-3xl font-bold text-slate-900">{liveRequests.filter(r => r.status === 'ALLOCATED').length}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Ready for Picking</div></CardContent></Card>
          <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-3xl font-bold text-slate-900">{orders.length}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Available Orders</div></CardContent></Card>
        </div>

        {/* Main List - SWITCHED TO LIVE DATA */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search requests..." className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors" />
            </div>
            <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Request
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Request ID</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">SAP Order</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Qty Required</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Allocated</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liveRequests.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                            <ClipboardList className="h-8 w-8 text-slate-300" />
                            <span>No active requests. Click "New Request" to start.</span>
                        </div>
                    </TableCell>
                 </TableRow>
              ) : (
                liveRequests.map((req, idx) => (
                  <TableRow key={req.reservation_id || idx} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-slate-700 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-slate-400" /> {req.reservation_id}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{req.order_id}</TableCell>
                    <TableCell>
                        <div className="font-medium">{req.material_name}</div>
                        <div className="text-xs text-slate-500">{req.material_code}</div>
                    </TableCell>
                    <TableCell>{req.qty_required} kg</TableCell>
                    <TableCell className={req.qty_allocated >= req.qty_required ? "text-emerald-600 font-bold" : "text-slate-500"}>
                        {req.qty_allocated || 0} kg
                    </TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-right">
                      {/* Placeholder Action */}
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-slate-500 hover:text-slate-900">View</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* --- CREATE REQUEST DIALOG --- */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader className="border-b border-slate-100 bg-slate-50/50">
              <DialogTitle>New Production Request</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                  <Label>Select SAP Production Order</Label>
                  <Select onValueChange={handleOrderSelect} value={selectedOrder}>
                    <SelectTrigger><SelectValue placeholder="Select PO..." /></SelectTrigger>
                    <SelectContent>
                      {orders.length === 0 ? (
                        <SelectItem value="none" disabled>No orders available (PLANNED/IN_PROGRESS only)</SelectItem>
                      ) : (
                        orders.map(po => (
                          <SelectItem key={po.order_id} value={po.order_id}>
                            {po.order_id} | {po.product} ({po.qty} {po.qtyUnit})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
              </div>
              <div className="grid gap-2">
                  <Label>Needed By</Label>
                  <Input type="datetime-local" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
              </div>

              {/* Material Table (BOM) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Materials Required</Label>
                  <Button size="sm" variant="outline" onClick={handleAddRow} className="h-8 border-slate-200 text-slate-700 hover:bg-slate-50">
                    <Plus className="h-3 w-3 mr-1" /> Add Material
                  </Button>
                </div>
                <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material</TableHead>
                          <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Qty</TableHead>
                          <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">UoM</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.material}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>{item.uom}</TableCell>
                          <TableCell>
                            {!item.locked && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteRow(item.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 bg-slate-50/30">
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-4" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2" onClick={handleSubmitRequest} disabled={items.length === 0}>
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  )
}