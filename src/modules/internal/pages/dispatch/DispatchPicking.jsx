import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Package, ArrowRight, MapPin } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_SHIPMENT_LIST = "Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List"
const TOPIC_ACTION_PICK = "Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Outbound_Pick"

export default function DispatchPicking() {
  const { data, publish } = useGlobalUNS()
  const [processingId, setProcessingId] = useState(null)

  // 1. Get Shipments needing Picking
  const pickingTasks = useMemo(() => {
    const rawData = data.raw[TOPIC_SHIPMENT_LIST]
    const list = rawData?.items || []
    return list.filter(s => s.status === 'READY_TO_PICK')
  }, [data.raw])

  // 2. Handle Pick
  const handleConfirmPick = (dnId) => {
    setProcessingId(dnId)
    publish(TOPIC_ACTION_PICK, {
        dn_id: dnId,
        operator: "Warehouse_User",
        timestamp: Date.now()
    })
    setTimeout(() => setProcessingId(null), 800)
  }

  return (
    <PageContainer title="Outbound Picking" subtitle="Pick allocated stock for dispatch">
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_SHIPMENT_LIST} />

        <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Picking Queue</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">DN Number</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Destination</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Items to Pick</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Source Bin</TableHead>
                        <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pickingTasks.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No tasks pending.</TableCell></TableRow>
                    ) : (
                        pickingTasks.map(task => (
                            <TableRow key={task.dn_id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                                <TableCell className="font-mono text-xs font-bold text-slate-700">{task.dn_id}</TableCell>
                                <TableCell className="font-medium text-slate-900">{task.destination}</TableCell>
                                <TableCell>
                                    {task.items.map((i, idx) => (
                                        <div key={idx} className="text-sm font-medium">
                                            {i.sku} <span className="text-slate-500">x {i.qty}</span>
                                        </div>
                                    ))}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 text-slate-600">
                                        <MapPin className="h-4 w-4 text-slate-400" /> FG-ZONE-01
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-9 px-4 inline-flex items-center gap-2"
                                        disabled={processingId === task.dn_id}
                                        onClick={() => handleConfirmPick(task.dn_id)}
                                    >
                                        {processingId === task.dn_id ? "Moving..." : "Confirm Pick"}
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