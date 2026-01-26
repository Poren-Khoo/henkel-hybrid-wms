import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Sheet, SheetHeader, SheetTitle, SheetContent } from '../../../components/ui/sheet'
import { Truck, PackageCheck, ClipboardCheck, CheckCircle2 } from 'lucide-react' // Added Icons
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import PageContainer from '../../../components/PageContainer'


// TOPIC 1: LISTENING (State)
const TOPIC_SYNC_STATUS = "Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status"

// TOPIC 2: SPEAKING (Action) - Matches your Node-RED Listener
const TOPIC_UPDATE_ACTION = "Henkelv2/Shanghai/Logistics/External/Integration/Action/Update_Status"

export default function InboundASN() {
  // 1. Get 'publish' and 'status' from Context
  const { data, publish, status } = useGlobalUNS()
  
  const [selectedASN, setSelectedASN] = useState(null)
  const [currentStatus, setCurrentStatus] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Sync currentStatus with selectedASN status
  useEffect(() => {
    if (selectedASN) {
      setCurrentStatus(selectedASN.status)
    }
  }, [selectedASN])

  // Get sync records from UNS
  const syncData = data.raw[TOPIC_SYNC_STATUS] || {}
  const syncRecords = syncData?.sync_records || []

  // Filter for INBOUND/ASN records
  const asns = useMemo(() => {
    return syncRecords
      .filter(record => {
        const type = (record.type || '').toUpperCase()
        return type.includes('INBOUND') || type.includes('ASN')
      })
      .map(record => ({
        id: record.ref_no || record.id || 'UNKNOWN',
        vendor: record.provider || record['3pl_provider'] || 'Unknown Provider',
        expectedDate: record.expected_date || (record.timestamp ? new Date(record.timestamp).toLocaleDateString() : 'N/A'),
        sku: record.sku || 'N/A',
        qty_expected: record.qty_expected || record.qty || 0,
        qty_received: record.qty_received || 0,
        status: record.sync_status || record.status || 'PENDING',
        created_at: record.timestamp || record.created_at || new Date().toISOString(),
        _original: record
      }))
  }, [syncRecords])

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase()
    if (s === 'NEW' || s === 'PENDING') return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 border rounded-sm uppercase text-[10px] px-2">PENDING</Badge>
    if (s === 'ARRIVED') return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 border rounded-sm uppercase text-[10px] px-2">ARRIVED</Badge>
    if (s === 'RECEIVING') return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 border rounded-sm uppercase text-[10px] px-2">RECEIVING</Badge>
    if (s === 'CLOSED' || s === 'COMPLETED') return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 border rounded-sm uppercase text-[10px] px-2">CLOSED</Badge>
    return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm uppercase text-[10px] px-2">{status}</Badge>
  }

  // --- THE REAL-TIME ACTION HANDLER ---
  const sendStatusUpdate = (newStatus) => {
    if (!selectedASN) return

    // 1. Construct Payload
    const actionPayload = {
      ref_no: selectedASN.id,
      new_status: newStatus,
      timestamp: Date.now()
    }

    // 2. Publish to Node-RED
    console.log("Sending Inbound Action:", actionPayload)
    publish(TOPIC_UPDATE_ACTION, actionPayload)

    // 3. Optimistic Update (Instant Feedback)
    setCurrentStatus(newStatus)
    if (selectedASN) {
        setSelectedASN({ ...selectedASN, status: newStatus })
    }
    
    setToastMessage(`Workflow Updated: ${newStatus}`)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // --- Simplified Handlers ---
  const handleConfirmArrival = () => sendStatusUpdate('ARRIVED')
  const handleStartReceiving = () => sendStatusUpdate('RECEIVING')
  const handleFinishPutaway = () => sendStatusUpdate('CLOSED')

  // --- Filter Logic ---
  const filteredASNs = useMemo(() => {
    return asns.filter(asn => {
      const matchesSearch = (asn.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (asn.vendor || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'ALL' || (asn.status || '').toUpperCase() === statusFilter.toUpperCase()
      return matchesSearch && matchesStatus
    })
  }, [asns, searchTerm, statusFilter])

  // --- Visual Stepper for Inbound ---
  const getProgressSteps = () => {
    const status = (currentStatus || selectedASN?.status || '').toUpperCase()
    const steps = [
      { label: 'PENDING', status: 'completed' }, // Always start here
      { label: 'ARRIVED', status: 'pending' },
      { label: 'RECEIVING', status: 'pending' },
      { label: 'CLOSED', status: 'pending' },
    ]

    if (status === 'NEW' || status === 'PENDING') {
        steps[0].status = 'active'
    } else if (status === 'ARRIVED') {
        steps[0].status = 'completed'
        steps[1].status = 'active'
    } else if (status === 'RECEIVING') {
        steps[0].status = 'completed'
        steps[1].status = 'completed'
        steps[2].status = 'active'
    } else if (status === 'CLOSED' || status === 'COMPLETED') {
        steps.forEach(s => s.status = 'completed')
    }
    return steps
  }

  return (
    <PageContainer title="Inbound ASN Management" variant="standard">
      <div className="space-y-4">
        {/* Toast Notification */}
        {toastMessage && (
          <Card className="bg-white border border-emerald-200 shadow-sm">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600"/> 
                <p className="text-sm font-medium text-emerald-800">{toastMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <UNSConnectionInfo topic={TOPIC_SYNC_STATUS} />

        {/* Filter Bar */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="Search ASN ID or Vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-9 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus:bg-white transition-colors"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus:bg-white transition-colors"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">PENDING</option>
                <option value="ARRIVED">ARRIVED</option>
                <option value="RECEIVING">RECEIVING</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* ASN Table */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg font-bold text-slate-900">Inbound ASN Management</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">ASN Number</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Supplier/Provider</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Expected Date</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">SKU</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Qty Expected</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Qty Received</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {status !== 'CONNECTED' ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <span className="animate-spin">⏳</span> Connecting to Logistics Grid...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredASNs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      {asns.length === 0 ? 'No live inbound records found. (Simulate in Node-RED)' : 'No records match your filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredASNs.map((asn) => (
                    <TableRow 
                      key={asn.id} 
                      className="bg-white border-b border-slate-100 hover:bg-slate-50 cursor-pointer last:border-0 transition-colors"
                      onClick={() => setSelectedASN(asn)}
                    >
                      <TableCell className="font-mono text-xs font-bold text-slate-700">{asn.id}</TableCell>
                      <TableCell className="text-slate-700 font-medium">{asn.vendor}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{asn.expectedDate}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{asn.sku}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{asn.qty_expected}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{asn.qty_received}</TableCell>
                      <TableCell>{getStatusBadge(asn.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedASN} onOpenChange={(open) => !open && setSelectedASN(null)}>
        {selectedASN && (
          <SheetContent>
            <SheetHeader>
              <SheetTitle>ASN Details: {selectedASN.id}</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 mt-6">
               {/* Info Grid */}
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Vendor</p>
                    <p className="text-sm font-medium text-slate-900">{selectedASN.vendor}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">SKU</p>
                    <p className="text-sm font-medium text-slate-900">{selectedASN.sku}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Qty Expected</p>
                    <p className="text-sm font-medium text-slate-900">{selectedASN.qty_expected}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Status</p>
                    <div className="mt-1">{getStatusBadge(currentStatus || selectedASN.status)}</div>
                  </div>
               </div>

                {/* Workflow Progress (Stepper) */}
                <div className="py-4">
                    <p className="text-sm font-semibold text-slate-700 mb-4">Receiving Progress</p>
                    <div className="flex items-center space-x-1">
                        {getProgressSteps().map((step, index) => (
                            <div key={index} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                    <div className={`
                                        w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                                        ${step.status === 'completed' ? 'bg-[#a3e635] text-slate-900' : ''}
                                        ${step.status === 'active' ? 'bg-[#a3e635] text-slate-900 ring-4 ring-[#a3e635]/20' : ''}
                                        ${step.status === 'pending' ? 'bg-slate-100 text-slate-400' : ''}
                                    `}>
                                        {step.status === 'completed' ? '✓' : index + 1}
                                    </div>
                                    <span className={`text-[10px] mt-1 text-center font-medium ${step.status === 'active' ? 'text-[#a3e635]' : 'text-slate-500'}`}>
                                        {step.label}
                                    </span>
                                </div>
                                {index < getProgressSteps().length - 1 && (
                                    <div className={`h-0.5 flex-1 mx-0.5 ${step.status === 'completed' ? 'bg-[#a3e635]' : 'bg-slate-200'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

               {/* Workflow Actions */}
               <div className="pt-4 border-t border-slate-200">
                 <Card className="border border-slate-200 shadow-sm bg-slate-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">Workflow Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const status = (currentStatus || selectedASN.status || '').toUpperCase()
                            if (status === 'NEW' || status === 'PENDING') {
                                return (
                                <Button onClick={handleConfirmArrival} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                                    <Truck className="h-4 w-4" /> Confirm Arrival
                                </Button>
                                )
                            }
                            if (status === 'ARRIVED') {
                                return (
                                <Button onClick={handleStartReceiving} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4" /> Start Receiving
                                </Button>
                                )
                            }
                            if (status === 'RECEIVING') {
                                return (
                                <Button onClick={handleFinishPutaway} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                                    <PackageCheck className="h-4 w-4" /> Finish Putaway
                                </Button>
                                )
                            }
                            if (status === 'CLOSED' || status === 'COMPLETED') {
                                return (
                                <div className="text-center py-2 text-sm text-slate-500 bg-white rounded border border-slate-100">
                                    Inbound Process Completed.
                                </div>
                                )
                            }
                            return null
                        })()}
                    </CardContent>
                 </Card>
               </div>
            </div>
          </SheetContent>
        )}
      </Sheet>
      </div>
    </PageContainer>
  )
}