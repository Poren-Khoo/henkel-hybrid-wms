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
import { FlaskConical, Search, CheckCircle2, XCircle, AlertTriangle, Box, Gavel, Scale, FileSignature, CheckCircle } from 'lucide-react'
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

  // DEBUG LOGIC (Preserved)
  useEffect(() => {
    const rawData = data.raw[TOPIC_DECISION_QUEUE]
    // console.log('🔍 [QADecisions] useEffect - Data changed:', { hasData: !!rawData })
  }, [data.raw])

  // DATA MAPPING (Preserved Logic)
  const samples = useMemo(() => {
    const rawData = data.raw[TOPIC_DECISION_QUEUE]
    const rawSamples = Array.isArray(rawData) ? rawData : rawData?.items || rawData?.queue || rawData?.samples || []
    
    const mappedSamples = Array.isArray(rawSamples) ? rawSamples.map((item, index) => ({
      id: item.sample_id || item.batch_id || item.id || item.sampleId || `QA-${Date.now()}-${index}`,
      material: item.sku || item.material || item.material_code || item.materialCode || 'N/A',
      desc: item.description || item.desc || item.material_name || item.materialName || '',
      batch: item.batch_id || item.batch || item.batchId || 'N/A',
      labRef: item.lab_ref || item.ref || item.lab_reference || item.labReference || '',
      sampled: item.requested || item.requested_at || item.requestedAt || item.created_at || item.createdAt || '',
      status: item.status || item.sample_status || item.sampleStatus || 'PENDING_APPROVAL',
      lab_result: item.lab_result || item.labResult || item.result || '', 
      reason: item.reason || item.decision_reason || item.decisionReason || '',
      decidedBy: item.decided_by || item.decidedBy || item.decider || item.manager || ''
    })) : []
    
    const filteredByStatus = mappedSamples.filter(item => {
      const status = item.status.toUpperCase()
      return status === 'PENDING_APPROVAL' || status === 'AWAITING_APPROVAL'
    })
    
    if (!searchText) return filteredByStatus
    
    return filteredByStatus.filter(sample => 
      sample.id.toLowerCase().includes(searchText.toLowerCase()) ||
      sample.material.toLowerCase().includes(searchText.toLowerCase()) ||
      sample.batch.toLowerCase().includes(searchText.toLowerCase()) ||
      (sample.labRef && sample.labRef.toLowerCase().includes(searchText.toLowerCase()))
    )
  }, [data.raw, searchText])

  // KPI LOGIC (Preserved)
  const kpiData = useMemo(() => {
    const awaitingDecision = samples.filter(s => {
      const status = s.status.toUpperCase()
      return status === 'PENDING_APPROVAL' || status === 'AWAITING_APPROVAL'
    }).length
    const released = 0
    const blocked = 0
    const total = samples.length
    
    return { awaitingDecision, released, blocked, total }
  }, [samples])

  // HANDLERS (Preserved)
  const handleOpenDecision = (sample) => {
    setSelectedSample(sample)
    setDecision('') 
    setNotes('')
    setDecisionCode('')
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    if (!decision) return alert("Please select a decision.")
    if (!selectedSample) return
    
    const action = decision === 'PASS' ? 'RELEASE' : 'BLOCK'
    
    const payload = {
      batch_id: selectedSample.batch,
      action: action,
      manager: "CurrentUser" 
    }
    
    publish(TOPIC_ACTION_DISPOSITION, payload)
    
    setIsDialogOpen(false)
    setSelectedSample(null)
    setDecision('')
    setNotes('')
    setDecisionCode('')
  }

  // --- COMPONENT: KPI CARD (Neutral) ---
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
    <PageContainer title="QA Decisions" subtitle="Make quality decisions on sampled materials">
      <div className="space-y-4">
        
        {/* CONNECTION STATUS */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <UNSConnectionInfo topic={TOPIC_DECISION_QUEUE} />
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Awaiting Decision" value={kpiData.awaitingDecision} icon={Scale} colorClass="text-amber-600" />
          <KPICard label="Released (Session)" value={kpiData.released} icon={CheckCircle} colorClass="text-green-600" />
          <KPICard label="Blocked (Session)" value={kpiData.blocked} icon={XCircle} colorClass="text-red-600" />
          <KPICard label="Total Samples" value={kpiData.total} icon={FlaskConical} colorClass="text-slate-600" />
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-96">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                    placeholder="Search Batch, SKU, or Lab Ref..." 
                    className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />
            </div>
        </div>

        {/* MAIN TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Sample ID</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material Info</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Lab Ref</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Sampled Date</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Reason</TableHead>
                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data.raw[TOPIC_DECISION_QUEUE] ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-700">Connecting to Lab System...</p>
                        <p className="text-xs text-slate-400">Waiting for MQTT payload</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : samples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Box className="h-10 w-10 text-slate-200" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">No samples awaiting decision</p>
                        <p className="text-xs text-slate-400">
                          {searchText ? 'No samples match your search' : 'All clear!'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                samples.map((item) => {
                  const statusUpper = item.status.toUpperCase()
                  const labResult = item.lab_result?.toUpperCase() || ''
                  
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                      <TableCell className="font-mono text-xs text-blue-600 font-bold">
                        {item.id}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900 text-sm">{item.material}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{item.batch}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-700">{item.labRef || '-'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{item.sampled || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                            {statusUpper === 'PENDING_APPROVAL' || statusUpper === 'AWAITING_APPROVAL' ? (
                                <Badge variant="outline" className="w-fit bg-amber-50 text-amber-700 border-amber-200 rounded-sm">Pending Approval</Badge>
                            ) : (
                                <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-200 rounded-sm">{item.status}</Badge>
                            )}
                            {labResult && (
                                <Badge 
                                    variant="outline"
                                    className={`w-fit rounded-sm ${labResult === 'PASS' 
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : 'bg-red-50 text-red-700 border-red-200'
                                    }`}
                                >
                                    Lab: {labResult}
                                </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{item.reason || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                            size="sm" 
                            className="bg-slate-900 text-white h-8 text-xs font-semibold hover:bg-slate-800"
                            onClick={() => handleOpenDecision(item)} 
                        >
                            <Gavel className="h-3.5 w-3.5 mr-2" />
                            Decide
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* --- POPUP DIALOG (Cockpit Style) --- */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-slate-500" />
                QA Decision Entry
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record final usage decision for <span className="font-mono text-slate-700 font-bold">{selectedSample?.id}</span>.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              {/* Info Summary */}
              <div className="bg-slate-50 p-3 rounded-lg text-xs grid grid-cols-2 gap-2 border border-slate-100">
                <div><span className="text-slate-500 block mb-0.5">Material</span> <span className="font-bold text-slate-900">{selectedSample?.material}</span></div>
                <div><span className="text-slate-500 block mb-0.5">Batch</span> <span className="font-mono font-bold text-slate-900">{selectedSample?.batch}</span></div>
                <div className="col-span-2 border-t border-slate-200 pt-2 mt-1">
                    <span className="text-slate-500 mr-2">Lab Ref:</span> 
                    <span className="font-mono text-slate-700">{selectedSample?.labRef}</span>
                </div>
              </div>

              {/* Decision Selector */}
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-slate-700">Usage Decision</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div 
                        className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${decision === 'PASS' ? 'border-green-500 bg-green-50 ring-2 ring-green-100' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                        onClick={() => setDecision('PASS')}
                    >
                        <CheckCircle2 className={`h-8 w-8 ${decision === 'PASS' ? 'text-green-600' : 'text-slate-300'}`} />
                        <span className={`font-bold text-sm ${decision === 'PASS' ? 'text-green-700' : 'text-slate-400'}`}>RELEASE</span>
                    </div>
                    <div 
                        className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${decision === 'FAIL' ? 'border-red-500 bg-red-50 ring-2 ring-red-100' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                        onClick={() => setDecision('FAIL')}
                    >
                        <XCircle className={`h-8 w-8 ${decision === 'FAIL' ? 'text-red-600' : 'text-slate-300'}`} />
                        <span className={`font-bold text-sm ${decision === 'FAIL' ? 'text-red-700' : 'text-slate-400'}`}>BLOCK / FAIL</span>
                    </div>
                </div>
              </div>

              {/* Reason Code */}
              <div className="grid gap-2">
                <Label className="text-xs font-semibold text-slate-700">Decision Code</Label>
                <Select value={decisionCode} onValueChange={setDecisionCode}>
                  <SelectTrigger className="h-9 bg-white border-slate-200"><SelectValue placeholder="Select reason code..." /></SelectTrigger>
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
                <Label className="text-xs font-semibold text-slate-700">Manager Remarks</Label>
                <Textarea 
                    className="h-20 bg-white border-slate-200 resize-none text-sm"
                    placeholder="Enter approval notes..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Warning for Block */}
              {decision === 'FAIL' && (
                  <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-md text-xs border border-amber-100">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>This batch will be moved to <b>Blocked Stock</b> and require Disposition (Scrap/Return).</span>
                  </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-500 hover:text-slate-900">Cancel</Button>
              <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2 min-w-[140px]" onClick={handleSubmit}>
                Confirm Decision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  )
}