import React, { useState, useEffect } from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../../../components/ui/table'
import { Card, CardContent } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { 
  AlertTriangle, Trash2, RotateCcw, CheckCircle2, Search, Filter, Box
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
  
  // DEBUG LOGIC (Preserved)
  useEffect(() => {
    // console.log("📍 [QC Disposition] Component Mounted.");
  }, []);

  // 1. Get Live Data (Preserved)
  const queueData = data.raw[TOPIC_DISPO_QUEUE] || { items: [] }
  const items = queueData.items || []

  // 2. Handle Action (Preserved Logic)
  const handleDisposition = (batchId, actionType) => {
    setProcessingId(batchId)

    const payload = {
      batch_id: batchId,
      action: actionType, // "SCRAP", "RETURN", "REWORK"
      approver: "Manager_Selene",
      timestamp: Date.now()
    }

    publish(TOPIC_ACTION, payload)

    setTimeout(() => {
      setProcessingId(null)
    }, 800)
  }

  // Helper
  const getReasonBadge = () => {
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-sm">QC FAILED</Badge>
  }

  return (
    <PageContainer 
      title="Disposition" 
      subtitle="Manage disposition of QC failed items (Scrap, Return, Rework)"
      variant="standard"
    >
      <div className="space-y-4">
        
        {/* CONNECTION STATUS */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <UNSConnectionInfo topic={TOPIC_DISPO_QUEUE} />
        </div>

        {/* SUMMARY CARDS (Clean Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Review</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">{items.length}</h3>
              </div>
              <div className="h-10 w-10 rounded-md bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
           <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scrap Value (Est.)</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">¥ 12,450</h3>
              </div>
              <div className="h-10 w-10 rounded-md bg-slate-50 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-slate-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search Batch ID..." 
                    className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
            </div>
            <Button variant="outline" className="h-9 text-xs border-slate-200 text-slate-600 hover:bg-slate-50">
               <Filter className="h-3.5 w-3.5 mr-2" /> Filter
            </Button>
        </div>
        
        {/* DATA TABLE */}
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">QC ID / Batch</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Supplier</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Reason / Notes</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.batch_id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                    <TableCell className="font-mono font-bold text-slate-700 text-xs">
                      {item.batch_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-sm">{item.sku}</span>
                        <span className="text-xs text-slate-500 mt-0.5">{item.desc}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{item.supplier}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-col gap-1">
                        {getReasonBadge()}
                        <span className="text-[10px] text-slate-500 truncate" title={item.lab_data?.notes}>
                          {item.lab_data?.notes || "No notes provided"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-sm">
                        PENDING REVIEW
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap w-[200px] min-w-[180px]">
                      <div className="flex justify-end gap-2">
                        <Button 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-8 px-3 text-xs inline-flex items-center gap-1.5 rounded-md font-semibold"
                          disabled={processingId === item.batch_id}
                          onClick={() => handleDisposition(item.batch_id, "RETURN")}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {processingId === item.batch_id ? "..." : "Return"}
                        </Button>
                        <Button 
                          className="bg-red-600 hover:bg-red-700 text-white shadow-sm h-8 px-3 text-xs inline-flex items-center gap-1.5 rounded-md font-semibold"
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
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-slate-600">All Clear</p>
                            <p className="text-xs text-slate-400">No items pending disposition.</p>
                        </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PageContainer>
  )
}