import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { FlaskConical, Search, Box, CheckCircle, XCircle, TestTube2 } from 'lucide-react'
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
    console.log('🔍 [QASamples] Data Update:', data.raw[TOPIC_QC_QUEUE])
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
    if (status === 'IN_TESTING') return <Badge className="bg-purple-100 text-purple-700">In Testing</Badge>
    if (status === 'PENDING_SAMPLING' || status === 'QUARANTINE') return <Badge className="bg-amber-100 text-amber-700">Pending Test</Badge>
    return <Badge variant="outline">{status}</Badge>
  }

  const KPICard = ({ label, value, colorClass }) => (
    <Card className={`border-l-4 ${colorClass} shadow-sm`}>
      <CardContent className="p-4">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className={`text-xs font-medium uppercase mt-1 ${colorClass.replace('border-l-', 'text-')}`}>{label}</div>
      </CardContent>
    </Card>
  )

  return (
    <PageContainer title="QA Samples" subtitle="Lab Interface: Record test results">
      <div className="space-y-6">
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <UNSConnectionInfo topic={TOPIC_QC_QUEUE} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Pending Tests" value={kpiData.pending} colorClass="border-l-amber-500" />
          <KPICard label="High Priority" value={kpiData.priority} colorClass="border-l-red-500" />
          <KPICard label="On Hold" value={kpiData.onHold} colorClass="border-l-slate-500" />
          <KPICard label="Avg Turnaround" value={kpiData.avgTime} colorClass="border-l-blue-500" />
        </div>

        {/* TABLE */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Scan Batch or Sample ID..." 
                className="pl-8" 
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Sample ID</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                        <Box className="h-8 w-8 text-slate-300" />
                        <span>No samples waiting for testing. Good job!</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                samples.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-blue-600 font-medium">
                        <div className="flex items-center gap-2"><FlaskConical className="h-3 w-3"/> {item.id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.material}</div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.batch}</TableCell>
                    <TableCell>{item.qty}</TableCell>
                    <TableCell className="text-xs">{item.location}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                        {/* THIS BUTTON WAS MISSING IN YOUR CODE */}
                        <Button 
                            size="sm" 
                            variant="outline"
                            className="border-slate-800 text-slate-800 hover:bg-slate-50"
                            onClick={() => handleOpenLab(item)}
                        >
                            <TestTube2 className="h-4 w-4 mr-2" />
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
            <DialogHeader>
              <DialogTitle>Lab Results Entry</DialogTitle>
              <DialogDescription>Enter measured values for Batch: {selectedSample?.batch}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
                {/* Result Toggle */}
                <div className="flex gap-4 justify-center">
                    <div 
                        className={`cursor-pointer border-2 rounded-lg p-4 w-32 flex flex-col items-center gap-2 ${labOutcome === 'PASS' ? 'border-green-500 bg-green-50' : 'border-slate-200 opacity-50'}`}
                        onClick={() => setLabOutcome('PASS')}
                    >
                        <CheckCircle className="text-green-600 h-6 w-6" />
                        <span className="font-bold text-green-700">PASS</span>
                    </div>
                    <div 
                        className={`cursor-pointer border-2 rounded-lg p-4 w-32 flex flex-col items-center gap-2 ${labOutcome === 'FAIL' ? 'border-red-500 bg-red-50' : 'border-slate-200 opacity-50'}`}
                        onClick={() => setLabOutcome('FAIL')}
                    >
                        <XCircle className="text-red-600 h-6 w-6" />
                        <span className="font-bold text-red-700">FAIL</span>
                    </div>
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Viscosity (cP)</Label>
                        <Input 
                            placeholder="e.g. 2000" 
                            value={labValues.viscosity}
                            onChange={(e) => setLabValues({...labValues, viscosity: e.target.value})}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>pH Level</Label>
                        <Input 
                            placeholder="e.g. 7.2" 
                            value={labValues.ph}
                            onChange={(e) => setLabValues({...labValues, ph: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsResultOpen(false)}>Cancel</Button>
              <Button className="bg-slate-900 text-white" onClick={handleSubmitResults}>
                Submit Results
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}