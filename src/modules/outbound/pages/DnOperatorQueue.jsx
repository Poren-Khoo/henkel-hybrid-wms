import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Checkbox } from '../../../components/ui/checkbox'
import { ScrollArea } from '../../../components/ui/scrollarea'
import { CheckCircle2, FileText } from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext' // <--- THE ONLY MAJOR CHANGE

// MQTT Topics (We only need the Action topic now, State is handled globally)
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/Costing/Action/Submit_VAS"

// Activity-Based Costing Constants (YOUR ORIGINAL LOGIC)
const QTY = 100 
const DAYS = 10 
const RATE_INBOUND = 2.0 
const RATE_OUTBOUND = 3.0 
const RATE_STORAGE = 0.5 

// Pricing logic helper (YOUR ORIGINAL LOGIC)
const calculateDNCost = (dn, vasInputs) => {
  const inboundCost = QTY * RATE_INBOUND
  const outboundCost = QTY * RATE_OUTBOUND
  const storageCost = QTY * DAYS * RATE_STORAGE
  const basicCost = inboundCost + outboundCost + storageCost

  let vasCost = 0
  if (vasInputs.is_urgent) vasCost += 500
  if (vasInputs.need_repack) vasCost += 50
  if (vasInputs.custom_label) vasCost += 2

  const totalCost = basicCost + vasCost

  return { basicCost, vasCost, totalCost, inboundCost, outboundCost, storageCost }
}

