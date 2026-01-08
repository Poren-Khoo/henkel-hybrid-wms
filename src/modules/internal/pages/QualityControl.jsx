import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Badge } from '../../../components/ui/badge'
import { ScrollArea } from '../../../components/ui/scrollarea'
import { AlertCircle, CheckCircle2, XCircle, FlaskConical, Activity } from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import PageContainer from '../../../components/PageContainer'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'

// UNS Topics
const TOPIC_QUEUE = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Submit_Result"

export default function QualityControl() {
  const { data, publish } = useGlobalUNS()
  const [selectedBatch, setSelectedBatch] = useState(null)
  
  // Lab Data Form State
  const [labData, setLabData] = useState({
    viscosity: '',
    ph: '',
    purity: ''
  })

  // Get Queue Data from UNS (Direct read, no caching)
  const queueData = data.raw[TOPIC_QUEUE] || { items: [] }

  // Reset form when selecting a new batch
  useEffect(() => {
    if (selectedBatch) {
      setLabData({ viscosity: '', ph: '', purity: '' })
    }
  }, [selectedBatch])

  const handleDecision = (result) => {
    if (!selectedBatch) return

    // 1. Construct the Payload
    const payload = {
      batch_id: selectedBatch.batch_id,
      inspector_id: "User_Admin", // In real app, get from AuthContext
      result: result, // "PASS" or "FAIL"
      lab_data: labData,
      timestamp: Date.now()
    }

    // 2. Publish to Node-RED
    publish(TOPIC_ACTION, payload)

    // 3. Clear UI
    setSelectedBatch(null)
  }

  return (
    <PageContainer 
      title="Quality Control Lab" 
      subtitle="Inspect incoming raw materials before releasing to production."
      variant="standard"
    >
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_QUEUE} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          
          {/* LEFT COLUMN: Inspection Queue */}
          <Card className="col-span-1 border-slate-200 flex flex-col">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-slate-500" />
                  Pending Inspection
                </CardTitle>
                <Badge variant="secondary">{queueData.items?.length || 0}</Badge>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {queueData.items && queueData.items.length > 0 ? (
                  queueData.items.map((batch) => (
                    <div 
                      key={batch.batch_id}
                      onClick={() => setSelectedBatch(batch)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedBatch?.batch_id === batch.batch_id 
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                          : 'border-slate-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{batch.batch_id}</span>
                        <Badge variant="amber" className="text-[10px] px-1.5 h-5">QUARANTINE</Badge>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mb-1">{batch.sku}</h4>
                      <p className="text-xs text-slate-500 mb-2">{batch.desc}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{batch.qty} kg</span>
                        <span>•</span>
                        <span>{batch.supplier}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Queue is empty</p>
                    <p className="text-xs">Waiting for inbound...</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* RIGHT COLUMN: The Workbench */}
          <Card className="col-span-1 lg:col-span-2 border-slate-200 flex flex-col">
            {selectedBatch ? (
              <>
                <CardHeader className="border-b border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl text-slate-900 mb-1">
                        Inspecting: {selectedBatch.sku}
                      </CardTitle>
                      <CardDescription>
                        Batch ID: <span className="font-mono text-slate-900">{selectedBatch.batch_id}</span> • Supplier: {selectedBatch.supplier}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-500">Required Tests</div>
                      <div className="flex gap-1 mt-1 justify-end">
                        {selectedBatch.required_tests?.map(test => (
                          <Badge key={test} variant="outline" className="bg-slate-50">{test}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 p-8">
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Viscosity (cP)</Label>
                        <div className="relative">
                          <Activity className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input 
                            placeholder="e.g. 1500" 
                            className="pl-9"
                            value={labData.viscosity}
                            onChange={e => setLabData({...labData, viscosity: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>pH Level</Label>
                        <Input 
                          placeholder="e.g. 7.2" 
                          value={labData.ph}
                          onChange={e => setLabData({...labData, ph: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Purity %</Label>
                        <Input 
                          placeholder="e.g. 99.8" 
                          value={labData.purity}
                          onChange={e => setLabData({...labData, purity: e.target.value})}
                        />
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <h5 className="text-sm font-medium mb-2 text-slate-700">Inspection Protocol</h5>
                        <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                          <li>Verify seal integrity</li>
                          <li>Take 3 samples from top, middle, bottom</li>
                          <li>Check for foreign particles</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-slate-100">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-lg"
                      onClick={() => handleDecision("PASS")}
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Release to Inventory
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1 h-12 text-lg"
                      onClick={() => handleDecision("FAIL")}
                    >
                      <XCircle className="mr-2 h-5 w-5" />
                      Reject Batch
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                <FlaskConical className="h-24 w-24 mb-4 opacity-20" />
                <p className="text-lg font-medium text-slate-400">Select a batch to inspect</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}