import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/ui/dialog'
import { Label } from '../../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { Truck, Plus, Search, MapPin, Package } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_SHIPMENT_LIST = "Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List"
const TOPIC_INVENTORY = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"
const TOPIC_ACTION_CREATE = "Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Shipment"

export default function DispatchOrders() {
  const { data, publish } = useGlobalUNS()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  
  // Form State
  const [customer, setCustomer] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')

  // 1. Get Live Shipments
  const shipments = useMemo(() => {
    return data.raw[TOPIC_SHIPMENT_LIST]?.items || []
  }, [data.raw])

  // 2. Get Available Finished Goods (for the dropdown)
  const availableFG = useMemo(() => {
    const inv = data.raw[TOPIC_INVENTORY]?.stock_items || []
    // Only show items that are NOT quarantined and NOT allocated
    return inv.filter(i => (i.status === 'AVAILABLE' || i.status === 'RELEASED') && !i.allocated_to)
  }, [data.raw])

  // Submit Handler
  const handleCreateShipment = () => {
    if (!customer || !selectedProduct) return;

    const payload = {
        customer: customer,
        destination: "3PL Hub - Shanghai East",
        items: [
            { sku: selectedProduct, qty: 1 } // Simplified: 1 Pallet
        ],
        created_by: "Admin"
    }

    console.log("🚚 Creating Shipment:", payload)
    publish(TOPIC_ACTION_CREATE, payload)
    setIsCreateOpen(false)
    setCustomer('')
    setSelectedProduct('')
  }

  return (
    <PageContainer title="Dispatch to 3PL" subtitle="Manage outbound Transfer Orders and Delivery Notes">
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_SHIPMENT_LIST} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-3xl font-bold text-slate-900">{shipments.length}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Active Shipments</div></CardContent></Card>
            <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-4"><div className="text-3xl font-bold text-slate-900">{availableFG.length}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Available Pallets</div></CardContent></Card>
        </div>

        {/* Main Table */}
        <Card className="bg-white border-slate-200 shadow-sm">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Truck className="h-5 w-5 text-slate-500" /> Transfer Orders</h3>
                <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4" /> New Transfer
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">DN Number</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Customer / 3PL</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Destination</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Items</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {shipments.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No active shipments.</TableCell></TableRow>
                    ) : (
                        shipments.map(s => (
                            <TableRow key={s.dn_id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                                <TableCell className="font-mono text-xs font-bold text-slate-700">{s.dn_id}</TableCell>
                                <TableCell className="font-medium text-slate-900">{s.customer}</TableCell>
                                <TableCell className="text-xs text-slate-500"><div className="flex items-center gap-1"><MapPin className="h-4 w-4 text-slate-400"/> {s.destination}</div></TableCell>
                                <TableCell>
                                    {s.items.map((i, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200 border rounded-sm mr-1 mb-1">
                                            {i.sku} ({i.qty} kg)
                                        </Badge>
                                    ))}
                                </TableCell>
                                <TableCell><Badge variant="outline" className={s.status === 'READY_TO_PICK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 border rounded-sm' : 'bg-slate-50 text-slate-600 border-slate-200 border rounded-sm'}>{s.status}</Badge></TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>

        {/* CREATE DIALOG */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent>
                <DialogHeader className="border-b border-slate-100 bg-slate-50/50"><DialogTitle>Create 3PL Transfer Order</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Select 3PL / Customer</Label>
                        <Select value={customer} onValueChange={setCustomer}>
                            <SelectTrigger><SelectValue placeholder="Select Destination..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DHL Logistics">DHL Logistics (PVG)</SelectItem>
                                <SelectItem value="SF Express">SF Express (Hub)</SelectItem>
                                <SelectItem value="Tesla Shanghai">Tesla Shanghai (Direct)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Select Finished Good</Label>
                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                            <SelectTrigger><SelectValue placeholder="Select Stock..." /></SelectTrigger>
                            <SelectContent>
                                {availableFG.length === 0 ? (
                                    <SelectItem value="none" disabled>No Available Stock</SelectItem>
                                ) : (
                                    availableFG.map(fg => (
                                        <SelectItem key={fg.hu} value={fg.sku}>
                                            {fg.sku} | {fg.qty} {fg.uom} ({fg.location})
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="border-t border-slate-100 bg-slate-50/30">
                    <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-4" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2" onClick={handleCreateShipment} disabled={!customer || !selectedProduct}>Create Transfer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  )
}