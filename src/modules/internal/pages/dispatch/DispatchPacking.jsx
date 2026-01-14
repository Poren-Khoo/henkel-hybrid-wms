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

        <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Packing Station</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">DN Number</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Customer</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Items (At Station)</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                        <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {packingTasks.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Station clear. Waiting for pickers.</TableCell></TableRow>
                    ) : (
                        packingTasks.map(task => (
                            <TableRow key={task.dn_id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                                <TableCell className="font-mono text-xs font-bold text-slate-700">{task.dn_id}</TableCell>
                                <TableCell className="font-medium text-slate-900">{task.customer}</TableCell>
                                <TableCell>
                                    {task.items.map((i, idx) => (
                                        <Badge key={idx} variant="outline" className="mr-1 mb-1 bg-slate-50 text-slate-600 border-slate-200 border rounded-sm">{i.sku}</Badge>
                                    ))}
                                </TableCell>
                                <TableCell><Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 border rounded-sm">Ready to Pack</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-9 px-4 inline-flex items-center gap-2"
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