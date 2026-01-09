import React, { useState } from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../../../../components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Badge } from '../../../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import { 
  Container, Zap, CheckCircle2, History, Factory
} from 'lucide-react'
import { useGlobalUNS } from '../../../../context/UNSContext'
import PageContainer from '../../../../components/PageContainer'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// UNS Topics
const TOPIC_INVENTORY = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"
const TOPIC_ACTION_CONSUME = "Henkelv2/Shanghai/Logistics/Production/Action/Consume_Material"

export default function ProductionConsumption() {
  const { data, publish } = useGlobalUNS()
  const [activeTab, setActiveTab] = useState("ready")
  const [processingId, setProcessingId] = useState(null)

  // 1. Get Live Inventory
  const invData = data.raw[TOPIC_INVENTORY] || { stock_items: [] }
  const allStock = invData.stock_items || []

  // 2. Filter: Only show items physically at the Line Side
  const readyStock = allStock.filter(item => item.status === 'RELEASED_TO_PRODUCTION')
  
  // 3. Handle Consume
  const handleConsume = (batchId, qty, orderId) => {
    setProcessingId(batchId)
    
    publish(TOPIC_ACTION_CONSUME, {
      batch_id: batchId,
      qty_to_consume: qty, // For MVP, we consume the whole batch/pallet
      order_id: orderId, // We need to link this back to the order to update status
      operator: "User_Admin",
      timestamp: Date.now()
    })

    setTimeout(() => setProcessingId(null), 800)
  }

  return (
    <PageContainer 
      title="Consumption" 
      subtitle="Confirm material consumption in production"
      variant="standard"
    >
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_INVENTORY} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ready to Consume</p>
                <h3 className="text-3xl font-bold text-slate-900">{readyStock.length} Batches</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN TABLE */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Factory className="h-5 w-5 text-slate-500" />
              Line-Side Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ready" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="ready">Ready for Consumption ({readyStock.length})</TabsTrigger>
                <TabsTrigger value="history">Consumption History (0)</TabsTrigger>
              </TabsList>

              <TabsContent value="ready">
                <div className="rounded-md border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Inventory ID</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Available Qty</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Location</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                        <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider w-[160px] min-w-[140px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readyStock.length > 0 ? (
                        readyStock.map((item) => (
                          <TableRow key={item.batch_id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                            <TableCell className="font-mono text-xs font-bold text-slate-700">{item.batch_id}</TableCell>
                            <TableCell>
                                <div className="font-medium text-slate-900">{item.desc}</div>
                                <div className="text-xs text-slate-500">{item.sku}</div>
                            </TableCell>
                            <TableCell className="font-bold text-slate-900">{item.qty} kg</TableCell>
                            <TableCell>{item.location}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 border rounded-sm">
                                    {item.status.replace(/_/g, " ")}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap w-[160px] min-w-[140px]">
                                <div className="inline-flex items-center justify-end">
                                  <Button 
                                    className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-9 px-4 inline-flex items-center gap-2"
                                    disabled={processingId === item.batch_id}
                                    onClick={() => handleConsume(item.batch_id, item.qty, item.allocated_to)}
                                  >
                                    {processingId === item.batch_id ? (
                                      "..."
                                    ) : (
                                      <>
                                        <Container className="h-4 w-4" />
                                        Consume
                                      </>
                                    )}
                                  </Button>
                                </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                               <CheckCircle2 className="h-8 w-8 opacity-20" />
                               <p>No inventory at line side. Complete picking first.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="history">
                 <div className="p-12 text-center border border-dashed rounded-md bg-slate-50">
                    <p className="text-slate-500">Consumption logs will be available in Phase 2.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}