export default function DnOperatorQueue() {
  // 1. Get Data from Global Memory (Instant Access)
  const { data, publish } = useGlobalUNS()
  
  const [selectedDN, setSelectedDN] = useState(null)
  const [vasInputs, setVasInputs] = useState({
    is_urgent: false,
    need_repack: false,
    custom_label: false,
    special_notes: '',
  })
  const [toastMessage, setToastMessage] = useState(null)

  // 2. Parse Data from the specific "dns" bucket in Global Context
  const allDNs = Array.isArray(data.dns) ? data.dns : []

  // 3. Filter Logic (YOUR ORIGINAL LOGIC)
  const operatorQueueDNs = allDNs.filter(dn => {
    const status = dn.status || dn.workflow_status || ''
    return !status || status === 'NEW' || status === 'REJECTED'
  })

  const getWorkflowStatusBadge = (status) => {
    const statusUpper = (status || '').toUpperCase()
    if (statusUpper === 'NEW' || !statusUpper) return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 border rounded-sm uppercase text-[10px] px-2">NEW</Badge>
    if (statusUpper === 'REJECTED') return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 border rounded-sm uppercase text-[10px] px-2">REJECTED</Badge>
    return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm uppercase text-[10px] px-2">{status}</Badge>
  }

  const handleVASInputChange = (field, value) => {
    setVasInputs(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmitForPricing = () => {
    if (!selectedDN) return

    const payload = {
      dn_no: selectedDN.dn_no || selectedDN.id || selectedDN.dnNumber,
      destination: selectedDN.destination,
      is_urgent: vasInputs.is_urgent,
      need_repack: vasInputs.need_repack,
      custom_label: vasInputs.custom_label,
      special_notes: vasInputs.special_notes,
    }

    publish(TOPIC_ACTION, payload)

    setToastMessage('Sent for Pricing')
    setTimeout(() => setToastMessage(null), 3000)

    setSelectedDN(null)
    setVasInputs({
      is_urgent: false,
      need_repack: false,
      custom_label: false,
      special_notes: '',
    })
  }

  const openVASSheet = (dn) => {
    setSelectedDN(dn)
    setVasInputs({
      is_urgent: dn.is_urgent || false,
      need_repack: dn.need_repack || false,
      custom_label: dn.custom_label || false,
      special_notes: dn.special_notes || '',
    })
  }

  const costs = selectedDN ? calculateDNCost(selectedDN, vasInputs) : null
  const dnId = selectedDN ? (selectedDN.dn_no || selectedDN.id || selectedDN.dnNumber) : null
  const dnDestination = selectedDN ? selectedDN.destination : null
  const rejectReason = selectedDN ? (selectedDN.reject_reason || selectedDN.rejectReason) : null

  return (
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

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-bold text-slate-900">DN Operator Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-4">
            {/* Left Column: DN List */}
            <Card className="bg-white border-slate-200 shadow-sm flex flex-col">
              <CardHeader className="pb-3 pt-4 border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Inbound DN List</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                <ScrollArea className="h-[600px]">
                  {operatorQueueDNs.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <FileText className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">No DNs in Operator Queue</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {operatorQueueDNs.map((dn, index) => {
                        const dnId = dn.dn_no || dn.id || dn.dnNumber || `DN-${index}`
                        const status = dn.status || dn.workflow_status || ''
                        return (
                          <div
                            key={dnId}
                            className={`
                              relative p-3 rounded-lg border cursor-pointer transition-all duration-200
                              ${selectedDN?.dn_no === dn.dn_no || selectedDN?.id === dn.id 
                                ? 'bg-white border-[#a3e635] shadow-md ring-1 ring-[#a3e635] z-10' 
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                              }
                            `}
                            onClick={() => openVASSheet(dn)}
                          >
                            <div className="font-mono text-xs font-bold text-slate-900">{dnId}</div>
                            <div className="text-xs text-slate-500 mt-1.5">{dn.destination}</div>
                            <div className="mt-2.5">{getWorkflowStatusBadge(status)}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Column: VAS Worksheet */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">VAS Worksheet</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {selectedDN ? (
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">DN Number</p>
                      <p className="text-sm font-mono font-bold text-slate-900">{dnId}</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destination</p>
                      <p className="text-sm font-medium text-slate-900">{dnDestination}</p>
                    </div>
                    {rejectReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs font-bold text-red-800 mb-1 uppercase tracking-wider">Rejection Reason:</p>
                        <p className="text-sm text-red-700">{rejectReason}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">VAS Options</h3>
                      
                      <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <Checkbox
                          checked={vasInputs.is_urgent}
                          onChange={(e) => handleVASInputChange('is_urgent', e.target.checked)}
                          className="border-slate-300 data-[state=checked]:bg-[#a3e635] data-[state=checked]:text-slate-900 data-[state=checked]:border-[#a3e635]"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">Activity 3 (Urgent)</div>
                          <div className="text-xs text-slate-500">+¥500</div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <Checkbox
                          checked={vasInputs.need_repack}
                          onChange={(e) => handleVASInputChange('need_repack', e.target.checked)}
                          className="border-slate-300 data-[state=checked]:bg-[#a3e635] data-[state=checked]:text-slate-900 data-[state=checked]:border-[#a3e635]"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">Activity 2 (Repacking)</div>
                          <div className="text-xs text-slate-500">+¥50</div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <Checkbox
                          checked={vasInputs.custom_label}
                          onChange={(e) => handleVASInputChange('custom_label', e.target.checked)}
                          className="border-slate-300 data-[state=checked]:bg-[#a3e635] data-[state=checked]:text-slate-900 data-[state=checked]:border-[#a3e635]"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">Activity 1 (Labeling)</div>
                          <div className="text-xs text-slate-500">+¥2</div>
                        </div>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Special Notes</label>
                      <textarea
                        value={vasInputs.special_notes}
                        onChange={(e) => handleVASInputChange('special_notes', e.target.value)}
                        className="w-full h-24 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus:bg-white transition-colors resize-none"
                        placeholder="Add any special instructions or notes..."
                      />
                    </div>

                    {costs && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <div className="flex flex-col">
                              <span className="text-slate-600 font-medium">Basic Cost:</span>
                              <span className="text-[10px] text-slate-500 mt-0.5">(Includes Inbound, Outbound, Storage)</span>
                            </div>
                            <span className="font-bold text-slate-900">¥{costs.basicCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 font-medium">VAS Cost:</span>
                            <span className="font-bold text-slate-900">¥{costs.vasCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg pt-3 border-t border-slate-200">
                            <span className="font-bold text-slate-900">Total Cost:</span>
                            <span className="font-bold text-[#a3e635]">¥{costs.totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleSubmitForPricing}
                      className="w-full h-10 bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm px-4 inline-flex items-center gap-2"
                    >
                      Submit for Pricing
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 py-16">
                    <FileText className="h-12 w-12 mb-4 text-slate-300" />
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">Waiting for Selection</h3>
                    <p className="text-xs text-slate-500">Select a DN from the list to view VAS worksheet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}