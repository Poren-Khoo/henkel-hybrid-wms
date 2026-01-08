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
            <Card className="border-l-4 border-l-blue-500 shadow-sm"><CardContent className="p-4"><div className="text-2xl font-bold">{shipments.length}</div><div className="text-xs text-slate-500">Active Shipments</div></CardContent></Card>
            <Card className="border-l-4 border-l-green-500 shadow-sm"><CardContent className="p-4"><div className="text-2xl font-bold">{availableFG.length}</div><div className="text-xs text-slate-500">Available Pallets</div></CardContent></Card>
        </div>

        {/* Main Table */}
        <Card className="border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Truck className="h-5 w-5" /> Transfer Orders</h3>
                <Button className="bg-slate-900 text-white" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Transfer
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead>DN Number</TableHead>
                        <TableHead>Customer / 3PL</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {shipments.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No active shipments.</TableCell></TableRow>
                    ) : (
                        shipments.map(s => (
                            <TableRow key={s.dn_id}>
                                <TableCell className="font-mono text-blue-600 font-medium">{s.dn_id}</TableCell>
                                <TableCell>{s.customer}</TableCell>
                                <TableCell className="text-xs text-slate-500"><div className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {s.destination}</div></TableCell>
                                <TableCell>
                                    {s.items.map((i, idx) => (
                                        <div key={idx} className="text-xs bg-slate-100 rounded px-2 py-1 inline-block mr-1">
                                            {i.sku} ({i.qty} kg)
                                        </div>
                                    ))}
                                </TableCell>
                                <TableCell><Badge variant="outline" className={s.status === 'READY_TO_PICK' ? 'bg-green-50 text-green-700' : ''}>{s.status}</Badge></TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>

        {/* CREATE DIALOG */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Create 3PL Transfer Order</DialogTitle></DialogHeader>
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
                <DialogFooter>
                    <Button onClick={handleCreateShipment} disabled={!customer || !selectedProduct}>Create Transfer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  )
}