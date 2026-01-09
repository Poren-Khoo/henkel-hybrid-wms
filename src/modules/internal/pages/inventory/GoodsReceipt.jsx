import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { Checkbox } from '../../../../components/ui/checkbox'
import { Badge } from '../../../../components/ui/badge'
import { Textarea } from '../../../../components/ui/textarea'
import { Separator } from '../../../../components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
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
  Info
} from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_INBOUND_PLAN = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inbound_Plan"
const TOPIC_ACTION_RECEIPT = "Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Post_Goods_Receipt"

export default function GoodsReceipt() {
  const { data, publish } = useGlobalUNS()
  
  // STATES
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [isManual, setIsManual] = useState(false)
  const [submissionSuccess, setSubmissionSuccess] = useState(null)

  // FORM DATA
  const [headerData, setHeaderData] = useState({
    dock: 'DOCK-IN-01',
    truck: '',
    dnNumber: '',
    hasCoa: false,
    supplier: ''
  })

  const [lines, setLines] = useState([])

  const [inspection, setInspection] = useState({
    packagingOk: true,
    labelMatch: true,
    noLeaks: true,
    notes: ''
  })
  
  const [outcome, setOutcome] = useState('ACCEPT_QUARANTINE') 

  // --- DATA FETCHING ---
  const livePendingDocs = useMemo(() => {
    const rawData = data.raw[TOPIC_INBOUND_PLAN]?.asns || []
    return rawData
      .filter(r => r.status === 'PENDING')
      .map(r => ({
        id: r.id,
        supplier: r.supplier,
        items: r.items || 1, 
        status: r.status,
        eta: r.eta || 'Today',
        type: r.type || 'ASN',
        sku: r.sku,
        desc: r.desc,
        qty: r.qty_expected
      }))
  }, [data])

  // --- ACTIONS ---
  const handleSelectASN = (doc) => {
    setSubmissionSuccess(null)
    setIsManual(false)
    setSelectedDoc(doc)
    
    setHeaderData({
      dock: 'DOCK-IN-01',
      truck: 'Simulated Truck', 
      dnNumber: doc.id,
      hasCoa: true,
      supplier: doc.supplier || ''
    })

    setLines([{
      id: 1,
      code: doc.sku || 'RES-001',
      desc: doc.desc || 'Phenolic Resin',
      batch: '', 
      containerId: '',
      qty: doc.qty || 500,
      uom: 'KG'
    }])
  }

  const handleStartManual = () => {
    setSubmissionSuccess(null)
    setIsManual(true)
    setSelectedDoc(null)
    setHeaderData({ dock: 'DOCK-IN-01', truck: '', dnNumber: '', hasCoa: false, supplier: '' })
    setLines([{ id: 1, code: '', desc: '', batch: '', containerId: '', qty: '', uom: 'KG' }])
  }

  const addLine = () => setLines([...lines, { id: Date.now(), code: '', desc: '', batch: '', containerId: '', qty: '', uom: 'KG' }])
  const removeLine = (id) => setLines(lines.filter(l => l.id !== id))
  const updateLine = (id, field, val) => setLines(lines.map(l => l.id === id ? { ...l, [field]: val } : l))

  const handleSubmit = () => {
    const payload = {
      doc_id: selectedDoc ? selectedDoc.id : headerData.dnNumber,
      dock: headerData.dock,
      lines: lines,
      outcome: outcome,
      operator: "CurrentUser" 
    }

    publish(TOPIC_ACTION_RECEIPT, payload)

    const newInvId = "INV-" + Math.floor(Math.random() * 10000)
    const newTaskId = outcome === 'REJECT' ? null : "PT-" + Math.floor(Math.random() * 10000)

    setSubmissionSuccess({
      invId: newInvId,
      taskId: newTaskId,
      outcome: outcome,
      location: outcome === 'REJECT' ? 'REJECT-ZONE' : headerData.dock,
      docId: selectedDoc ? selectedDoc.id : headerData.dnNumber
    })
  }

  return (
    <PageContainer title="Goods Receipt" subtitle="Inbound processing: Receive via ASN or Manual Entry">
      
      {/* CONNECTION STATUS */}
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
                      ? 'bg-white border-[#a3e635] shadow-md ring-1 ring-[#a3e635] z-10' 
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
                    <Truck className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{doc.supplier}</span>
                  </div>
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                     <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-blue-50 text-blue-700 border-blue-100 rounded-sm">ASN</Badge>
                     <span className="text-[10px] text-slate-400">{doc.qty} KG Expected</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* === RIGHT PANEL: WORKSPACE === */}
        <Card className="flex-1 border-slate-200 shadow-sm flex flex-col overflow-hidden bg-white">
          
          {/* SUCCESS STATE */}
          {submissionSuccess ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 animate-in fade-in zoom-in duration-300">
              <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100 text-center max-w-sm w-full">
                <div className="mx-auto h-16 w-16 bg-[#a3e635]/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-8 w-8 text-[#65a30d]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Receipt Posted</h2>
                <p className="text-slate-500 text-sm mb-6">Inventory created and tasks generated.</p>
                
                <div className="bg-slate-50 rounded-md p-4 text-left space-y-2 mb-6 border border-slate-100 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Stock ID:</span> <span className="font-mono font-bold text-slate-900">{submissionSuccess.invId}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Location:</span> <span className="font-medium text-slate-900">{submissionSuccess.location}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Outcome:</span> 
                    <Badge variant="outline" className="text-[10px] bg-white border-slate-200">{submissionSuccess.outcome}</Badge>
                  </div>
                </div>

                <Button className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2" onClick={() => { setSubmissionSuccess(null); setSelectedDoc(null); }}>
                  Process Next
                </Button>
              </div>
            </div>
          ) : (
            // EMPTY STATE
            (!selectedDoc && !isManual) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Truck className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-base font-semibold text-slate-700">Waiting for Selection</h3>
                <p className="text-sm text-slate-400 mt-1">Select an ASN or start manually.</p>
              </div>
            ) : (
              // ACTIVE FORM
              <div className="flex flex-col h-full">
                
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-slate-900 font-mono tracking-tight">
                        {isManual ? 'MANUAL-RECEIPT' : selectedDoc.id}
                      </h2>
                      <Badge variant="outline" className={isManual ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                        {isManual ? 'AD-HOC' : 'ASN LINKED'}
                      </Badge>
                    </div>
                    {!isManual && <div className="text-xs text-slate-500 mt-1 font-medium">{headerData.supplier || selectedDoc.supplier}</div>}
                  </div>
                  
                  <div className="w-[180px]">
                    <Label className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1 block">Target Dock</Label>
                    <Select defaultValue={headerData.dock} onValueChange={v => setHeaderData({...headerData, dock: v})}>
                      <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOCK-IN-01">DOCK-IN-01 (General)</SelectItem>
                        <SelectItem value="DOCK-IN-02">DOCK-IN-02 (Hazmat)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* FORM CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                  
                  {/* ARRIVAL DATA */}
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

                  {/* MATERIAL LINES */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                      <Label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-slate-500" /> Received Materials
                      </Label>
                      <Button variant="ghost" size="sm" onClick={addLine} className="text-[#65a30d] hover:text-[#4d7c0f] hover:bg-[#a3e635]/10 h-8 text-xs font-semibold">
                        <Plus className="h-3 w-3 mr-1" /> Add Line
                      </Button>
                    </div>
                    
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
                            <TableHead className="w-[30%] text-[10px] uppercase font-bold text-slate-500 h-9">Material Info</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-slate-500 h-9">Vendor Batch</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold text-slate-500 h-9">HU / Label</TableHead>
                            <TableHead className="w-[15%] text-[10px] uppercase font-bold text-slate-500 h-9">Qty Received</TableHead>
                            <TableHead className="w-[40px] h-9"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lines.map((line) => (
                            <TableRow key={line.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                              <TableCell className="py-2 align-top">
                                <Input className="h-8 font-mono text-xs font-bold text-slate-900 border-slate-200 mb-1" placeholder="SKU" value={line.code} onChange={e => updateLine(line.id, 'code', e.target.value)} />
                                <Input className="h-7 text-[10px] text-slate-500 bg-slate-50 border-transparent focus:bg-white focus:border-slate-200" placeholder="Description" value={line.desc} onChange={e => updateLine(line.id, 'desc', e.target.value)} />
                              </TableCell>
                              <TableCell className="py-2 align-top">
                                <Input className="h-8 text-xs border-slate-200" placeholder="Batch ID" value={line.batch} onChange={e => updateLine(line.id, 'batch', e.target.value)} />
                              </TableCell>
                              <TableCell className="py-2 align-top">
                                <div className="flex gap-1">
                                  <Input className="h-8 text-xs border-slate-200" placeholder="Scan Label" value={line.containerId} onChange={e => updateLine(line.id, 'containerId', e.target.value)} />
                                  <Button size="icon" variant="outline" className="h-8 w-8 shrink-0 border-slate-200"><ScanLine className="h-3 w-3 text-slate-500" /></Button>
                                </div>
                              </TableCell>
                              <TableCell className="py-2 align-top">
                                <div className="relative">
                                  <Input type="number" className="h-8 text-xs pr-8 border-slate-200 font-medium" value={line.qty} onChange={e => updateLine(line.id, 'qty', e.target.value)} />
                                  <div className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">KG</div>
                                </div>
                              </TableCell>
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

                  {/* INSPECTION & DISPOSITION */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-2">
                    
                    {/* Checklist Card */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                      <CardHeader className="pb-3 pt-4 border-b border-slate-50">
                          <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Inspection Checklist</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox id="chk1" checked={inspection.packagingOk} onCheckedChange={c => setInspection({...inspection, packagingOk: c})} className="border-slate-300 data-[state=checked]:bg-[#a3e635] data-[state=checked]:text-slate-900 data-[state=checked]:border-[#a3e635]" />
                          <Label htmlFor="chk1" className="text-sm font-medium text-slate-700 cursor-pointer">Packaging Intact</Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Checkbox id="chk2" checked={inspection.noLeaks} onCheckedChange={c => setInspection({...inspection, noLeaks: c})} className="border-slate-300 data-[state=checked]:bg-[#a3e635] data-[state=checked]:text-slate-900 data-[state=checked]:border-[#a3e635]" />
                          <Label htmlFor="chk2" className="text-sm font-medium text-slate-700 cursor-pointer">No Leaks or Spills</Label>
                        </div>
                        <div className="mt-2">
                          <Textarea 
                            placeholder="Add notes for QC..." 
                            className="h-16 text-xs resize-none bg-slate-50 border-slate-200 focus:bg-white"
                            value={inspection.notes}
                            onChange={e => setInspection({...inspection, notes: e.target.value})}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Decision Card (Visual Selection) */}
                    <Card className="border-slate-200 shadow-sm bg-white">
                      <CardHeader className="pb-3 pt-4 border-b border-slate-50">
                          <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Disposition</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-3">
                        
                        <div 
                          onClick={() => setOutcome('ACCEPT_QUARANTINE')}
                          className={`
                            cursor-pointer p-3 rounded-md border transition-all flex items-center gap-3
                            ${outcome === 'ACCEPT_QUARANTINE' ? 'bg-[#a3e635]/10 border-[#a3e635]' : 'bg-white border-slate-200 hover:border-slate-300'}
                          `}
                        >
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${outcome === 'ACCEPT_QUARANTINE' ? 'border-[#65a30d]' : 'border-slate-300'}`}>
                            {outcome === 'ACCEPT_QUARANTINE' && <div className="h-2 w-2 rounded-full bg-[#65a30d]" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">Accept to Quarantine</div>
                            <div className="text-[10px] text-slate-500">Material unloaded. QC required.</div>
                          </div>
                        </div>

                        <div 
                          onClick={() => setOutcome('REJECT')}
                          className={`
                            cursor-pointer p-3 rounded-md border transition-all flex items-center gap-3
                            ${outcome === 'REJECT' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 hover:border-slate-300'}
                          `}
                        >
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
                  <Button variant="ghost" onClick={() => setSelectedDoc(null)} className="text-slate-500 hover:text-slate-900">Cancel</Button>
                  <Button 
                    className={`min-w-[160px] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2 transition-all
                      ${outcome === 'REJECT' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[#a3e635] hover:bg-[#8cd121] text-slate-900"}
                    `}
                    onClick={handleSubmit}
                  >
                    {outcome === 'REJECT' ? (
                      <>
                        <XCircle className="h-4 w-4" /> Confirm Rejection
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Post Goods Receipt
                      </>
                    )}
                  </Button>
                </div>

              </div>
            )
          )}
        </Card>
      </div>
    </PageContainer>
  )
}