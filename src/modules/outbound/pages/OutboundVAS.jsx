import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Checkbox } from '../../../components/ui/checkbox'
import { ScrollArea } from '../../../components/ui/scrollarea'
import { CheckCircle2, FileText } from 'lucide-react'

// Mock DN data
const mockDNs = [
  { id: 'DN-2025-001', destination: 'Shanghai Port', sku: 'GLUE-500', status: 'NEW' },
  { id: 'DN-2025-002', destination: 'Beijing Warehouse', sku: 'SEALANT-X', status: 'NEW' },
  { id: 'DN-2025-003', destination: 'Guangzhou Hub', sku: 'TAPE-PRO', status: 'NEW' },
  { id: 'DN-2025-004', destination: 'Shenzhen Distribution', sku: 'GLUE-200', status: 'NEW' },
  { id: 'DN-2025-005', destination: 'Chengdu Logistics', sku: 'FOAM-INS', status: 'NEW' },
]

export default function OutboundVAS() {
  const [dns, setDns] = useState(mockDNs)
  const [selectedDN, setSelectedDN] = useState(null)
  const [vasOptions, setVasOptions] = useState({
    isUrgent: false,
    needRepack: false,
    customLabel: false,
  })
  const [toastMessage, setToastMessage] = useState(null)

  const handleDNSelect = (dn) => {
    setSelectedDN(dn)
    // Reset VAS options when selecting a new DN
    setVasOptions({
      isUrgent: false,
      needRepack: false,
      customLabel: false,
    })
  }

  const handleCheckboxChange = (option) => {
    setVasOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }))
  }

  const calculateTotal = () => {
    let total = 0
    if (vasOptions.isUrgent) total += 500
    if (vasOptions.needRepack) total += 50 // Per pallet (assuming 1 pallet for now)
    if (vasOptions.customLabel) total += 2 // Per unit (assuming 1 unit for now)
    return total
  }

  const handleSubmit = () => {
    if (!selectedDN) {
      setToastMessage("Please select a DN first")
      setTimeout(() => setToastMessage(null), 3000)
      return
    }

    // Update DN status
    setDns(prev => prev.map(dn => 
      dn.id === selectedDN.id 
        ? { ...dn, status: 'PENDING APPROVAL' }
        : dn
    ))

    // Update selected DN
    setSelectedDN(prev => prev ? { ...prev, status: 'PENDING APPROVAL' } : null)

    // Show toast
    setToastMessage(`VAS request submitted for ${selectedDN.id}. Status: PENDING APPROVAL`)
    setTimeout(() => setToastMessage(null), 3000)

    // Reset VAS options
    setVasOptions({
      isUrgent: false,
      needRepack: false,
      customLabel: false,
    })
  }

  const getStatusBadge = (status) => {
    if (status === 'NEW') {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 border rounded-sm uppercase text-[10px] px-2">NEW</Badge>
    }
    if (status === 'PENDING APPROVAL') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 border rounded-sm uppercase text-[10px] px-2">PENDING APPROVAL</Badge>
    }
    return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm uppercase text-[10px] px-2">{status}</Badge>
  }

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

      <div className="grid grid-cols-10 gap-4">
        {/* Left Column - DN List (30%) */}
        <div className="col-span-10 md:col-span-3">
          <Card className="bg-white border-slate-200 shadow-sm h-full flex flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Outbound DN List</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="p-4 space-y-2">
                  {dns.map((dn) => (
                    <div
                      key={dn.id}
                      onClick={() => handleDNSelect(dn)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedDN?.id === dn.id
                          ? 'bg-white border-[#a3e635] shadow-md ring-1 ring-[#a3e635] z-10'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-mono text-xs font-bold text-slate-900">{dn.id}</div>
                        {getStatusBadge(dn.status)}
                      </div>
                      <div className="text-xs text-slate-500 space-y-1 mt-2">
                        <div>Destination: {dn.destination}</div>
                        <div>SKU: {dn.sku}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - VAS Worksheet (70%) */}
        <div className="col-span-10 md:col-span-7">
          <Card className="bg-white border-slate-200 shadow-sm h-full">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">VAS Worksheet</CardTitle>
              {selectedDN ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">DN Number:</span> {selectedDN.id}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">Destination:</span> {selectedDN.destination}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold">SKU:</span> {selectedDN.sku}
                  </p>
                  <div className="pt-1">
                    {getStatusBadge(selectedDN.status)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-2">Select a DN from the list to begin</p>
              )}
            </CardHeader>
            <CardContent>
              {selectedDN ? (
                <div className="space-y-6">
                  {/* VAS Options */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">VAS Options</h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <Checkbox
                          checked={vasOptions.isUrgent}
                          onChange={() => handleCheckboxChange('isUrgent')}
                          className="border-slate-300 data-[state=checked]:bg-[#a3e635] data-[state=checked]:text-slate-900 data-[state=checked]:border-[#a3e635]"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">Expedited Shipping</div>
                          <div className="text-xs text-slate-500">+¥500</div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <Checkbox
                          checked={vasOptions.needRepack}
                          onChange={() => handleCheckboxChange('needRepack')}
                          className="border-slate-300 data-[state=checked]:bg-[#a3e635] data-[state=checked]:text-slate-900 data-[state=checked]:border-[#a3e635]"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">Re-palletizing</div>
                          <div className="text-xs text-slate-500">+¥50/pallet</div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <Checkbox
                          checked={vasOptions.customLabel}
                          onChange={() => handleCheckboxChange('customLabel')}
                          className="border-slate-300 data-[state=checked]:bg-[#a3e635] data-[state=checked]:text-slate-900 data-[state=checked]:border-[#a3e635]"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">VAS Labeling</div>
                          <div className="text-xs text-slate-500">+¥2/unit</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Total Cost */}
                  {(vasOptions.isUrgent || vasOptions.needRepack || vasOptions.customLabel) && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-900">Total VAS Cost:</span>
                        <span className="text-2xl font-bold text-[#a3e635]">¥{calculateTotal()}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmit}
                    className="w-full h-10 bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm px-4 inline-flex items-center gap-2"
                  >
                    Calculate & Submit
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 py-16">
                  <FileText className="h-12 w-12 mb-4 text-slate-300" />
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Waiting for Selection</h3>
                  <p className="text-xs text-slate-500">Select a DN from the left to configure VAS options</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

