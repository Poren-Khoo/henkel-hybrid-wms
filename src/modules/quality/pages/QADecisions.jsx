import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Textarea } from '../../../components/ui/textarea'
import {
  FlaskConical, Search, CheckCircle2, XCircle, AlertTriangle, Box,
  Gavel, Scale, FileSignature, CheckCircle, X, ArrowRight, Package,
  ClipboardList
} from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'

const TOPIC_DECISION_QUEUE = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Decision_Queue"
const TOPIC_ACTION_DISPOSITION = "Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Execute_Disposition"

const STATUS_PILLS = ['ALL', 'PENDING_APPROVAL']

function getLabResultBadge(result) {
  const r = (result || '').toUpperCase()
  if (r === 'PASS') return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-sm text-[10px]">Lab: PASS</Badge>
  if (r === 'FAIL') return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-sm text-[10px]">Lab: FAIL</Badge>
  return null
}

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

export default function QADecisions() {
  const navigate = useNavigate()
  const { data, publish } = useGlobalUNS()

  const [searchText, setSearchText] = useState('')
  const [activeStatus, setActiveStatus] = useState('ALL')
  const [selectedSample, setSelectedSample] = useState(null)
  const [decision, setDecision] = useState('')
  const [notes, setNotes] = useState('')
  const [decisionCode, setDecisionCode] = useState('')
  const [submissionSuccess, setSubmissionSuccess] = useState(null)

  const [sessionReleased, setSessionReleased] = useState(0)
  const [sessionBlocked, setSessionBlocked] = useState(0)

  const allSamples = useMemo(() => {
    const rawData = data?.raw?.[TOPIC_DECISION_QUEUE]
    const items = rawData?.items ?? rawData?.queue ?? rawData?.samples ?? (Array.isArray(rawData) ? rawData : [])
    const rawSamples = Array.isArray(items) ? items : []
    return rawSamples.map((item, index) => ({
      id: item.sample_id || item.batch_id || item.id || item.sampleId || `QA-${Date.now()}-${index}`,
      material: item.sku || item.material || item.material_code || item.materialCode || 'N/A',
      desc: item.description || item.desc || item.material_name || item.materialName || '',
      batch: item.batch_id || item.batch || item.batchId || 'N/A',
      labRef: item.lab_ref || item.ref || item.lab_reference || item.labReference || '',
      sampled: item.requested || item.requested_at || item.requestedAt || item.created_at || item.createdAt || '',
      status: item.status || item.sample_status || item.sampleStatus || 'PENDING_APPROVAL',
      lab_result: item.lab_result || item.labResult || item.result || '',
      reason: item.reason || item.decision_reason || item.decisionReason || '',
      decidedBy: item.decided_by || item.decidedBy || item.decider || item.manager || '',
      doc_id: item.doc_id || '-',
      supplier: item.supplier || '-'
    }))
  }, [data.raw])

  const pendingSamples = useMemo(() => {
    return allSamples.filter(item => {
      const status = item.status.toUpperCase()
      return status === 'PENDING_APPROVAL' || status === 'AWAITING_APPROVAL'
    })
  }, [allSamples])

  const samples = useMemo(() => {
    let filtered = pendingSamples
    if (activeStatus !== 'ALL') {
      filtered = filtered.filter(s => {
        const st = s.status.toUpperCase()
        return st === 'PENDING_APPROVAL' || st === 'AWAITING_APPROVAL'
      })
    }
    if (searchText) {
      const q = searchText.toLowerCase()
      filtered = filtered.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.material.toLowerCase().includes(q) ||
        s.batch.toLowerCase().includes(q) ||
        (s.labRef && s.labRef.toLowerCase().includes(q))
      )
    }
    return filtered
  }, [pendingSamples, activeStatus, searchText])

  const statusCounts = useMemo(() => ({
    ALL: pendingSamples.length,
    PENDING_APPROVAL: pendingSamples.length,
  }), [pendingSamples])

  useEffect(() => {
    if (!selectedSample) return
    const updated = pendingSamples.find(s => s.id === selectedSample.id)
    if (updated) setSelectedSample(updated)
  }, [pendingSamples])

  const handleSelectSample = (sample) => {
    setSelectedSample(sample)
    setDecision('')
    setNotes('')
    setDecisionCode('')
    setSubmissionSuccess(null)
  }

  const handleSubmit = () => {
    if (!decision) return alert("Please select a decision.")
    if (!selectedSample) return

    const action = decision === 'PASS' ? 'RELEASE' : 'BLOCK'
    const reasonText = decisionCode ? `${decisionCode} | ${notes}`.trim() : notes.trim() || 'Meets All Specifications'

    const payload = {
      batch_id: selectedSample.batch,
      sku: selectedSample.material,
      action: action,
      reason: reasonText || (action === 'RELEASE' ? 'Meets All Specifications' : 'Failed Inspection'),
      notes: notes,
      manager: "CurrentUser"
    }

    publish(TOPIC_ACTION_DISPOSITION, payload)

    if (action === 'RELEASE') setSessionReleased(prev => prev + 1)
    else setSessionBlocked(prev => prev + 1)

    setSubmissionSuccess({
      batch: selectedSample.batch,
      material: selectedSample.material,
      action: action,
      doc_id: selectedSample.doc_id
    })
  }

  const handleNextDecision = () => {
    setSelectedSample(null)
    setSubmissionSuccess(null)
    setDecision('')
    setNotes('')
    setDecisionCode('')
  }

  return (
    <PageContainer title="QA Decisions" subtitle="Make quality decisions on sampled materials" variant="compact">
      <div className="flex gap-0 h-[calc(100vh-120px)] min-h-[500px]">

        {/* ═══════════ LEFT PANEL ═══════════ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">

            <UNSConnectionInfo topic={TOPIC_DECISION_QUEUE} />

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Awaiting Decision" value={pendingSamples.length} icon={Scale} colorClass="text-amber-600" />
              <KPICard label="Released (Session)" value={sessionReleased} icon={CheckCircle} colorClass="text-green-600" />
              <KPICard label="Blocked (Session)" value={sessionBlocked} icon={XCircle} colorClass="text-red-600" />
              <KPICard label="Total Samples" value={allSamples.length} icon={FlaskConical} colorClass="text-slate-600" />
            </div>

            {/* Status Pills + Search */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {STATUS_PILLS.map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveStatus(s)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      activeStatus === s
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : 'Pending Approval'}
                    <span className="ml-1 opacity-70">({statusCounts[s] || 0})</span>
                  </button>
                ))}
              </div>
              <div className="relative w-64 shrink-0">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search batch, SKU, or lab ref..."
                  className="pl-8 h-7 text-xs bg-white border-slate-200"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">#</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Sample ID</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Material</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Source PO</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Supplier</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase text-center">Lab Result</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!data?.raw?.[TOPIC_DECISION_QUEUE] ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-3 py-8">
                          <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
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
                          <p className="text-sm font-medium text-slate-600">No samples awaiting decision</p>
                          <p className="text-xs text-slate-400">{searchText ? 'No samples match your search' : 'All clear!'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    samples.map((item, index) => {
                      const isSelected = selectedSample?.id === item.id
                      return (
                        <TableRow
                          key={item.id}
                          className={`cursor-pointer transition-colors border-b border-slate-100 ${
                            isSelected ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-slate-50'
                          }`}
                          onClick={() => handleSelectSample(item)}
                        >
                          <TableCell className="text-[10px] text-slate-400 font-mono">{index + 1}</TableCell>
                          <TableCell>
                            <div className="font-mono text-xs text-blue-600 font-bold">{item.id}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.batch}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900 text-xs">{item.material}</div>
                            {item.desc && <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[120px]">{item.desc}</div>}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{item.doc_id}</TableCell>
                          <TableCell className="text-xs text-slate-500 truncate max-w-[100px]">{item.supplier}</TableCell>
                          <TableCell className="text-center">{getLabResultBadge(item.lab_result)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-sm text-[10px]">Pending</Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL: Decision Desk ═══════════ */}
        {selectedSample && (
          <div className="w-[440px] shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden ml-0">

            {submissionSuccess ? (
              /* --- SUCCESS STATE --- */
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="bg-white p-8 rounded-xl text-center max-w-sm w-full">
                  <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6 ${
                    submissionSuccess.action === 'RELEASE' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {submissionSuccess.action === 'RELEASE'
                      ? <CheckCircle2 className="h-8 w-8 text-green-600" />
                      : <XCircle className="h-8 w-8 text-red-600" />
                    }
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">
                    {submissionSuccess.action === 'RELEASE' ? 'Batch Released' : 'Batch Blocked'}
                  </h2>
                  <p className="text-slate-500 text-sm mb-6">
                    {submissionSuccess.action === 'RELEASE'
                      ? 'Inventory moved to Available stock.'
                      : 'Batch moved to Blocked stock for disposition.'
                    }
                  </p>
                  <div className="bg-slate-50 rounded-md p-4 text-left space-y-2 mb-6 border border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Material</span>
                      <span className="font-bold text-slate-900">{submissionSuccess.material}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Batch</span>
                      <span className="font-mono font-bold text-slate-900">{submissionSuccess.batch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Decision</span>
                      <Badge variant="outline" className={`text-[10px] ${
                        submissionSuccess.action === 'RELEASE'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {submissionSuccess.action}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      className="w-full h-9 text-xs gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      onClick={() => navigate('/operations/inventory/list')}
                    >
                      {submissionSuccess.action === 'RELEASE' ? 'View in Inventory' : 'View Blocked Stock'} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs gap-2 border-slate-200"
                      onClick={() => navigate('/operations/inbound/orders')}
                    >
                      View Inbound Order <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    {submissionSuccess.action === 'RELEASE' && (
                      <Button
                        variant="outline"
                        className="w-full h-9 text-xs gap-2 border-slate-200"
                        onClick={() => navigate('/governance/traceability')}
                      >
                        Trace Batch <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-9 text-xs"
                      onClick={handleNextDecision}
                    >
                      Next Decision
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* --- Header --- */}
                <div className="px-5 py-4 border-b border-slate-100 bg-white">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h2 className="font-mono text-base font-bold text-slate-900">{selectedSample.id}</h2>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-sm text-[10px]">Pending</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500">Batch: <span className="font-mono font-bold text-slate-700">{selectedSample.batch}</span></p>
                        {getLabResultBadge(selectedSample.lab_result)}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSample(null)}
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* --- Scrollable Body --- */}
                <div className="flex-1 overflow-y-auto">

                  {/* Sample Info */}
                  <div className="mx-5 mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Package className="h-3 w-3" /> Sample Details
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Material</span>
                        <span className="font-bold text-slate-800">{selectedSample.material}</span>
                      </div>
                      {selectedSample.desc && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Description</span>
                          <span className="text-slate-700">{selectedSample.desc}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Source PO</span>
                        <span className="font-mono text-slate-700">{selectedSample.doc_id}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Supplier</span>
                        <span className="text-slate-700">{selectedSample.supplier}</span>
                      </div>
                      {selectedSample.labRef && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Lab Ref</span>
                          <span className="font-mono text-slate-700">{selectedSample.labRef}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lab Result Summary */}
                  {selectedSample.lab_result && (
                    <div className={`mx-5 mt-3 p-3 rounded-lg border ${
                      selectedSample.lab_result.toUpperCase() === 'PASS'
                        ? 'bg-green-50 border-green-100'
                        : 'bg-red-50 border-red-100'
                    }`}>
                      <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${
                        selectedSample.lab_result.toUpperCase() === 'PASS' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <FlaskConical className="h-3 w-3" /> Lab Result
                      </h4>
                      <p className={`text-sm font-bold ${
                        selectedSample.lab_result.toUpperCase() === 'PASS' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {selectedSample.lab_result.toUpperCase()}
                      </p>
                    </div>
                  )}

                  {/* Decision Form */}
                  <div className="mx-5 mt-4">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <FileSignature className="h-3 w-3" /> Usage Decision
                    </h4>

                    {/* RELEASE / BLOCK Toggle */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div
                        onClick={() => setDecision('PASS')}
                        className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-1.5 transition-all ${
                          decision === 'PASS'
                            ? 'border-green-500 bg-green-50 ring-2 ring-green-100'
                            : 'border-slate-100 bg-white hover:border-slate-300'
                        }`}
                      >
                        <CheckCircle2 className={`h-6 w-6 ${decision === 'PASS' ? 'text-green-600' : 'text-slate-300'}`} />
                        <span className={`font-bold text-xs ${decision === 'PASS' ? 'text-green-700' : 'text-slate-400'}`}>RELEASE</span>
                      </div>
                      <div
                        onClick={() => setDecision('FAIL')}
                        className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-1.5 transition-all ${
                          decision === 'FAIL'
                            ? 'border-red-500 bg-red-50 ring-2 ring-red-100'
                            : 'border-slate-100 bg-white hover:border-slate-300'
                        }`}
                      >
                        <XCircle className={`h-6 w-6 ${decision === 'FAIL' ? 'text-red-600' : 'text-slate-300'}`} />
                        <span className={`font-bold text-xs ${decision === 'FAIL' ? 'text-red-700' : 'text-slate-400'}`}>BLOCK</span>
                      </div>
                    </div>

                    {/* Decision Code */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-600 uppercase">Decision Code</Label>
                        <Select value={decisionCode} onValueChange={setDecisionCode}>
                          <SelectTrigger className="h-8 text-xs bg-white border-slate-200"><SelectValue placeholder="Select reason code..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="01">01 | Meets All Specifications</SelectItem>
                            <SelectItem value="02">02 | Conditional Release (Deviated)</SelectItem>
                            <SelectItem value="03">03 | Failed - Contamination</SelectItem>
                            <SelectItem value="04">04 | Failed - Out of Spec</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-600 uppercase">Manager Remarks</Label>
                        <Textarea
                          className="h-16 bg-white border-slate-200 resize-none text-xs"
                          placeholder="Enter approval notes..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Block Warning */}
                    {decision === 'FAIL' && (
                      <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-md text-xs border border-amber-100 mt-3">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>This batch will be moved to <b>Blocked Stock</b> and require Disposition (Scrap/Return).</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* --- Footer --- */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 space-y-2">
                  <Button
                    className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 text-xs"
                    onClick={handleSubmit}
                    disabled={!decision}
                  >
                    <Gavel className="h-4 w-4 mr-2" /> Confirm Decision
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
