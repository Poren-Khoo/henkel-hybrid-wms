import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Checkbox } from '../../../components/ui/checkbox'
import { Badge } from '../../../components/ui/badge'
import { Textarea } from '../../../components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { 
  Truck, 
  PackageCheck, 
  Plus, 
  ScanLine, 
  Save, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertTriangle,
  CalendarDays,
  Loader2,
  Factory, // New Icon
  Clock,   // New Icon
  Box,     // New Icon
  QrCode   // New Icon
} from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { MaterialSelect } from '../../../components/selectors/Material'
import { ReceiptValidator, ReceiptValidationError } from '../../../domain/inbound/ReceiptValidator'
import { ReceiptService } from '../../../domain/inbound/ReceiptService'
import { InboundOrderValidator } from '../../../domain/inbound/InboundOrderValidator'

// TOPICS
const TOPIC_INBOUND_PLAN = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inbound_Plan"
const TOPIC_ACTION_RECEIPT = "Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Post_Goods_Receipt"
const TOPIC_MAT = "Henkelv2/Shanghai/Logistics/MasterData/State/Materials"

// HELPER: Reliable Local Date (YYYY-MM-DD)
const getTodayLocal = () => new Date().toLocaleDateString('en-CA')

export default function Receiving() {
  const { data, publish } = useGlobalUNS()
  
  // --- STATE ---
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [isManual, setIsManual] = useState(false)
  const [submissionSuccess, setSubmissionSuccess] = useState(null)
  const [overReceiptWarning, setOverReceiptWarning] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false) 

  // --- FORM DATA (Extended for Manufacturing) ---
  const [headerData, setHeaderData] = useState({
    dock: 'DOCK-IN-01',
    truck: '',
    dnNumber: '',
    // Manufacturing specific fields
    prodLine: '',
    shift: 'SHIFT-A',
    
    hasCoa: false,
    supplier: ''
  })

  const [lines, setLines] = useState([])

  const [inspection, setInspection] = useState({
    packagingOk: true,
    noLeaks: true,
    notes: ''
  })
  
  const [outcome, setOutcome] = useState('ACCEPT_QUARANTINE') 

  // --- 1. OPTIMIZED DATA MEMOIZATION ---
  const materialMap = useMemo(() => {
    const packet = data?.raw?.[TOPIC_MAT]
    if (!packet) return new Map()
    let list = (packet.topics?.[0]?.value) ?? (Array.isArray(packet) ? packet : packet.items) ?? []
    if (!Array.isArray(list)) list = []
    return new Map(list.map(m => [m.code, m]))
  }, [data.raw])

  // --- 2. ROBUST INBOUND QUEUE ---
  const livePendingDocs = useMemo(() => {
    const raw = data?.raw?.[TOPIC_INBOUND_PLAN]?.asns
    let rawData = Array.isArray(raw) ? raw : []
    return rawData
      .filter(r => r?.status === 'PLANNED' || r?.status === 'PENDING')
      .map(r => ({
        id: r.id,
        supplier: r.supplier,
        itemsCount: Array.isArray(r.lines) ? r.lines.length : 1, 
        status: r.status,
        eta: r.eta || 'Today',
        type: r.type || 'ASN',
        // Preserve FULL line data
        lines: r.lines || [{ code: r.sku, desc: r.desc, qty: r.qty_expected || r.qty }] 
      }))
  }, [data.raw])

  // --- ACTIONS ---

  const resetForm = () => {
    setSelectedDoc(null)
    setIsManual(false)
    setOverReceiptWarning(null)
    setSubmissionSuccess(null)
    setIsSubmitting(false)
    // Reset all fields including new Mfg ones
    setHeaderData({ dock: 'DOCK-IN-01', truck: '', dnNumber: '', prodLine: '', shift: 'SHIFT-A', hasCoa: false, supplier: '' })
    setLines([])
    setInspection({ packagingOk: true, noLeaks: true, notes: '' })
    setOutcome('ACCEPT_QUARANTINE')
  }

  const handleSelectASN = (doc) => {
    resetForm() 
    setIsManual(false)
    setSelectedDoc(doc)
    
    // Auto-fill context based on type
    setHeaderData(prev => ({
      ...prev,
      truck: InboundOrderValidator.isManufacturing(doc.type) ? '' : 'Simulated Truck', 
      dnNumber: doc.id,
      prodLine: InboundOrderValidator.isManufacturing(doc.type) ? (doc.supplier || 'LINE-01') : '', // If Mfg, Supplier field usually holds Line ID
      hasCoa: true,
      supplier: doc.supplier || ''
    }))

    const mappedLines = (doc.lines || []).map((l, idx) => ({
      id: crypto.randomUUID(), 
      code: l.code || '',
      desc: l.desc || '', 
      batch: '', 
      mfgDate: getTodayLocal(), 
      containerId: '', // Blank by default, user must scan or gen
      qty: l.qty || l.qty_expected || 0,
      uom: 'KG' 
    }))

    setLines(mappedLines)
  }

  const handleStartManual = () => {
    resetForm()
    setIsManual(true)
    setLines([{ id: crypto.randomUUID(), code: '', desc: '', batch: '', mfgDate: getTodayLocal(), containerId: '', qty: '', uom: 'KG' }])
  }

  const addLine = () => {
    setLines(prev => [...prev, { 
      id: crypto.randomUUID(), 
      code: '', desc: '', batch: '', mfgDate: getTodayLocal(), containerId: '', qty: '', uom: 'KG' 
    }])
  }

  const removeLine = (id) => setLines(prev => prev.filter(l => l.id !== id))
  
  const updateLine = (id, field, val) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l))
  }

  const handleMaterialChange = (id, code) => {
    const matInfo = materialMap.get(code)
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l
      return {
        ...l,
        code: code,
        desc: matInfo?.desc || '',
        uom: matInfo?.uom || 'KG'
      }
    }))
  }

  // --- NEW FEATURE: GENERATE LPN ---
  const generateLPN = (id) => {
    const newLPN = "PLT-" + Math.floor(Math.random() * 100000);
    updateLine(id, 'containerId', newLPN);
  }

  const handleSubmit = (force = false) => {
    try {
      // 1. DDD Validation using domain validator
      const orderType = selectedDoc ? selectedDoc.type : 'MANUAL'
      const isMfg = InboundOrderValidator.isManufacturing(orderType)
      
      ReceiptValidator.validateCreate({
        lines: lines,
        headerData: headerData,
        orderType: orderType,
        isManufacturing: isMfg,
        isManual: isManual
      })

      // 2. Over-receipt tolerance check (business rule)
      if (!isManual && !force && selectedDoc) {
        const warning = ReceiptService.checkOverReceiptForReceipt(lines, selectedDoc)
        if (warning) {
          setOverReceiptWarning(warning)
          return
        }
      }

      // 3. Build MQTT command using service
      setIsSubmitting(true)

      const payload = ReceiptService.buildReceiptCommand({
        docId: selectedDoc ? selectedDoc.id : headerData.dnNumber,
        orderType: orderType,
        headerData: headerData,
        lines: lines,
        outcome: outcome,
        inspection: inspection,
        operator: "CurrentUser"
      })

      publish(TOPIC_ACTION_RECEIPT, payload)

      setTimeout(() => {
        setSubmissionSuccess({
          invId: "INV-" + Math.floor(Math.random() * 10000),
          outcome: outcome,
          location: outcome === 'REJECT' ? 'REJECT-ZONE' : headerData.dock,
          docId: selectedDoc ? selectedDoc.id : headerData.dnNumber
        })
        setOverReceiptWarning(null)
        setIsSubmitting(false)
      }, 500)
    } catch (error) {
      if (error instanceof ReceiptValidationError) {
        alert(error.message)
        return
      }
      // Re-throw unexpected errors
      throw error
    }
  }

  return (
    <PageContainer title="Receiving Ops" subtitle="Inbound processing: Receive via ASN or Manual Entry">
      
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <UNSConnectionInfo topic={TOPIC_INBOUND_PLAN} />
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)] min-h-[600px]">
        
        {/* === LEFT PANEL: INBOUND QUEUE === */}
        <Card className="w-full lg:w-[320px] border-slate-200 shadow-sm flex flex-col shrink-0">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Inbound Queue</CardTitle>
              <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 font-mono">
                {livePendingDocs.length} PENDING
              </Badge>
            </div>
          </CardHeader>
          
          <div className="p-3 border-b border-slate-100 bg-white">
            <Button 
              variant={isManual ? "default" : "outline"}
              onClick={handleStartManual} 
              className={`w-full justify-center gap-2 font-medium shadow-sm transition-all h-10 border-dashed
                ${isManual ? "bg-slate-900 text-white" : "bg-white text-slate-600 border-slate-300 hover:border-slate-400 hover:bg-slate-50"}
              `}
            >
              <Plus className="h-4 w-4" />
              <span>Manual Receipt</span>
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
            {livePendingDocs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <RefreshCw className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                <p className="text-xs font-medium text-slate-500">No Pending ASNs</p>
              </div>
            ) : (
              livePendingDocs.map(doc => (
                <div 
                  key={doc.id} 
                  onClick={() => handleSelectASN(doc)}
                  className={`
                    relative p-3 rounded-lg border cursor-pointer transition-all duration-200 group
                    ${selectedDoc?.id === doc.id 
                      ? 'bg-white border-[#b2ed1d] shadow-md ring-1 ring-[#b2ed1d] z-10' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-xs font-bold text-slate-900">{doc.id}</span>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                      {doc.eta}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
                    {/* Dynamic Icon based on Type */}
                    {InboundOrderValidator.isManufacturing(doc.type) ? <Factory className="h-3 w-3 text-emerald-600" /> : <Truck className="h-3 w-3" />}
                    <span className="truncate max-w-[150px]">{doc.supplier}</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[9px] h-4 px-1.5 border rounded-sm ${InboundOrderValidator.isManufacturing(doc.type) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                        {doc.type}
                      </Badge>
                      <span className="text-[10px] text-slate-400">{doc.itemsCount} Line(s)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* === RIGHT PANEL: WORKSPACE === */}
        <Card className="flex-1 border-slate-200 shadow-sm flex flex-col overflow-hidden bg-white">
          
          {submissionSuccess ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 animate-in fade-in zoom-in duration-300">
              <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100 text-center max-w-sm w-full">
                <div className="mx-auto h-16 w-16 bg-[#b2ed1d]/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-8 w-8 text-[#65a30d]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Receipt Posted</h2>
                <p className="text-slate-500 text-sm mb-6">Inventory created and tasks generated.</p>
                <div className="bg-slate-50 rounded-md p-4 text-left space-y-2 mb-6 border border-slate-100 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Stock ID:</span> <span className="font-mono font-bold text-slate-900">{submissionSuccess.invId}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Location:</span> <span className="font-medium text-slate-900">{submissionSuccess.location}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Outcome:</span> <Badge variant="outline" className="text-[10px] bg-white border-slate-200">{submissionSuccess.outcome}</Badge></div>
                </div>
                <Button className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2" onClick={resetForm}>
                  Process Next
                </Button>
              </div>
            </div>
          ) : (!selectedDoc && !isManual) ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Truck className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-700">Waiting for Selection</h3>
              <p className="text-sm text-slate-400 mt-1">Select an ASN or start manually.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
                
                {/* --- OVER RECEIPT WARNING --- */}
                {overReceiptWarning && (
                    <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-900">Over-Receipt Warning</h4>
                                <p className="text-xs text-amber-700">
                                    Received <strong>{overReceiptWarning.received}</strong> vs Expected <strong>{overReceiptWarning.expected}</strong>.
                                    Variance: +{overReceiptWarning.diff}%
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setOverReceiptWarning(null)} className="bg-white">Cancel</Button>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleSubmit(true)}>Confirm Anyway</Button>
                        </div>
                    </div>
                )}

              {/* === UNIVERSAL HEADER (Polymorphic) === */}
              <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-900 font-mono tracking-tight">
                      {isManual ? 'MANUAL-RECEIPT' : selectedDoc.id}
                    </h2>
                    <Badge variant="outline" className={isManual ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                      {isManual ? 'AD-HOC' : selectedDoc.type}
                    </Badge>
                  </div>
                  {!isManual && <div className="text-xs text-slate-500 mt-1 font-medium">{headerData.supplier || selectedDoc.supplier}</div>}
                </div>
                
                {/* DYNAMIC CONTEXT SWITCHER */}
                <div className="flex gap-4">
                    {/* Show DOCK for Commercial, LINE for Manufacturing */}
                    {InboundOrderValidator.isManufacturing(selectedDoc?.type) ? (
                        <>
                            <div className="w-[140px]">
                                <Label className="text-[10px] uppercase text-emerald-600 font-bold tracking-wider mb-1 block">Prod Line</Label>
                                <Input value={headerData.prodLine} onChange={e => setHeaderData({...headerData, prodLine: e.target.value})} className="h-8 text-xs font-bold text-emerald-800 bg-emerald-50 border-emerald-100" />
                            </div>
                            <div className="w-[120px]">
                                <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1 block">Shift</Label>
                                <Select value={headerData.shift} onValueChange={v => setHeaderData({...headerData, shift: v})}>
                                    <SelectTrigger className="h-8 text-xs bg-slate-50"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SHIFT-A">Shift A (Day)</SelectItem>
                                        <SelectItem value="SHIFT-B">Shift B (Night)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    ) : (
                        <div className="w-[180px]">
                            <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1 block">Target Dock</Label>
                            <Select value={headerData.dock} onValueChange={v => setHeaderData(h => ({...h, dock: v}))}>
                                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="DOCK-IN-01">DOCK-IN-01 (General)</SelectItem>
                                <SelectItem value="DOCK-IN-02">DOCK-IN-02 (Hazmat)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
              </div>

              {/* FORM CONTENT */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                
                {/* ARRIVAL DATA (CONDITIONAL) */}
                {!InboundOrderValidator.isManufacturing(selectedDoc?.type) && (
                    <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Truck / License Plate</Label>
                            <Input placeholder="e.g. 沪A-88291" value={headerData.truck} onChange={e => setHeaderData({...headerData, truck: e.target.value})} className="bg-white border-slate-200 h-9" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Delivery Note (DN)</Label>
                            <Input placeholder="DN Number" value={headerData.dnNumber} onChange={e => setHeaderData({...headerData, dnNumber: e.target.value})} className="bg-white border-slate-200 h-9" />
                        </div>
                    </div>
                )}

                {/* MATERIAL LINES */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                    <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <PackageCheck className="h-4 w-4 text-slate-500" /> Received Materials
                    </Label>
                    <Button variant="ghost" size="sm" onClick={addLine} className="text-[#65a30d] hover:text-[#4d7c0f] hover:bg-[#b2ed1d]/10 h-8 text-xs font-semibold">
                      <Plus className="h-3 w-3 mr-1" /> Add Line
                    </Button>
                  </div>
                  
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                          <TableHead className="w-[25%] text-[10px] uppercase font-bold text-slate-500 h-9">Material Info</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold text-slate-500 h-9">Batch ID</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold text-slate-500 h-9">Mfg Date</TableHead>
                          {/* NEW COLUMN: ASSET / LPN */}
                          <TableHead className="w-[20%] text-[10px] uppercase font-bold text-slate-500 h-9">Asset / LPN</TableHead>
                          <TableHead className="w-[12%] text-[10px] uppercase font-bold text-slate-500 h-9">Qty</TableHead>
                          <TableHead className="w-[40px] h-9"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line) => (
                          <TableRow key={line.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                            {/* 1. Material */}
                            <TableCell className="py-2 align-top">
                              <div className="mb-1">
                                <MaterialSelect 
                                  value={line.code}
                                  className="h-8 text-xs"
                                  onChange={(val) => handleMaterialChange(line.id, val)}
                                />
                              </div>
                              <Input className="h-7 text-[10px] text-slate-500 bg-slate-50 border-transparent" placeholder="Description" value={line.desc} disabled />
                            </TableCell>
                            {/* 2. Batch */}
                            <TableCell className="py-2 align-top">
                              <Input className="h-8 text-xs border-slate-200" placeholder="Batch / Lot" value={line.batch} onChange={e => updateLine(line.id, 'batch', e.target.value)} />
                            </TableCell>
                            {/* 3. Mfg Date */}
                            <TableCell className="py-2 align-top">
                                <div className="relative">
                                    <Input type="date" className="h-8 text-xs border-slate-200 pl-7" value={line.mfgDate} onChange={e => updateLine(line.id, 'mfgDate', e.target.value)} />
                                    <CalendarDays className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                                </div>
                            </TableCell>
                            {/* 4. ASSET / LPN (ENTERPRISE FEATURE) */}
                            <TableCell className="py-2 align-top">
                              <div className="flex gap-1">
                                <Input 
                                    className={`h-8 text-xs ${line.containerId.startsWith('PLT') ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-white'}`} 
                                    placeholder="Scan Asset or Gen LPN" 
                                    value={line.containerId} 
                                    onChange={e => updateLine(line.id, 'containerId', e.target.value)} 
                                />
                                {line.containerId ? (
                                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-slate-400" onClick={() => updateLine(line.id, 'containerId', '')}><XCircle className="h-3 w-3"/></Button>
                                ) : (
                                    <div className="flex gap-0.5">
                                        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 border-slate-200" title="Scan Asset"><ScanLine className="h-3 w-3 text-slate-500" /></Button>
                                        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 border-slate-200" title="Generate LPN" onClick={() => generateLPN(line.id)}><Box className="h-3 w-3 text-blue-500" /></Button>
                                    </div>
                                )}
                              </div>
                            </TableCell>
                            {/* 5. Qty */}
                            <TableCell className="py-2 align-top">
                              <div className="relative">
                                <Input type="number" className="h-8 text-xs pr-8 border-slate-200 font-medium" value={line.qty} onChange={e => updateLine(line.id, 'qty', e.target.value)} />
                                <div className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">{line.uom}</div>
                              </div>
                            </TableCell>
                            {/* 6. Remove */}
                            <TableCell className="py-2 align-top">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => removeLine(line.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* INSPECTION & DISPOSITION (Standard) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-2">
                  <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-3 pt-4 border-b border-slate-50">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Inspection Checklist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox id="chk1" checked={inspection.packagingOk} onCheckedChange={c => setInspection(x => ({...x, packagingOk: c === true}))} className="border-slate-300 data-[state=checked]:bg-[#b2ed1d] data-[state=checked]:text-slate-900" />
                        <Label htmlFor="chk1" className="text-sm font-medium text-slate-700">Packaging Intact</Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox id="chk2" checked={inspection.noLeaks} onCheckedChange={c => setInspection(x => ({...x, noLeaks: c === true}))} className="border-slate-300 data-[state=checked]:bg-[#b2ed1d] data-[state=checked]:text-slate-900" />
                        <Label htmlFor="chk2" className="text-sm font-medium text-slate-700">No Leaks or Spills</Label>
                      </div>
                      <Textarea placeholder="Add notes for QC..." className="h-16 text-xs resize-none bg-slate-50" value={inspection.notes} onChange={e => setInspection({...inspection, notes: e.target.value})} />
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-sm bg-white">
                    <CardHeader className="pb-3 pt-4 border-b border-slate-50">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Disposition</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-3">
                      <div onClick={() => setOutcome('ACCEPT_QUARANTINE')} className={`cursor-pointer p-3 rounded-md border transition-all flex items-center gap-3 ${outcome === 'ACCEPT_QUARANTINE' ? 'bg-[#b2ed1d]/10 border-[#b2ed1d]' : 'bg-white border-slate-200'}`}>
                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${outcome === 'ACCEPT_QUARANTINE' ? 'border-[#65a30d]' : 'border-slate-300'}`}>
                          {outcome === 'ACCEPT_QUARANTINE' && <div className="h-2 w-2 rounded-full bg-[#65a30d]" />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">Accept to Quarantine</div>
                          <div className="text-[10px] text-slate-500">Material unloaded. QC required.</div>
                        </div>
                      </div>
                      <div onClick={() => setOutcome('REJECT')} className={`cursor-pointer p-3 rounded-md border transition-all flex items-center gap-3 ${outcome === 'REJECT' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                        <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${outcome === 'REJECT' ? 'border-red-600' : 'border-slate-300'}`}>
                          {outcome === 'REJECT' && <div className="h-2 w-2 rounded-full bg-red-600" />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-red-900">Refuse Delivery</div>
                          <div className="text-[10px] text-slate-500">Driver turned away.</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* FOOTER */}
              <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 sticky bottom-0 z-10">
                <Button variant="ghost" onClick={resetForm} className="text-slate-500 hover:text-slate-900">Cancel</Button>
                <Button 
                  className={`min-w-[160px] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2 transition-all
                    ${outcome === 'REJECT' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[#b2ed1d] hover:bg-[#8cd121] text-slate-900"}
                  `}
                  disabled={isSubmitting} 
                  onClick={() => handleSubmit(false)}
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                  ) : outcome === 'REJECT' ? (
                    <><XCircle className="h-4 w-4" /> Confirm Rejection</>
                  ) : (
                    <><Save className="h-4 w-4" /> Post Goods Receipt</>
                  )}
                </Button>
              </div>

            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  )
}