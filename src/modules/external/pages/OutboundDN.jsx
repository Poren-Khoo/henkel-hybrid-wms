import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Sheet, SheetHeader, SheetTitle, SheetContent } from '../../../components/ui/sheet'
import { Input } from '../../../components/ui/input'
import { ClipboardCheck, Box, ArrowRight, Truck, CheckCircle2 } from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import PageContainer from '../../../components/PageContainer'


// TOPIC 1: LISTENING (State)
const TOPIC_SYNC_STATUS = "Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status"

// TOPIC 2: SPEAKING (Action) - Matches your Node-RED Listener
const TOPIC_UPDATE_ACTION = "Henkelv2/Shanghai/Logistics/External/Integration/Action/Update_Status"

export default function OutboundDN() {
  // 1. Get 'publish' from Context to talk to Node-RED
  const { data, publish } = useGlobalUNS()
  
  const [selectedDN, setSelectedDN] = useState(null)
  const [currentStatus, setCurrentStatus] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  // Sync currentStatus with selectedDN status
  useEffect(() => {
    if (selectedDN) {
      setCurrentStatus(selectedDN.status)
    }
  }, [selectedDN])

  // Get sync records from UNS
  const syncData = data.raw[TOPIC_SYNC_STATUS] || {}
  const syncRecords = syncData?.sync_records || []

  // Filter for OUTBOUND/DN records
  const dns = useMemo(() => {
    return syncRecords
      .filter(record => {
        const type = (record.type || '').toUpperCase()
        return type.includes('OUTBOUND') || type.includes('DN')
      })
      .map(record => ({
        id: record.ref_no || record.id || 'UNKNOWN',
        customer: record.customer || record['3pl_provider'] || 'Unknown Customer',
        destination: record.destination || record['3pl_provider'] || 'Unknown Destination',
        orderDate: record.order_date || record.timestamp ? new Date(record.timestamp || record.order_date).toLocaleDateString() : 'N/A',
        requestedShipDate: record.requested_ship_date || record.expected_date || 'N/A',
        // No localStorage check needed anymore - we trust the Live UNS Data
        status: record.sync_status || record.status || 'PENDING',
        carrier: record.carrier || '',
        trackingNumber: record.tracking_number || '',
        _original: record
      }))
  }, [syncRecords])

  const getStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase() || ''
    if (statusUpper === 'NEW') return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 border rounded-sm uppercase text-[10px] px-2">NEW</Badge>
    if (statusUpper === 'PICKING') return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 border rounded-sm uppercase text-[10px] px-2">PICKING</Badge>
    if (statusUpper === 'PACKING') return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 border rounded-sm uppercase text-[10px] px-2">PACKING</Badge>
    if (statusUpper === 'READY_TO_SHIP') return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 border rounded-sm uppercase text-[10px] px-2">READY TO SHIP</Badge>
    if (statusUpper === 'SHIPPED') return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm uppercase text-[10px] px-2">SHIPPED</Badge>
    return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm uppercase text-[10px] px-2">{status}</Badge>
  }

  // --- THE NEW REAL-TIME ACTION HANDLER ---
  const sendStatusUpdate = (newStatus) => {
    if (!selectedDN) return

    // 1. Construct Object Payload (NOT an Array)
    const actionPayload = {
      ref_no: selectedDN.id,
      new_status: newStatus,
      timestamp: Date.now()
    }

    // 2. Publish to Node-RED
    console.log("Sending Action:", actionPayload)
    publish(TOPIC_UPDATE_ACTION, actionPayload)

    // 3. Optimistic Update (Update UI instantly while waiting for Node-RED)
    setCurrentStatus(newStatus)
    if (selectedDN) {
        setSelectedDN({ ...selectedDN, status: newStatus })
    }
    
    setToastMessage(`Signal Sent: ${newStatus}`)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // --- Button Handlers (Simplified) ---
  const handleReleaseToPicking = () => sendStatusUpdate('PICKING')
  const handleConfirmPacking = () => sendStatusUpdate('PACKING')
  const handleReadyToShip = () => sendStatusUpdate('READY_TO_SHIP')

  const handleConfirmShipment = () => {
    if (!carrier.trim() || !trackingNumber.trim()) {
      alert('Please enter both Carrier and Tracking Number')
      return
    }
    // For shipment, we are just sending status for this demo. 
    // In a real app, you would add carrier info to the payload here.
    sendStatusUpdate('SHIPPED')
    
    setCarrier('')
    setTrackingNumber('')
  }

  const openDetailSheet = (dn) => {
    setSelectedDN(dn)
    setCarrier(dn.carrier || '')
    setTrackingNumber(dn.trackingNumber || '')
  }

  const getProgressSteps = () => {
    if (!selectedDN) return []
    const status = (currentStatus || selectedDN.status || '').toUpperCase()
    const steps = [
      { label: 'NEW', status: 'completed' },
      { label: 'PICKING', status: 'pending' },
      { label: 'PACKING', status: 'pending' },
      { label: 'READY TO SHIP', status: 'pending' },
      { label: 'SHIPPED', status: 'pending' },
    ]

    if (status === 'NEW' || status === 'PENDING') {
      steps[0].status = 'active'
    } else if (status === 'PICKING') {
      steps[0].status = 'completed'
      steps[1].status = 'active'
    } else if (status === 'PACKING') {
      steps[0].status = 'completed'
      steps[1].status = 'completed'
      steps[2].status = 'active'
    } else if (status === 'READY_TO_SHIP') {
      steps[0].status = 'completed'
      steps[1].status = 'completed'
      steps[2].status = 'completed'
      steps[3].status = 'active'
    } else if (status === 'SHIPPED') {
      steps.forEach(step => step.status = 'completed')
    }

    return steps
  }

  return (
    <PageContainer title="Outbound DN - Logistics View" variant="standard">
      <div className="space-y-4">
        {/* Toast Notification */}
        {toastMessage && (
          <Card className="bg-white border border-emerald-200 shadow-sm">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">{toastMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Connection Info */}
        <UNSConnectionInfo topic={TOPIC_SYNC_STATUS} />

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg font-bold text-slate-900">Outbound DN - Logistics View</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">DN Number</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Destination/Provider</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Order Date</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500 py-12">
                      <div className="flex flex-col items-center justify-center">
                        <ClipboardCheck className="h-10 w-10 text-slate-300 mb-2" />
                        <p className="text-sm font-medium">No live outbound records found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  dns.map((dn) => (
                    <TableRow 
                      key={dn.id} 
                      className="bg-white border-b border-slate-100 hover:bg-slate-50 cursor-pointer last:border-0 transition-colors"
                      onClick={() => openDetailSheet(dn)}
                    >
                      <TableCell className="font-mono text-xs font-bold text-slate-700">{dn.id}</TableCell>
                      <TableCell className="text-slate-700 font-medium">{dn.destination}</TableCell>
                      <TableCell className="text-slate-600 text-sm">{dn.orderDate}</TableCell>
                      <TableCell>{getStatusBadge(dn.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedDN} onOpenChange={(open) => {
        if (!open) {
          setSelectedDN(null)
          setCarrier('')
          setTrackingNumber('')
        }
      }}>
        {selectedDN && (
          <SheetContent>
            <SheetHeader>
              <SheetTitle>DN Details: {selectedDN.id}</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Customer</p>
                        <p className="text-sm font-medium text-slate-900">{selectedDN.customer}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Destination</p>
                        <p className="text-sm font-medium text-slate-900">{selectedDN.destination}</p>
                    </div>
                </div>

                {/* Progress Stepper */}
                <div className="py-4">
                  <p className="text-sm font-semibold text-slate-700 mb-4">Workflow Progress</p>
                  <div className="flex items-center space-x-1">
                    {getProgressSteps().map((step, index) => (
                      <div key={index} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                            ${step.status === 'completed' ? 'bg-green-600 text-white' : ''}
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

                {/* Workflow Actions Card */}
                <div className="pt-4 border-t border-slate-200">
                  <Card className="border border-slate-200 shadow-sm bg-slate-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          Workflow Actions
                          <span className="text-[10px] font-normal text-slate-400 bg-white border px-1.5 py-0.5 rounded-full">Live</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const status = (currentStatus || selectedDN.status || '').toUpperCase().trim()
                        
                        if (status === 'NEW' || status === 'PENDING') {
                          return (
                            <Button onClick={handleReleaseToPicking} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                              <ClipboardCheck className="h-4 w-4" /> Release to Picking
                            </Button>
                          )
                        }
                        if (status === 'PICKING') {
                          return (
                            <Button onClick={handleConfirmPacking} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                              <Box className="h-4 w-4" /> Confirm Packing
                            </Button>
                          )
                        }
                        if (status === 'PACKING') {
                          return (
                            <Button onClick={handleReadyToShip} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                              <ArrowRight className="h-4 w-4" /> Ready to Ship
                            </Button>
                          )
                        }
                        if (status === 'READY_TO_SHIP' || status === 'READY TO SHIP') {
                          return (
                            <Button onClick={handleConfirmShipment} className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2">
                              <Truck className="h-4 w-4" /> Confirm Shipment
                            </Button>
                          )
                        }
                        return (
                           <div className="text-center py-2 text-sm text-slate-500 bg-white rounded border border-slate-100">
                             All actions completed for this order.
                           </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* Shipping Info Input */}
                {(currentStatus === 'READY_TO_SHIP' || currentStatus === 'READY TO SHIP') && (
                  <div className="space-y-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Carrier</label>
                      <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. DHL" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Tracking #</label>
                      <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Tracking ID" className="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                )}
            </div>
          </SheetContent>
        )}
      </Sheet>
      </div>
    </PageContainer>
  )
}