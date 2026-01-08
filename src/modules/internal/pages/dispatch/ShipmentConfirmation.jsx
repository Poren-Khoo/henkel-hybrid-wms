import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../../components/ui/dialog'
import { Label } from '../../../../components/ui/label'
import { Input } from '../../../../components/ui/input'
import { Truck, CheckCircle2, FileCheck, ClipboardCheck } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_SHIPMENT_LIST = "Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List"
const TOPIC_ACTION_SHIP = "Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Ship"

export default function ShipmentConfirmation() {
  const { data, publish } = useGlobalUNS()
  
  // Dialog State
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [driverName, setDriverName] = useState('')
  const [plateNo, setPlateNo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Get Shipments ready to go (PACKED)
  const readyToShip = useMemo(() => {
    const rawData = data.raw[TOPIC_SHIPMENT_LIST]
    const list = rawData?.items || []
    return list.filter(s => s.status === 'PACKED')
  }, [data.raw])

  // 2. Get Shipped History (For reference)
  const history = useMemo(() => {
    const rawData = data.raw[TOPIC_SHIPMENT_LIST]
    const list = rawData?.items || []
    return list.filter(s => s.status === 'SHIPPED')
  }, [data.raw])

  // 3. Handle Dispatch
  const handleDispatch = () => {
    if (!selectedShipment) return;
    setIsSubmitting(true)

    const payload = {
        dn_id: selectedShipment.dn_id,
        carrier_info: {
            driver: driverName || "Unknown",
            plate: plateNo || "N/A",
            time: new Date().toISOString()
        }
    }

    publish(TOPIC_ACTION_SHIP, payload)

    setTimeout(() => {
        setIsSubmitting(false)
        setSelectedShipment(null)
        setDriverName('')
        setPlateNo('')
    }, 800)
  }

  return (
    <PageContainer title="Ship / Dispatch" subtitle="Finalize shipments and dispatch trucks">
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_SHIPMENT_LIST} />

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-600 shadow-sm">
                <CardContent className="p-4 flex justify-between items-center">
                    <div>
                        <div className="text-2xl font-bold">{readyToShip.length}</div>
                        <div className="text-xs text-slate-500 uppercase">Ready for Pickup</div>
                    </div>
                    <Truck className="h-8 w-8 text-green-600 opacity-20" />
                </CardContent>
            </Card>
            <Card className="border-l-4 border-l-slate-500 shadow-sm">
                <CardContent className="p-4 flex justify-between items-center">
                    <div>
                        <div className="text-2xl font-bold">{history.length}</div>
                        <div className="text-xs text-slate-500 uppercase">Dispatched Today</div>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-slate-600 opacity-20" />
                </CardContent>
            </Card>
        </div>

        {/* READY TABLE */}
        <Card className="border-slate-200 shadow-sm">
            <div className="p-4 border-b bg-green-50 flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-700" />
                <h3 className="font-semibold text-green-900">Loading Bay (Ready for Dispatch)</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>DN Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Tracking No</TableHead>
                        <TableHead>Packed At</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {readyToShip.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">Bay is empty. Waiting for Packing.</TableCell></TableRow>
                    ) : (
                        readyToShip.map(s => (
                            <TableRow key={s.dn_id}>
                                <TableCell className="font-mono font-medium">{s.dn_id}</TableCell>
                                <TableCell>{s.customer}</TableCell>
                                <TableCell><Badge variant="outline">{s.tracking_no || 'N/A'}</Badge></TableCell>
                                <TableCell className="text-xs text-slate-500">
                                    {s.packed_at ? new Date(s.packed_at).toLocaleTimeString() : '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => setSelectedShipment(s)}
                                    >
                                        Dispatch Truck
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>

        {/* HISTORY TABLE */}
        <Card className="border-slate-200 shadow-sm opacity-80">
            <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-slate-600" />
                <h3 className="font-semibold text-slate-800">Dispatch History</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>DN Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Driver / Plate</TableHead>
                        <TableHead>Dispatched At</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.map(s => (
                        <TableRow key={s.dn_id}>
                            <TableCell className="font-mono text-xs">{s.dn_id}</TableCell>
                            <TableCell>{s.customer}</TableCell>
                            <TableCell className="text-xs">
                                {s.carrier_info?.driver} ({s.carrier_info?.plate})
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                                {s.shipped_at ? new Date(s.shipped_at).toLocaleTimeString() : '-'}
                            </TableCell>
                            <TableCell><Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">SHIPPED</Badge></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>

        {/* DISPATCH DIALOG */}
        <Dialog open={!!selectedShipment} onOpenChange={(open) => !open && setSelectedShipment(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Dispatch</DialogTitle>
                    <DialogDescription>
                        Enter carrier details to release shipment {selectedShipment?.dn_id}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Driver Name</Label>
                        <Input placeholder="e.g. John Doe" value={driverName} onChange={e => setDriverName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Vehicle Plate No.</Label>
                        <Input placeholder="e.g. A-12345" value={plateNo} onChange={e => setPlateNo(e.target.value)} />
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200 flex gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Warning: This action is irreversible. Inventory will be permanently deducted.</span>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedShipment(null)}>Cancel</Button>
                    <Button 
                        className="bg-green-600 hover:bg-green-700 text-white" 
                        onClick={handleDispatch}
                        disabled={isSubmitting || !driverName || !plateNo}
                    >
                        {isSubmitting ? "Processing..." : "Confirm & Sign"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}