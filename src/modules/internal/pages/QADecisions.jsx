import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Textarea } from '../../../components/ui/textarea'
import { FlaskConical, Search, CheckCircle2, XCircle, AlertTriangle, Box } from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_DECISION_QUEUE = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Decision_Queue"
const TOPIC_ACTION_DISPOSITION = "Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Execute_Disposition"

export default function QADecisions() {
  const { data, publish } = useGlobalUNS()
  
  // State for the Popup
  const [selectedSample, setSelectedSample] = useState(null) 
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [decision, setDecision] = useState('') 
  const [notes, setNotes] = useState('')
  const [decisionCode, setDecisionCode] = useState('')
  const [searchText, setSearchText] = useState('')

  // DEBUG: Track when MQTT data arrives
  useEffect(() => {
    const rawData = data.raw[TOPIC_DECISION_QUEUE]
    console.log('🔍 [QADecisions] useEffect - Data changed:', {
      hasData: !!rawData,
      dataType: typeof rawData,
      isArray: Array.isArray(rawData),
      keys: rawData ? Object.keys(rawData) : [],
      topic: TOPIC_DECISION_QUEUE,
      allTopics: Object.keys(data.raw)
    })
  }, [data.raw])

  // Get live data from MQTT and filter for items awaiting manager approval
  const samples = useMemo(() => {
    // Fetch from Decision_Queue topic
    const rawData = data.raw[TOPIC_DECISION_QUEUE]
    
    // Debug logging
    console.log('📊 [QADecisions] Raw MQTT Data:', rawData)
    console.log('📊 [QADecisions] Decision Queue items:', rawData?.items)
    
    // Handle different data structures - prioritize items array
    const rawSamples = Array.isArray(rawData) 
      ? rawData 
      : rawData?.items || rawData?.queue || rawData?.samples || []
    
    // Map backend fields to frontend structure
    // Backend sends: sample_id (or batch_id), sku, batch_id, status, lab_result
    const mappedSamples = Array.isArray(rawSamples) ? rawSamples.map((item, index) => ({
      id: item.sample_id || item.batch_id || item.id || item.sampleId || `QA-${Date.now()}-${index}`,
      material: item.sku || item.material || item.material_code || item.materialCode || 'N/A',
      desc: item.description || item.desc || item.material_name || item.materialName || '',
      batch: item.batch_id || item.batch || item.batchId || 'N/A',
      labRef: item.lab_ref || item.ref || item.lab_reference || item.labReference || '',
      sampled: item.requested || item.requested_at || item.requestedAt || item.created_at || item.createdAt || '',
      status: item.status || item.sample_status || item.sampleStatus || 'PENDING_APPROVAL',
      lab_result: item.lab_result || item.labResult || item.result || '', // For color coding
      reason: item.reason || item.decision_reason || item.decisionReason || '',
      decidedBy: item.decided_by || item.decidedBy || item.decider || item.manager || ''
    })) : []
    
    // Filter Logic: Only show items where status === 'PENDING_APPROVAL'
    const filteredByStatus = mappedSamples.filter(item => {
      const status = item.status.toUpperCase()
      return status === 'PENDING_APPROVAL' || status === 'AWAITING_APPROVAL'
    })
    
    // Apply search filter
    if (!searchText) return filteredByStatus
    
    return filteredByStatus.filter(sample => 
      sample.id.toLowerCase().includes(searchText.toLowerCase()) ||
      sample.material.toLowerCase().includes(searchText.toLowerCase()) ||
      sample.batch.toLowerCase().includes(searchText.toLowerCase()) ||
      (sample.labRef && sample.labRef.toLowerCase().includes(searchText.toLowerCase()))
    )
  }, [data.raw, searchText])

  // Calculate KPIs from live data
  const kpiData = useMemo(() => {
    const awaitingDecision = samples.filter(s => {
      const status = s.status.toUpperCase()
      return status === 'PENDING_APPROVAL' || status === 'AWAITING_APPROVAL'
    }).length
    // Note: Released/Blocked items are removed from Decision_Queue, so these will be 0
    // They're kept for UI consistency but will show 0
    const released = 0
    const blocked = 0
    const total = samples.length
    
    return { awaitingDecision, released, blocked, total }
  }, [samples])

  // OPEN THE POPUP (Instead of Navigating)
  const handleOpenDecision = (sample) => {
    setSelectedSample(sample)
    setDecision('') 
    setNotes('')
    setDecisionCode('')
    setIsDialogOpen(true)
  }

  // SUBMIT LOGIC - Publish to MQTT
  const handleSubmit = () => {
    if (!decision) return alert("Please select a decision.")
    if (!selectedSample) return
    
    // Map decision to action
    const action = decision === 'PASS' ? 'RELEASE' : 'BLOCK'
    
    // Construct payload - New structure for Manager Approval workflow
    const payload = {
      batch_id: selectedSample.batch,
      action: action,
      manager: "CurrentUser" // TODO: Get from auth context
    }
    
    // Publish to MQTT
    publish(TOPIC_ACTION_DISPOSITION, payload)
    console.log(`📤 Published QA Disposition:`, payload)
    console.log(`Decision made for batch ${selectedSample.batch}: ${action}`)
    
    setIsDialogOpen(false)
    setSelectedSample(null)
    setDecision('')
    setNotes('')
    setDecisionCode('')
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
    <PageContainer title="QA Decisions" subtitle="Make quality decisions on sampled materials">
      <div className="space-y-6">
        
        {/* MQTT Connection Info */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <UNSConnectionInfo topic={TOPIC_DECISION_QUEUE} />
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Awaiting Decision" value={kpiData.awaitingDecision} colorClass="border-l-amber-500" />
          <KPICard label="Released" value={kpiData.released} colorClass="border-l-green-500" />
          <KPICard label="Blocked/Quarantine" value={kpiData.blocked} colorClass="border-l-red-500" />
          <KPICard label="Total Samples" value={kpiData.total} colorClass="border-l-slate-500" />
        </div>

        {/* MAIN TABLE */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search samples..." 
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
                <TableHead>Lab Ref</TableHead>
                <TableHead>Sampled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Decided By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data.raw[TOPIC_DECISION_QUEUE] ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-700">Loading Samples...</p>
                        <p className="text-xs text-slate-400">Waiting for MQTT data from backend</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : samples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Box className="h-8 w-8 text-slate-300" />
                      <p className="font-medium text-slate-600">No samples awaiting decision</p>
                      <p className="text-xs text-slate-400">
                        {searchText ? 'No samples match your search' : 'All samples have been processed'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                samples.map((item) => {
                  const statusUpper = item.status.toUpperCase()
                  const labResult = item.lab_result?.toUpperCase() || ''
                  
                  // Color code row based on lab_result: PASS = green, FAIL = red
                  const rowBgClass = labResult === 'PASS' 
                    ? 'bg-green-50/50 hover:bg-green-50' 
                    : labResult === 'FAIL' 
                    ? 'bg-red-50/50 hover:bg-red-50' 
                    : 'hover:bg-slate-50'
                  
                  return (
                    <TableRow key={item.id} className={rowBgClass}>
                      <TableCell className="font-mono text-xs text-blue-600 font-medium flex items-center gap-2">
                        <FlaskConical className="h-3 w-3" /> {item.id}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{item.material}</div>
                        <div className="text-xs text-slate-500">{item.batch}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.labRef || '-'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{item.sampled || '-'}</TableCell>
                      <TableCell>
                        {statusUpper === 'PENDING_APPROVAL' || statusUpper === 'AWAITING_APPROVAL' ? (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending Approval</Badge>
                        ) : (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{item.status}</Badge>
                        )}
                        {labResult && (
                          <div className="mt-1">
                            <Badge 
                              className={labResult === 'PASS' 
                                ? 'bg-green-100 text-green-700 hover:bg-green-100' 
                                : 'bg-red-100 text-red-700 hover:bg-red-100'
                              }
                            >
                              Lab: {labResult}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{item.reason || '-'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{item.decidedBy || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                            size="sm" 
                            className="bg-slate-900 text-white h-8"
                            onClick={() => handleOpenDecision(item)} 
                        >
                            Make Decision
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* --- POPUP DIALOG (The fix) --- */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>QA Decision Entry</DialogTitle>
              <DialogDescription>
                Record lab results and make a final usage decision for {selectedSample?.id}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              {/* Info Summary */}
              <div className="bg-slate-50 p-3 rounded-md text-sm grid grid-cols-2 gap-2 border border-slate-100">
                <div><span className="text-slate-500">Material:</span> <span className="font-medium">{selectedSample?.material}</span></div>
                <div><span className="text-slate-500">Batch:</span> <span className="font-medium">{selectedSample?.batch}</span></div>
                <div><span className="text-slate-500">Lab Ref:</span> <span className="font-medium">{selectedSample?.labRef}</span></div>
              </div>

              {/* Decision Selector */}
              <div className="grid gap-2">
                <Label>Usage Decision</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div 
                        className={`cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 transition-all ${decision === 'PASS' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-green-200'}`}
                        onClick={() => setDecision('PASS')}
                    >
                        <CheckCircle2 className={`h-6 w-6 ${decision === 'PASS' ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className={`font-bold ${decision === 'PASS' ? 'text-green-700' : 'text-slate-600'}`}>RELEASE</span>
                    </div>
                    <div 
                        className={`cursor-pointer border-2 rounded-lg p-4 flex flex-col items-center gap-2 transition-all ${decision === 'FAIL' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-red-200'}`}
                        onClick={() => setDecision('FAIL')}
                    >
                        <XCircle className={`h-6 w-6 ${decision === 'FAIL' ? 'text-red-600' : 'text-slate-400'}`} />
                        <span className={`font-bold ${decision === 'FAIL' ? 'text-red-700' : 'text-slate-600'}`}>BLOCK / FAIL</span>
                    </div>
                </div>
              </div>

              {/* Reason Code */}
              <div className="grid gap-2">
                <Label>Decision Code</Label>
                <Select value={decisionCode} onValueChange={setDecisionCode}>
                  <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01">01 | Meets All Specifications</SelectItem>
                    <SelectItem value="02">02 | Conditional Release (Deviated)</SelectItem>
                    <SelectItem value="03">03 | Failed - Contamination</SelectItem>
                    <SelectItem value="04">04 | Failed - Out of Spec</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label>Lab Notes / Remarks</Label>
                <Textarea 
                    placeholder="Enter key lab values (e.g. Viscosity: 400cP)..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Warning for Block */}
              {decision === 'FAIL' && (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded text-xs">
                      <AlertTriangle className="h-4 w-4" />
                      <span>This batch will be moved to "Blocked Stock" and require Disposition.</span>
                  </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button className="bg-slate-900 text-white" onClick={handleSubmit}>Confirm Decision</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  )
}