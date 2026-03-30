import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { FlaskConical, Search, Box, CheckCircle, XCircle, TestTube2, AlertCircle, Clock, PauseCircle, X, ArrowRight, Package } from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'

const TOPIC_QC_QUEUE = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue"
const TOPIC_SUBMIT_RESULT = "Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Submit_Result"

const STATUS_PILLS = ['ALL', 'PENDING_SAMPLING', 'IN_TESTING']

const STATUS_BADGE_MAP = {
  'IN_TESTING':       { label: 'In Testing',  className: 'bg-purple-50 text-purple-700 border-purple-200' },
  'PENDING_SAMPLING': { label: 'Pending',      className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'QUARANTINE':       { label: 'Pending',      className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'PASS':             { label: 'Pass',         className: 'bg-green-50 text-green-700 border-green-200' },
  'FAIL':             { label: 'Fail',         className: 'bg-red-50 text-red-700 border-red-200' },
}

function getStatusBadge(status) {
  const s = (status || '').toUpperCase()
  const cfg = STATUS_BADGE_MAP[s]
  if (cfg) return <Badge variant="outline" className={`${cfg.className} rounded-sm`}>{cfg.label}</Badge>
  return <Badge variant="outline" className="text-slate-500 border-slate-200 rounded-sm">{status}</Badge>
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

export default function QASamples() {
  const navigate = useNavigate()
  const { data, publish } = useGlobalUNS()

  const [searchText, setSearchText] = useState('')
  const [activeStatus, setActiveStatus] = useState('ALL')
  const [selectedSample, setSelectedSample] = useState(null)
  const [labValues, setLabValues] = useState({ viscosity: '', ph: '', purity: '' })
  const [labOutcome, setLabOutcome] = useState('PASS')
  const [submissionSuccess, setSubmissionSuccess] = useState(null)

  const allSamples = useMemo(() => {
    const rawData = data?.raw?.[TOPIC_QC_QUEUE]
    const items = rawData?.items ?? (Array.isArray(rawData) ? rawData : [])
    const rawSamples = Array.isArray(items) ? items : []
    return rawSamples.map((sample, index) => ({
      id: sample.sample_id || `QA-${index}`,
      material: sample.sku || 'N/A',
      desc: sample.desc || '',
      batch: sample.batch_id || 'N/A',
      qty: sample.qty || '0',
      status: sample.status || 'PENDING_SAMPLING',
      location: sample.location || 'DOCK',
      doc_id: sample.doc_id || '-',
      supplier: sample.supplier || '-'
    }))
  }, [data.raw])

  const samples = useMemo(() => {
    let filtered = allSamples
    if (activeStatus !== 'ALL') {
      filtered = filtered.filter(s => {
        const st = s.status.toUpperCase()
        if (activeStatus === 'PENDING_SAMPLING') return st === 'PENDING_SAMPLING' || st === 'QUARANTINE' || st === 'PENDING'
        return st === activeStatus
      })
    }
    if (searchText) {
      const q = searchText.toLowerCase()
      filtered = filtered.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.batch.toLowerCase().includes(q) ||
        s.material.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [allSamples, activeStatus, searchText])

  const statusCounts = useMemo(() => {
    const counts = { ALL: allSamples.length, PENDING_SAMPLING: 0, IN_TESTING: 0 }
    allSamples.forEach(s => {
      const st = s.status.toUpperCase()
      if (st === 'PENDING_SAMPLING' || st === 'QUARANTINE' || st === 'PENDING') counts.PENDING_SAMPLING++
      else if (st === 'IN_TESTING') counts.IN_TESTING++
    })
    return counts
  }, [allSamples])

  const kpiData = useMemo(() => ({
    pending: allSamples.length,
    priority: allSamples.filter(s => s.status.includes('PRIORITY')).length,
    onHold: 0,
    avgTime: '45m'
  }), [allSamples])

  useEffect(() => {
    if (!selectedSample) return
    const updated = allSamples.find(s => s.id === selectedSample.id)
    if (updated) setSelectedSample(updated)
  }, [allSamples])

  const handleSelectSample = (sample) => {
    setSelectedSample(sample)
    setLabValues({ viscosity: '', ph: '', purity: '' })
    setLabOutcome('PASS')
    setSubmissionSuccess(null)
  }

  const handleSubmitResults = () => {
    if (!selectedSample) return

    const payload = {
      batch_id: selectedSample.batch,
      sku: selectedSample.material,
      result: labOutcome,
      lab_data: {
        viscosity: labValues.viscosity,
        ph: labValues.ph,
        purity: labValues.purity,
        tested_at: Date.now()
      },
      technician: "Selene Morgan"
    }

    publish(TOPIC_SUBMIT_RESULT, payload)

    setSubmissionSuccess({
      batch: selectedSample.batch,
      material: selectedSample.material,
      outcome: labOutcome,
      doc_id: selectedSample.doc_id
    })
  }

  const handleTestNext = () => {
    setSelectedSample(null)
    setSubmissionSuccess(null)
    setLabValues({ viscosity: '', ph: '', purity: '' })
    setLabOutcome('PASS')
  }

  return (
    <PageContainer title="QA Samples" subtitle="Lab Interface: Record test results" variant="compact">
      <div className="flex gap-0 h-[calc(100vh-120px)] min-h-[500px]">

        {/* ═══════════ LEFT PANEL ═══════════ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">

            <UNSConnectionInfo topic={TOPIC_QC_QUEUE} />

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard label="Pending Tests" value={kpiData.pending} icon={FlaskConical} colorClass="text-amber-600" />
              <KPICard label="High Priority" value={kpiData.priority} icon={AlertCircle} colorClass="text-red-600" />
              <KPICard label="On Hold" value={kpiData.onHold} icon={PauseCircle} colorClass="text-slate-600" />
              <KPICard label="Avg Turnaround" value={kpiData.avgTime} icon={Clock} colorClass="text-blue-600" />
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
                    {s === 'ALL' ? 'All' : s === 'PENDING_SAMPLING' ? 'Pending' : 'In Testing'}
                    <span className="ml-1 opacity-70">({statusCounts[s] || 0})</span>
                  </button>
                ))}
              </div>
              <div className="relative w-64 shrink-0">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search batch or sample..."
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
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Batch</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Source PO</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase">Supplier</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase text-center">Status</TableHead>
                    <TableHead className="h-9 text-[10px] font-bold text-slate-500 uppercase text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samples.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-40 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2 py-8">
                          <Box className="h-10 w-10 text-slate-200" />
                          <span className="text-sm font-medium text-slate-600">No samples waiting for testing</span>
                          <span className="text-xs text-slate-400">All caught up!</span>
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
                          <TableCell className="font-mono text-xs text-blue-600 font-bold">{item.id}</TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900 text-xs">{item.material}</div>
                            {item.desc && <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[140px]">{item.desc}</div>}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-700">{item.batch}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{item.doc_id}</TableCell>
                          <TableCell className="text-xs text-slate-500 truncate max-w-[100px]">{item.supplier}</TableCell>
                          <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                          <TableCell className="text-xs text-slate-700 text-right font-mono">{item.qty}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL: Lab Workbench ═══════════ */}
        {selectedSample && (
          <div className="w-[440px] shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden ml-0">

            {submissionSuccess ? (
              /* --- SUCCESS STATE --- */
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="bg-white p-8 rounded-xl text-center max-w-sm w-full">
                  <div className="mx-auto h-16 w-16 bg-[#b2ed1d]/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="h-8 w-8 text-[#65a30d]" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Results Submitted</h2>
                  <p className="text-slate-500 text-sm mb-6">
                    Batch <span className="font-mono font-bold">{submissionSuccess.batch}</span> is now awaiting manager approval.
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
                      <span className="text-slate-500">Lab Result</span>
                      <Badge variant="outline" className={`text-[10px] ${submissionSuccess.outcome === 'PASS' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {submissionSuccess.outcome}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Source PO</span>
                      <span className="font-mono text-slate-700">{submissionSuccess.doc_id}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      className="w-full h-9 text-xs gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                      onClick={() => navigate('/qc/worklist')}
                    >
                      Go to QA Decisions <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs gap-2 border-slate-200"
                      onClick={() => navigate('/operations/inbound/orders')}
                    >
                      View Inbound Order <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-9 text-xs"
                      onClick={handleTestNext}
                    >
                      Test Next Sample
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
                        {getStatusBadge(selectedSample.status)}
                      </div>
                      <p className="text-xs text-slate-500">Batch: <span className="font-mono font-bold text-slate-700">{selectedSample.batch}</span></p>
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

                  {/* Sample Info Card */}
                  <div className="mx-5 mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Package className="h-3 w-3" /> Material Details
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
                        <span className="text-slate-500">Quantity</span>
                        <span className="font-mono font-medium text-slate-800">{selectedSample.qty}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Source PO</span>
                        <span className="font-mono text-slate-700">{selectedSample.doc_id}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Supplier</span>
                        <span className="text-slate-700">{selectedSample.supplier}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Location</span>
                        <span className="text-slate-700">{selectedSample.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lab Results Form */}
                  <div className="mx-5 mt-4">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <TestTube2 className="h-3 w-3" /> Lab Results Entry
                    </h4>

                    {/* PASS / FAIL Toggle */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div
                        onClick={() => setLabOutcome('PASS')}
                        className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-1.5 transition-all ${
                          labOutcome === 'PASS'
                            ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                            : 'border-slate-100 bg-white hover:border-slate-300'
                        }`}
                      >
                        <CheckCircle className={`h-6 w-6 ${labOutcome === 'PASS' ? 'text-green-600' : 'text-slate-300'}`} />
                        <span className={`font-bold text-xs ${labOutcome === 'PASS' ? 'text-green-700' : 'text-slate-400'}`}>PASS</span>
                      </div>
                      <div
                        onClick={() => setLabOutcome('FAIL')}
                        className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center gap-1.5 transition-all ${
                          labOutcome === 'FAIL'
                            ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                            : 'border-slate-100 bg-white hover:border-slate-300'
                        }`}
                      >
                        <XCircle className={`h-6 w-6 ${labOutcome === 'FAIL' ? 'text-red-600' : 'text-slate-300'}`} />
                        <span className={`font-bold text-xs ${labOutcome === 'FAIL' ? 'text-red-700' : 'text-slate-400'}`}>FAIL</span>
                      </div>
                    </div>

                    {/* Test Values */}
                    <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-slate-600 uppercase">Viscosity (cP)</Label>
                          <Input
                            className="h-8 text-xs bg-white border-slate-200"
                            placeholder="e.g. 2000"
                            value={labValues.viscosity}
                            onChange={(e) => setLabValues({ ...labValues, viscosity: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-slate-600 uppercase">pH Level</Label>
                          <Input
                            className="h-8 text-xs bg-white border-slate-200"
                            placeholder="e.g. 7.2"
                            value={labValues.ph}
                            onChange={(e) => setLabValues({ ...labValues, ph: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold text-slate-600 uppercase">Purity / Notes</Label>
                        <Input
                          className="h-8 text-xs bg-white border-slate-200"
                          placeholder="e.g. 99.8% - Visual Inspection OK"
                          value={labValues.purity}
                          onChange={(e) => setLabValues({ ...labValues, purity: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- Footer --- */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 space-y-2">
                  <Button
                    className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 text-xs"
                    onClick={handleSubmitResults}
                  >
                    <TestTube2 className="h-4 w-4 mr-2" /> Submit Lab Results
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
