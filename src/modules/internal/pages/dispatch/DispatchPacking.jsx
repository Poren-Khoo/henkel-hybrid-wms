import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Package, Printer, CheckCircle } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_SHIPMENT_LIST = "Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List"
const TOPIC_ACTION_PACK = "Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Pack"

export default function DispatchPacking() {
  const { data, publish } = useGlobalUNS()
  const [processingId, setProcessingId] = useState(null)

  // 1. Get Shipments needing Packing
  const packingTasks = useMemo(() => {
    const rawData = data.raw[TOPIC_SHIPMENT_LIST]
    const list = rawData?.items || []
    return list.filter(s => s.status === 'PICKED')
  }, [data.raw])

  // 2. Handle Pack
  const handleConfirmPack = (dnId) => {
    setProcessingId(dnId)
    publish(TOPIC_ACTION_PACK, {
        dn_id: dnId,
        packer: "Packer_01",
        timestamp: Date.now()
    })
    setTimeout(() => setProcessingId(null), 800)
  }

  return (
    <PageContainer title="Outbound Packing" subtitle="Pack items and generate shipping labels">
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_SHIPMENT_LIST} />

        <Card className="border-slate-200 shadow-sm">
            <div className="p-4 border-b bg-slate-50 flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-slate-800">Packing Station</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>DN Number</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items (At Station)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {packingTasks.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Station clear. Waiting for pickers.</TableCell></TableRow>
                    ) : (
                        packingTasks.map(task => (
                            <TableRow key={task.dn_id}>
                                <TableCell className="font-mono font-medium text-blue-600">{task.dn_id}</TableCell>
                                <TableCell>{task.customer}</TableCell>
                                <TableCell>
                                    {task.items.map((i, idx) => (
                                        <Badge key={idx} variant="secondary" className="mr-1">{i.sku}</Badge>
                                    ))}
                                </TableCell>
                                <TableCell><Badge className="bg-orange-100 text-orange-700">Ready to Pack</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        size="sm" 
                                        className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                                        disabled={processingId === task.dn_id}
                                        onClick={() => handleConfirmPack(task.dn_id)}
                                    >
                                        <Printer className="h-4 w-4" />
                                        {processingId === task.dn_id ? "Printing..." : "Pack & Label"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>
      </div>
    </PageContainer>
  )
}