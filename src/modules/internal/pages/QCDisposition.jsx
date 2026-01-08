import React, { useState, useEffect } from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../../../components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { 
  AlertTriangle, Trash2, RotateCcw, CheckCircle2, Search, Filter 
} from 'lucide-react'
import { Input } from '../../../components/ui/input'
import { useGlobalUNS } from '../../../context/UNSContext'
import PageContainer from '../../../components/PageContainer'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'

// UNS Topics
const TOPIC_DISPO_QUEUE = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Disposition_Queue"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Execute_Disposition"

export default function QCDisposition() {
  const { data, publish } = useGlobalUNS()
  const [processingId, setProcessingId] = useState(null)
  
  // --- DEBUGGING LOGS START ---
  useEffect(() => {
    console.log("📍 [QC Disposition] Component Mounted.");
    console.log("🔍 [QC Disposition] Listening to topic:", TOPIC_DISPO_QUEUE);
    console.log("📦 [QC Disposition] Current Raw Data in Context:", data.raw);
  }, []);

  useEffect(() => {
    if (data.raw[TOPIC_DISPO_QUEUE]) {
        console.log("✅ [QC Disposition] DATA RECEIVED!", data.raw[TOPIC_DISPO_QUEUE]);
    } else {
        console.log("⚠️ [QC Disposition] Waiting for data... (Topic is empty in Context)");
    }
  }, [data.raw]);
  // --- DEBUGGING LOGS END ---

  // 1. Get Live Data
  const queueData = data.raw[TOPIC_DISPO_QUEUE] || { items: [] }
  const items = queueData.items || []

  // 2. Handle Action (Scrap/Return/Rework)
  const handleDisposition = (batchId, actionType) => {
    console.log(`🖱️ [QC Disposition] Button Clicked: ${actionType} for Batch ${batchId}`);
    setProcessingId(batchId)

    const payload = {
      batch_id: batchId,
      action: actionType, // "SCRAP", "RETURN", "REWORK"
      approver: "Manager_Selene",
      timestamp: Date.now()
    }

    console.log("📤 [QC Disposition] Publishing Action Payload:", payload);
    publish(TOPIC_ACTION, payload)

    // Clear loading state after delay
    setTimeout(() => {
      setProcessingId(null)
    }, 800)
  }

  const getReasonBadge = (notes) => {
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">QC FAILED</Badge>
  }

  return (
    <PageContainer 
      title="Disposition" 
      subtitle="Manage disposition of QC failed items (Scrap, Return, Rework)"
      variant="standard"
    >
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_DISPO_QUEUE} />

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-red-500 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Pending Review</p>
                <h3 className="text-2xl font-bold text-slate-900">{items.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
           <Card className="border-l-4 border-l-slate-500 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Scrap Value (Est.)</p>
                <h3 className="text-2xl font-bold text-slate-900">¥ 12,450</h3>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-slate-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN TABLE CARD */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-base font-semibold text-slate-900">Pending Disposition</CardTitle>
              </div>
              
              <div className="flex gap-2">
                <div className="relative">
                   <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                   <Input placeholder="Search batch..." className="pl-8 h-9 w-48 text-xs bg-white" />
                </div>
                <Button 
                  variant="outline" 
                  className="h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 inline-flex items-center gap-2 rounded-md font-medium"
                >
                  <Filter className="h-3.5 w-3.5" /> 
                  Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <div className="rounded-md">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[120px]">QC ID</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Reason / Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[200px] min-w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.batch_id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono font-medium text-slate-700">
                        {item.batch_id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{item.sku}</span>
                          <span className="text-xs text-slate-500">{item.desc}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.supplier}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-col gap-1">
                          {getReasonBadge()}
                          <span className="text-xs text-slate-500 truncate" title={item.lab_data?.notes}>
                            {item.lab_data?.notes || "No notes provided"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-100">
                          PENDING APPROVAL
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap w-[200px] min-w-[180px]">
                        <div className="flex justify-end gap-2">
                          <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-8 px-4 inline-flex items-center gap-2 rounded-md"
                            disabled={processingId === item.batch_id}
                            onClick={() => handleDisposition(item.batch_id, "RETURN")}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            {processingId === item.batch_id ? "..." : "Return"}
                          </Button>
                          <Button 
                            className="bg-red-600 hover:bg-red-700 text-white shadow-sm h-8 px-4 inline-flex items-center gap-2 rounded-md"
                            disabled={processingId === item.batch_id}
                            onClick={() => handleDisposition(item.batch_id, "SCRAP")}
                          >
                            {processingId === item.batch_id ? "..." : (
                              <>
                                <Trash2 className="h-3.5 w-3.5" />
                                Scrap
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                         <CheckCircle2 className="h-10 w-10 mb-3 text-green-100" />
                         <p className="font-medium text-slate-500">All Clear</p>
                         <p className="text-xs">No items pending disposition.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}