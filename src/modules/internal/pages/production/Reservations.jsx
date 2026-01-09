import React, { useState, useEffect } from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../../../../components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Badge } from '../../../../components/ui/badge'
import { Input } from '../../../../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import { 
  Bookmark, 
  Search, 
  Lock, 
  RotateCw, 
  AlertTriangle, 
  CheckCircle2 
} from 'lucide-react'
import { useGlobalUNS } from '../../../../context/UNSContext'
import PageContainer from '../../../../components/PageContainer'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// UNS Topics
const TOPIC_RESERVATIONS = "Henkelv2/Shanghai/Logistics/Production/State/Reservation_List"
const TOPIC_ACTION_ALLOCATE = "Henkelv2/Shanghai/Logistics/Production/Action/Run_Allocation"

export default function Reservations() {
  const { data, publish } = useGlobalUNS()
  const [activeTab, setActiveTab] = useState("reservations")
  const [processingId, setProcessingId] = useState(null)

  // 1. Get Live Data
  const resData = data.raw[TOPIC_RESERVATIONS] || { items: [] }
  const reservations = Array.isArray(resData.items) ? resData.items : []

  // Debug: Log reservations array
  useEffect(() => {
    console.log("📊 [Reservations UI] Full List:", reservations);
  }, [reservations]);

  // 2. Handle Allocation Run
  const handleAllocate = (resId) => {
    setProcessingId(resId)
    
    // Trigger the FEFO Engine in Node-RED
    publish(TOPIC_ACTION_ALLOCATE, {
      reservation_id: resId,
      triggered_by: "User_Admin",
      timestamp: Date.now()
    })

    // Reset loading state after 1s (Simulated response time)
    setTimeout(() => setProcessingId(null), 1000)
  }

  // Helper for Status Badge
  const getStatusBadge = (status) => {
    switch(status) {
      case 'OPEN': return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm">OPEN</Badge>
      case 'PARTIAL': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 border rounded-sm">PARTIAL</Badge>
      case 'ALLOCATED': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 border rounded-sm">ALLOCATED</Badge>
      default: return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm">{status}</Badge>
    }
  }

  return (
    <PageContainer 
      title="Reservations & Allocation" 
      subtitle="Reserve materials and allocate inventory with FEFO/FIFO"
      variant="standard"
    >
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_RESERVATIONS} />

        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bookmark className="h-5 w-5 text-slate-500" />
                Material Demand
              </CardTitle>
              <div className="flex gap-2">
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search Order..." className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors w-64" />
                 </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="reservations" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="reservations">Reservations</TabsTrigger>
                <TabsTrigger value="allocations">Allocated Inventory</TabsTrigger>
              </TabsList>

              <TabsContent value="reservations">
                <div className="rounded-md border border-slate-200">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Reservation ID</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Production Order</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Required</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Allocated</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                        <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider w-[200px] min-w-[180px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations.length > 0 ? (
                        reservations.map((res) => {
                          console.log("Rendering Row:", res.reservation_id);
                          return (
                          <TableRow key={res.reservation_id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                            <TableCell className="font-mono text-xs font-bold text-slate-700">{res.reservation_id}</TableCell>
                            <TableCell className="font-medium text-slate-900">{res.order_id}</TableCell>
                            <TableCell>
                                <div>
                                    <div className="font-medium text-slate-900">{res.material_name}</div>
                                    <div className="text-xs text-slate-500">{res.material_code}</div>
                                </div>
                            </TableCell>
                            <TableCell>{res.qty_required} kg</TableCell>
                            <TableCell className={res.qty_allocated < res.qty_required ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                                {res.qty_allocated || 0} kg
                            </TableCell>
                            <TableCell>{getStatusBadge(res.status)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap w-[200px] min-w-[180px]">
                              {res.status !== 'ALLOCATED' ? (
                                <div className="inline-flex items-center justify-end">
                                  <Button 
                                    size="sm" 
                                    className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-9 px-4 inline-flex items-center gap-2"
                                    disabled={processingId === res.reservation_id}
                                    onClick={() => handleAllocate(res.reservation_id)}
                                  >
                                    {processingId === res.reservation_id ? (
                                       <RotateCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                       <Lock className="h-4 w-4" />
                                    )}
                                    Run Allocation
                                  </Button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center justify-end">
                                  <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" /> Locked
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                            No active reservations. Create one from Production Orders.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="allocations">
                <div className="p-8 text-center text-slate-500 border border-dashed rounded-md">
                    Select a reservation to view detailed allocation breakdown (Batch-level FEFO).
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}