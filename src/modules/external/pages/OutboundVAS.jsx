import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Checkbox } from '../../../components/ui/checkbox'
import { ScrollArea } from '../../../components/ui/scrollarea'

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
      return <Badge variant="green" className="uppercase px-2">NEW</Badge>
    }
    if (status === 'PENDING APPROVAL') {
      return <Badge variant="amber" className="uppercase px-2">PENDING APPROVAL</Badge>
    }
    return <Badge variant="gray" className="uppercase px-2">{status}</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <Card className="border border-green-300 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800">{toastMessage}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-10 gap-4">
        {/* Left Column - DN List (30%) */}
        <div className="col-span-10 md:col-span-3">
          <Card className="border border-slate-200 shadow-sm h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Outbound DN List</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="p-4 space-y-2">
                  {dns.map((dn) => (
                    <div
                      key={dn.id}
                      onClick={() => handleDNSelect(dn)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedDN?.id === dn.id
                          ? 'border-[#e60000] bg-red-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-slate-900">{dn.id}</div>
                        {getStatusBadge(dn.status)}
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
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
          <Card className="border border-slate-200 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg">VAS Worksheet</CardTitle>
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
                    <h3 className="text-sm font-semibold text-slate-900 uppercase">VAS Options</h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                        <Checkbox
                          checked={vasOptions.isUrgent}
                          onChange={() => handleCheckboxChange('isUrgent')}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">Expedited Shipping</div>
                          <div className="text-xs text-slate-500">+¥500</div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                        <Checkbox
                          checked={vasOptions.needRepack}
                          onChange={() => handleCheckboxChange('needRepack')}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">Re-palletizing</div>
                          <div className="text-xs text-slate-500">+¥50/pallet</div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                        <Checkbox
                          checked={vasOptions.customLabel}
                          onChange={() => handleCheckboxChange('customLabel')}
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
                        <span className="text-sm font-semibold text-slate-900">Total VAS Cost:</span>
                        <span className="text-2xl font-bold text-[#e60000]">¥{calculateTotal()}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmit}
                    variant="destructive"
                    className="w-full h-10"
                  >
                    Calculate & Submit
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p>Select a DN from the left to configure VAS options</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

