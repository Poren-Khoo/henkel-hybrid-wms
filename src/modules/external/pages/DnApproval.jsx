import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Sheet, SheetHeader, SheetTitle, SheetContent, SheetFooter } from '../../../components/ui/sheet'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { CheckCircle, XCircle, Truck, Package, Clock, AlertCircle } from 'lucide-react'

const headerClass = "text-xs uppercase text-slate-500 font-semibold"

// MQTT Topics
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/Costing/Action/Review_DN"

export default function DnApproval() {
  // Get data from Global UNS Context
  const { data, publish } = useGlobalUNS()
  const [selectedDN, setSelectedDN] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  // Access data from dns bucket
  const allDNs = Array.isArray(data.dns) ? data.dns : []

  // Approver Queue: Show PENDING_APPROVAL
  const approverQueueDNs = allDNs.filter(dn => {
    const status = dn.status || dn.workflow_status || ''
    return status === 'PENDING_APPROVAL'
  })

  const handleApprove = () => {
    if (!selectedDN) return

    const dnNo = selectedDN.dn_no || selectedDN.id || selectedDN.dnNumber

    // Publish approve action to Node-RED
    publish(TOPIC_ACTION, {
      dn_no: dnNo,
      action: 'APPROVE',
    })

    // Close sheet
    setSelectedDN(null)
    setShowRejectDialog(false)
    setRejectReason('')
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please enter a reject reason')
      return
    }

    if (!selectedDN) return

    const dnNo = selectedDN.dn_no || selectedDN.id || selectedDN.dnNumber

    // Publish reject action to Node-RED
    publish(TOPIC_ACTION, {
      dn_no: dnNo,
      action: 'REJECT',
      reason: rejectReason,
    })

    // Close sheet
    setSelectedDN(null)
    setRejectReason('')
    setShowRejectDialog(false)
  }

  const openCostReviewSheet = (dn) => {
    setSelectedDN(dn)
    setShowRejectDialog(false)
    setRejectReason('')
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">DN Approval Queue</h1>
          <p className="text-slate-500">Review and approve calculated costs based on active Rate Cards.</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {approverQueueDNs.length} Pending
        </Badge>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={headerClass}>DN Number</TableHead>
                <TableHead className={headerClass}>Destination</TableHead>
                <TableHead className={headerClass}>Total Cost</TableHead>
                <TableHead className={headerClass}>Submitted By</TableHead>
                <TableHead className={headerClass}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approverQueueDNs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-12">
                    <div className="flex flex-col items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-slate-200 mb-2" />
                        <p>All caught up! No DNs pending approval.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                approverQueueDNs.map((dn, index) => {
                  const dnNo = dn.dn_no || dn.id || dn.dnNumber || `DN-${index}`
                  const totalCost = dn.total_cost || dn.totalCost || 0
                  const submittedBy = dn.submitted_by || dn.submittedBy || 'System (Auto)'
                  return (
                    <TableRow 
                      key={dnNo}
                      className="bg-white border-b hover:bg-slate-50"
                    >
                      <TableCell className="font-mono font-medium text-slate-900">{dnNo}</TableCell>
                      <TableCell className="text-slate-700">{dn.destination}</TableCell>
                      <TableCell className="text-slate-900 font-bold text-lg">
                        ¥{Number(totalCost).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-slate-700">{submittedBy}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() => openCostReviewSheet(dn)}
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          Review Cost
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cost Review Sheet */}
      <Sheet open={!!selectedDN} onOpenChange={(open) => {
        if (!open) {
          setSelectedDN(null)
          setShowRejectDialog(false)
          setRejectReason('')
        }
      }}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          {selectedDN && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>Cost Review: {selectedDN.dn_no}</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6">
                
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-500 uppercase font-semibold">Destination</span>
                        <div className="font-medium text-slate-900">{selectedDN.destination}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-500 uppercase font-semibold">Qty</span>
                        <div className="font-medium text-slate-900">{selectedDN.qty || 0} Units</div>
                    </div>
                </div>

                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Cost Breakdown</h3>
                  <div className="space-y-4">
                    
                    {/* 1. INBOUND */}
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-md">
                                <Truck size={18} />
                            </div>
                            <div>
                                <div className="font-medium text-slate-900">Inbound (入库)</div>
                                <div className="text-xs text-slate-500">
                                    {/* Safe Access to Breakdown Data */}
                                    {selectedDN.qty} Units × ¥{Number(selectedDN.breakdown?.inbound_unit_price || 0).toFixed(2)}
                                </div>
                            </div>
                        </div>
                        <div className="font-mono font-semibold text-slate-900">
                            ¥{Number(selectedDN.breakdown?.inbound_total || 0).toFixed(2)}
                        </div>
                    </div>

                    {/* 2. OUTBOUND */}
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-md">
                                <Package size={18} />
                            </div>
                            <div>
                                <div className="font-medium text-slate-900">Outbound (出库)</div>
                                <div className="text-xs text-slate-500">
                                    {selectedDN.qty} Units × ¥{Number(selectedDN.breakdown?.outbound_unit_price || 0).toFixed(2)}
                                </div>
                            </div>
                        </div>
                        <div className="font-mono font-semibold text-slate-900">
                            ¥{Number(selectedDN.breakdown?.outbound_total || 0).toFixed(2)}
                        </div>
                    </div>

                    {/* 3. STORAGE */}
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-md">
                                <Clock size={18} />
                            </div>
                            <div>
                                <div className="font-medium text-slate-900">Storage (仓储)</div>
                                <div className="text-xs text-slate-500">
                                    {selectedDN.qty} Units × {selectedDN.breakdown?.storage_days || 10} Days × ¥{Number(selectedDN.breakdown?.storage_unit_price || 0).toFixed(2)}
                                </div>
                            </div>
                        </div>
                        <div className="font-mono font-semibold text-slate-900">
                            ¥{Number(selectedDN.breakdown?.storage_total || 0).toFixed(2)}
                        </div>
                    </div>

                    {/* TOTALS SECTION */}
                    <div className="pt-2">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-500">Basic Cost Total:</span>
                            <span className="font-mono text-slate-700">¥{Number(selectedDN.basic_cost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-500">VAS Cost:</span>
                            <span className="font-mono text-slate-700">¥{Number(selectedDN.vas_cost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg pt-3 border-t border-slate-200">
                            <span className="font-bold text-slate-900">Total Billable:</span>
                            <span className="font-bold text-henkel-red text-xl">¥{Number(selectedDN.total_cost).toFixed(2)}</span>
                        </div>
                    </div>

                  </div>
                </div>

                {/* Reject Dialog */}
                {showRejectDialog && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2 mb-2 text-red-700 font-semibold">
                        <AlertCircle size={16} />
                        Reject Reason
                    </div>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full h-24 rounded-md border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Enter reason for rejection (e.g. Rate Card mismatch)..."
                    />
                  </div>
                )}
              </div>

              <SheetFooter className="mt-6 flex-col sm:flex-col gap-3">
                {!showRejectDialog ? (
                    <>
                        <Button 
                            onClick={handleApprove}
                            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-lg shadow-sm"
                        >
                            <CheckCircle className="mr-2 h-5 w-5" /> Approve & Bill
                        </Button>
                        <Button 
                            onClick={() => setShowRejectDialog(true)}
                            variant="ghost"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            Dispute / Reject
                        </Button>
                    </>
                ) : (
                    <div className="flex gap-3 w-full">
                        <Button 
                            onClick={() => setShowRejectDialog(false)}
                            variant="outline"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleReject}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                            Confirm Reject
                        </Button>
                    </div>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}