import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import { FlaskConical, Search, Box, CheckCircle, XCircle, TestTube2, AlertCircle, Clock, PauseCircle } from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_QC_QUEUE = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue"
const TOPIC_SUBMIT_RESULT = "Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Submit_Result"

export default function QASamples() {
  const { data, publish } = useGlobalUNS()
  
  // Search State
  const [searchText, setSearchText] = useState('')

  // Lab Result Modal State
  const [selectedSample, setSelectedSample] = useState(null)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [labValues, setLabValues] = useState({ viscosity: '', ph: '', purity: '' })
  const [labOutcome, setLabOutcome] = useState('PASS')

  // DEBUG: Track when MQTT data arrives
  useEffect(() => {
    // console.log('🔍 [QASamples] Data Update:', data.raw[TOPIC_QC_QUEUE])
  }, [data.raw])

  // Get live data
  const samples = useMemo(() => {
    const rawData = data.raw[TOPIC_QC_QUEUE]
    const rawSamples = Array.isArray(rawData) ? rawData : rawData?.items || []
    
    const mapped = Array.isArray(rawSamples) ? rawSamples.map((sample, index) => ({
      id: sample.sample_id || `QA-${index}`,
      material: sample.sku || 'N/A',
      desc: sample.desc || '',
      batch: sample.batch_id || 'N/A',
      qty: sample.qty || '0',
      status: sample.status || 'PENDING',
      location: sample.location || 'DOCK'
    })) : []
    
    if (!searchText) return mapped
    return mapped.filter(s => 
      s.id.toLowerCase().includes(searchText.toLowerCase()) ||
      s.batch.toLowerCase().includes(searchText.toLowerCase())
    )
  }, [data.raw, searchText])

  // KPI Calc
  const kpiData = useMemo(() => {
    return {
      pending: samples.length,
      priority: samples.filter(s => s.status.includes('PRIORITY')).length,
      onHold: 0, 
      avgTime: '45m'
    }
  }, [samples])

  // --- HANDLERS ---

  const handleOpenLab = (sample) => {
    setSelectedSample(sample)
    setLabValues({ viscosity: '', ph: '', purity: '' }) // Reset form
    setLabOutcome('PASS')
    setIsResultOpen(true)
  }

  const handleSubmitResults = () => {
    if (!selectedSample) return

    // 1. Construct Payload
    const payload = {
        batch_id: selectedSample.batch,
        result: labOutcome, // "PASS" or "FAIL"
        lab_data: {
            viscosity: labValues.viscosity,
            ph: labValues.ph,
            purity: labValues.purity,
            tested_at: Date.now()
        },
        technician: "Selene Morgan" // Mock User
    }

    // 2. Publish to Node-RED
    console.log("🧪 Submitting Lab Results:", payload)
    publish(TOPIC_SUBMIT_RESULT, payload)

    // 3. Close UI
    setIsResultOpen(false)
    setSelectedSample(null)
  }

  // --- RENDER HELPERS ---

  const getStatusBadge = (status) => {
    switch (status) {
        case 'IN_TESTING': 
            return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 rounded-sm">In Testing</Badge>
        case 'PENDING_SAMPLING': 
        case 'QUARANTINE':
            return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-sm">Pending</Badge>
        case 'PASS':
            return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-sm">Pass</Badge>
        case 'FAIL':
            return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-sm">Fail</Badge>
        default:
            return <Badge variant="outline" className="text-slate-500 border-slate-200 rounded-sm">{status}</Badge>
    }
  }

  // Refactored KPI Card (Neutral Style)
  const KPICard = ({ label, value, icon: Icon, colorClass }) => (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="p-4 flex justify-between items-start">
        <div>
            <div className="text-3xl font-bold text-slate-900">{value}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{label}</div>
        </div>
        <div className={`h-8 w-8 rounded-md flex items-center justify-center bg-slate-50 ${colorClass}`}>
            <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <PageContainer title="QA Samples" subtitle="Lab Interface: Record test results">
      <div className="space-y-4">
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <UNSConnectionInfo topic={TOPIC_QC_QUEUE} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Pending Tests" value={kpiData.pending} icon={FlaskConical} colorClass="text-amber-600" />
          <KPICard label="High Priority" value={kpiData.priority} icon={AlertCircle} colorClass="text-red-600" />
          <KPICard label="On Hold" value={kpiData.onHold} icon={PauseCircle} colorClass="text-slate-600" />
          <KPICard label="Avg Turnaround" value={kpiData.avgTime} icon={Clock} colorClass="text-blue-600" />
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-96">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Scan Batch or Sample ID..." 
                    className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
            </div>
        </div>

        {/* TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Sample ID</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material Info</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Batch</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Qty</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Location</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2 py-8">
                        <Box className="h-10 w-10 text-slate-200" />
                        <span className="text-sm font-medium text-slate-600">No samples waiting for testing</span>
                        <span className="text-xs text-slate-400">All caught up!</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                samples.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    <TableCell className="font-mono text-xs text-blue-600 font-bold">
                        <div className="flex items-center gap-2">{item.id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900 text-sm">{item.material}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-700">{item.batch}</TableCell>
                    <TableCell className="text-sm text-slate-700">{item.qty}</TableCell>
                    <TableCell className="text-xs text-slate-500">{item.location}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                        <Button 
                            size="sm" 
                            variant="outline"
                            className="h-8 text-xs border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                            onClick={() => handleOpenLab(item)}
                        >
                            <TestTube2 className="h-3.5 w-3.5 mr-2" />
                            Record Results
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* --- LAB RESULTS MODAL --- */}
        <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-lg font-bold text-slate-900">Lab Results Entry</DialogTitle>
              <DialogDescription className="text-xs">
                Recording data for Batch: <span className="font-mono text-slate-700">{selectedSample?.batch}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
                {/* Result Toggle */}
                <div className="flex gap-4 justify-center">
                    <div 
                        className={`cursor-pointer border-2 rounded-xl p-4 w-36 flex flex-col items-center gap-2 transition-all ${labOutcome === 'PASS' ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                        onClick={() => setLabOutcome('PASS')}
                    >
                        <CheckCircle className={`h-8 w-8 ${labOutcome === 'PASS' ? 'text-green-600' : 'text-slate-300'}`} />
                        <span className={`font-bold text-sm ${labOutcome === 'PASS' ? 'text-green-700' : 'text-slate-400'}`}>PASS</span>
                    </div>
                    <div 
                        className={`cursor-pointer border-2 rounded-xl p-4 w-36 flex flex-col items-center gap-2 transition-all ${labOutcome === 'FAIL' ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                        onClick={() => setLabOutcome('FAIL')}
                    >
                        <XCircle className={`h-8 w-8 ${labOutcome === 'FAIL' ? 'text-red-600' : 'text-slate-300'}`} />
                        <span className={`font-bold text-sm ${labOutcome === 'FAIL' ? 'text-red-700' : 'text-slate-400'}`}>FAIL</span>
                    </div>
                </div>

                {/* Input Fields */}
                <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">Viscosity (cP)</Label>
                            <Input 
                                className="h-9 bg-white border-slate-200"
                                placeholder="e.g. 2000" 
                                value={labValues.viscosity}
                                onChange={(e) => setLabValues({...labValues, viscosity: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600">pH Level</Label>
                            <Input 
                                className="h-9 bg-white border-slate-200"
                                placeholder="e.g. 7.2" 
                                value={labValues.ph}
                                onChange={(e) => setLabValues({...labValues, ph: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Purity / Notes</Label>
                        <Input 
                            className="h-9 bg-white border-slate-200"
                            placeholder="e.g. 99.8% - Visual Inspection OK" 
                            value={labValues.purity}
                            onChange={(e) => setLabValues({...labValues, purity: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={() => setIsResultOpen(false)} className="text-slate-500 hover:text-slate-900">Cancel</Button>
              <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2 min-w-[120px]" onClick={handleSubmitResults}>
                Submit Results
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}