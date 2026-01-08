import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../../components/ui/dialog'
import { Label } from '../../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { 
  Factory, 
  Plus, 
  Search, 
  RefreshCw, 
  CloudDownload, 
  UserCog
} from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_ORDER_LIST = "Henkelv2/Shanghai/Logistics/Production/State/Order_List"
const TOPIC_CREATE_ORDER = "Henkelv2/Shanghai/Logistics/Production/Action/Create_Order"

export default function ProductionOrders() {
  const { data, publish } = useGlobalUNS()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchText, setSearchText] = useState('')
  
  // Manual Create Form State (YOUR ORIGINAL STATE)
  const [newOrder, setNewOrder] = useState({ product: '', qty: '', line: 'Line-1', start: '' })

  // 1. GET LIVE DATA FROM MQTT (Single Source of Truth)
  const orders = useMemo(() => {
    const rawData = data.raw[TOPIC_ORDER_LIST]
    const list = rawData?.items || []
    
    if (!searchText) return list
    return list.filter(o => 
        (o.order_id && o.order_id.toLowerCase().includes(searchText.toLowerCase())) || 
        (o.productCode && o.productCode.toLowerCase().includes(searchText.toLowerCase()))
    )
  }, [data.raw, searchText])

  // 2. SIMULATE SAP SYNC ACTION
  // This behaves exactly like your mock, but sends data to the Backend
  const handleSimulateSync = () => {
    setIsSyncing(true)
    
    setTimeout(() => {
      const randomId = Math.floor(Math.random() * 9000) + 1000
      
      // Simulate an order coming from SAP
      const sapOrder = {
        order_id: `PO-SAP-${randomId}`,
        productCode: "ADH-001", // The material you have stock for
        productName: "Epoxy Adhesive Base",
        qty: "2000 KG",
        start_date: "2026-01-10",
        line: "Line-3",
        status: "PLANNED",
        source: "SAP",
        bom: [ // Predetermined SAP BOM
            { material: "RES-001", qty: 500 },
            { material: "CAT-99", qty: 50 }
        ]
      }

      // Publish to UNS (Node-RED will pick this up)
      publish(TOPIC_CREATE_ORDER, sapOrder)
      
      setIsSyncing(false)
    }, 1500)
  }

  // 3. HANDLE MANUAL CREATION (Your Original Logic + UNS)
  const handleManualSubmit = () => {
    if (!newOrder.product || !newOrder.qty) return

    const manualOrder = {
      order_id: `PO-MAN-${Math.floor(Math.random() * 10000)}`,
      source: 'MANUAL',
      productCode: newOrder.product, // Mapped from your input
      qty: newOrder.qty,
      line: newOrder.line,
      start_date: newOrder.start || new Date().toISOString().split('T')[0],
      status: 'PLANNED',
      created_by: 'CurrentUser'
    }

    // Publish to UNS
    publish(TOPIC_CREATE_ORDER, manualOrder)

    // Reset and Close
    setIsCreateOpen(false)
    setNewOrder({ product: '', qty: '', line: 'Line-1', start: '' }) 
  }

  // Helper: Source Badge
  const getSourceBadge = (source) => {
    if (source === 'SAP') {
      return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 gap-1"><CloudDownload className="h-3 w-3" /> SAP ERP</Badge>
    }
    return <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 gap-1"><UserCog className="h-3 w-3" /> Manual</Badge>
  }

  // Helper: Status Badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Released': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Released</Badge>
      case 'In Progress': 
      case 'IN_PROGRESS': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">In Progress</Badge>
      case 'PLANNED': return <Badge className="bg-blue-100 text-blue-700">Planned</Badge>
      default: return <Badge variant="outline" className="text-slate-500">{status}</Badge>
    }
  }

  return (
    <PageContainer title="Production Orders" subtitle="Manage manufacturing orders from SAP and manual entry">
      <div className="space-y-6">
        
        {/* Connection Info */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <UNSConnectionInfo topic={TOPIC_ORDER_LIST} />
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-900">{orders.length}</div>
              <div className="text-xs font-medium text-slate-500 uppercase mt-1">Total Active Orders</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'Released').length}</div>
              <div className="text-xs font-medium text-slate-500 uppercase mt-1">Released to Floor</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-900">{orders.filter(o => o.status === 'In Progress').length}</div>
              <div className="text-xs font-medium text-slate-500 uppercase mt-1">In Production</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-slate-900">{orders.filter(o => o.source === 'MANUAL').length}</div>
              <div className="text-xs font-medium text-slate-500 uppercase mt-1">Manual / Ad-hoc</div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN ACTIONS & TABLE */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search orders, products..." 
                className="pl-8" 
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* SYNC BUTTON */}
              <Button 
                variant="outline" 
                onClick={handleSimulateSync} 
                disabled={isSyncing}
                className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing SAP...' : 'Sync from SAP'}
              </Button>

              {/* MANUAL CREATE BUTTON */}
              <Button className="bg-slate-900 text-white" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create Ad-hoc
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Order ID</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Production Line</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                            <CloudDownload className="h-8 w-8 text-slate-300" />
                            <span>No active orders. Click "Sync from SAP".</span>
                        </div>
                    </TableCell>
                 </TableRow>
              ) : (
                  orders.map((order, idx) => (
                    <TableRow key={order.order_id || idx}>
                      <TableCell className="font-mono text-xs font-medium text-blue-600 flex items-center gap-2">
                        <Factory className="h-3 w-3" /> {order.order_id}
                      </TableCell>
                      <TableCell>
                        {getSourceBadge(order.source)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{order.productCode}</TableCell>
                      <TableCell>{order.qty}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{order.line}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{order.start_date}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500">View Details</Button>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* --- MANUAL ORDER DIALOG (YOUR ORIGINAL UI RESTORED) --- */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Manual Production Order</DialogTitle>
              <DialogDescription>
                For ad-hoc runs, rework, or emergency orders not in SAP.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Product Name</Label>
                <Input 
                  placeholder="e.g. ADH-001" 
                  value={newOrder.product}
                  onChange={e => setNewOrder({...newOrder, product: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Target Quantity</Label>
                  <Input 
                    placeholder="e.g. 50 KG" 
                    value={newOrder.qty}
                    onChange={e => setNewOrder({...newOrder, qty: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Production Line</Label>
                  <Select 
                    value={newOrder.line} 
                    onValueChange={val => setNewOrder({...newOrder, line: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Line-1">Line-1 (High Speed)</SelectItem>
                      <SelectItem value="Line-2">Line-2 (Standard)</SelectItem>
                      <SelectItem value="Line-3">Line-3 (Manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={newOrder.start}
                  onChange={e => setNewOrder({...newOrder, start: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button className="bg-slate-900 text-white" onClick={handleManualSubmit}>Create Order</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}