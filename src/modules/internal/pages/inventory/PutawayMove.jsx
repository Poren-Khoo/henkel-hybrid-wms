import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Badge } from '../../../../components/ui/badge'
import { Label } from '../../../../components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { Textarea } from '../../../../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../../components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover"
import { 
  ArrowRight, 
  MapPin, 
  ScanLine, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Thermometer, 
  Clock, 
  Filter, 
  History, 
  Info,
  Lightbulb,
  Lock,
  XCircle,
  Layers,
  Box,
  Search
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_TASK_QUEUE = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue"
const TOPIC_ACTION_CONFIRM = "Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Confirm_Putaway"

// --- MOCK STRATEGY ENGINE (Preserved) ---
const STRATEGY_EXPLAINER = "We filter bins by hard constraints (status/zone, hazmat, temperature, capacity) then rank by proximity + consolidation."

const SUGGESTION_LOGIC = {
  'QUARANTINE': [
    { bin: 'ZONE-Q-01-A', type: 'Cage', reason: ['Status: Quarantine Only', 'Hazmat Safe'], capacity: '80%', distance: 'Near' },
    { bin: 'ZONE-Q-01-B', type: 'Cage', reason: ['Status: Quarantine Only', 'High Capacity'], capacity: '20%', distance: 'Mid' }
  ],
  'AVAILABLE': [
    { bin: 'RACK-A-04-02', type: 'Standard', reason: ['Consolidate: Same SKU', 'ABC: High Mover'], capacity: '45%', distance: 'Near' },
    { bin: 'RACK-B-12-01', type: 'Standard', reason: ['Empty Bin', 'Hazmat Compatible'], capacity: '0%', distance: 'Far' },
    { bin: 'RACK-C-01-01', type: 'Deep', reason: ['Overflow Area'], capacity: '10%', distance: 'Far' }
  ],
  'BLOCKED': [], 
  'EXCEPTION': [] 
}

// MOCK AUDIT TRAIL DATA GENERATOR (Preserved)
const generateAudit = (task) => [
  { event: 'TASK_CREATED', user: 'System', time: 'Today, 08:00', detail: 'Received from GR' },
  { event: 'STRATEGY_RUN', user: 'System', time: 'Today, 08:05', detail: 'Applied: HAZMAT_STRICT' },
  ...(task.status === 'EXCEPTION' ? [{ event: 'EXCEPTION_RAISED', user: 'Operator', time: 'Today, 09:15', detail: 'Bin Damaged' }] : [])
]

export default function PutawayTasks() {
  const { data, publish } = useGlobalUNS()
  const location = useLocation()
  
  // Detect Context
  const isPutaway = location.pathname.includes('putaway')
  const pageTitle = isPutaway ? "Putaway Worklist" : "Internal Task Queue"
  const pageSubtitle = isPutaway 
    ? "Manage strategy-driven inventory placement" 
    : "Execute replenishment and relocation tasks"
  
  // VIEW STATE
  const [selectedTask, setSelectedTask] = useState(null) 
  const [isExceptionOpen, setIsExceptionOpen] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  
  // FILTERS
  const [filterText, setFilterText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // EXECUTION STATE
  const [scanBin, setScanBin] = useState('')
  const [scanHu, setScanHu] = useState('')
  const [confirmedTarget, setConfirmedTarget] = useState(null)
  const [overrideMode, setOverrideMode] = useState(false)
  const [exceptionReason, setExceptionReason] = useState('')

  // DEBUG LOGIC (Preserved)
  useEffect(() => {
    const rawData = data.raw[TOPIC_TASK_QUEUE]
    console.log('🔍 [PutawayMove] useEffect - Data changed:', { hasData: !!rawData })
  }, [data.raw])

  // 1. DATA PREP (Preserved Logic)
  const tasks = useMemo(() => {
    const rawData = data.raw[TOPIC_TASK_QUEUE]
    const rawTasks = Array.isArray(rawData) ? rawData : rawData?.queue || rawData?.items || rawData?.tasks || []
    
    const mappedTasks = Array.isArray(rawTasks) ? rawTasks.map(task => ({
      id: task.task_id || task.id || task.taskId || `TSK-${Math.random().toString(36).substr(2, 9)}`,
      hu: task.hu || task.handling_unit || task.handlingUnit || task.hu_id || 'N/A',
      material: task.material || task.material_code || task.materialCode || task.sku || 'N/A',
      desc: task.desc || task.description || task.material_name || task.materialName || '',
      qty: task.qty || task.quantity || task.qty_required || task.qtyRequired || '0',
      status: task.status || task.task_status || task.taskStatus || 'AVAILABLE',
      source: task.source || task.source_location || task.sourceLocation || task.from_location || task.fromLocation || 'UNKNOWN',
      hazmat: task.hazmat || task.is_hazmat || task.isHazmat || false,
      temp: task.temp || task.temperature || task.temp_requirement || task.tempRequirement || 'Ambient',
      aging: task.aging || task.age || task.time_elapsed || task.timeElapsed || '0m',
      strategy: task.strategy || task.putaway_strategy || task.putawayStrategy || 'DEFAULT',
      suggestionStatus: task.suggestionStatus || task.suggestion_status || task.suggestionStatus || 'SUGGESTED',
      topBin: task.topBin || task.top_bin || task.topBin || task.suggested_bin || task.suggestedBin || '—',
      batch: task.batch || task.batch_id || task.batchId || '',
    })) : []
    
    return mappedTasks.filter(t => {
      const matchesSearch = (t.hu.toLowerCase().includes(filterText.toLowerCase()) || t.material.toLowerCase().includes(filterText.toLowerCase()))
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter

      if (isPutaway) {
        return matchesSearch && matchesStatus && t.source.includes('DOCK')
      } else {
        return matchesSearch && matchesStatus && !t.source.includes('DOCK') && t.status !== 'QUARANTINE' 
      }
    })
  }, [data.raw, filterText, statusFilter, isPutaway])

  const suggestions = useMemo(() => {
    if (!selectedTask) return []
    return SUGGESTION_LOGIC[selectedTask.status] || []
  }, [selectedTask])

  const kpiData = useMemo(() => {
    const pending = tasks.filter(t => t.status !== 'COMPLETED').length
    const inProgress = selectedTask ? 1 : 0 
    const completedToday = 0 
    const total = tasks.length
    return { pending, inProgress, completedToday, total }
  }, [tasks, selectedTask])

  // ACTIONS (Preserved Logic)
  const handleOpenTask = (task) => {
    setSelectedTask(task)
    setConfirmedTarget(null)
    setScanBin('')
    setScanHu('')
    setOverrideMode(false)
    setShowAudit(false)
  }

  const handleConfirmPutaway = () => {
    if (scanHu !== selectedTask.hu || scanBin !== confirmedTarget?.bin) return;
    
    const payload = {
      task_id: selectedTask.id,
      hu: scanHu,
      target_bin: confirmedTarget?.bin || scanBin,
      operator: "Current_User",
      timestamp: Date.now()
    }
    
    publish(TOPIC_ACTION_CONFIRM, payload)
    
    setSelectedTask(null)
    setScanBin('')
    setScanHu('')
    setConfirmedTarget(null)
  }

  const handleException = () => {
    setIsExceptionOpen(false)
    setSelectedTask(null)
    alert(`Audit Logged: EXCEPTION_RAISED\nReason: ${exceptionReason}`)
  }

  return (
    <PageContainer title={pageTitle} subtitle={pageSubtitle}>
      <div className="space-y-4">
        
        {/* --- KPI SUMMARY DASHBOARD (Neutral & Clean) --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-slate-900 mb-1">{kpiData.pending}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Tasks</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-blue-600 mb-1">{kpiData.inProgress}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Progress</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-green-600 mb-1">{kpiData.completedToday}</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed Today</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-slate-400 mb-1">{kpiData.total}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</div>
            </CardContent>
          </Card>
        </div>

        {/* --- ACTIVE STRATEGY BANNER (Tech Style) --- */}
        <Popover>
          <PopoverTrigger asChild>
            <Card className="bg-slate-50 border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors group">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                      <Layers className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Strategy:</span>
                        <span className="text-sm font-semibold text-indigo-700">RM-Quarantine-Strict</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-indigo-200 text-indigo-600 bg-white">v2.1</Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-indigo-600 h-6 text-xs">
                    View Rules <Info className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <h4 className="font-bold text-indigo-700 text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" /> RM-Quarantine-Strict v2.1
              </h4>
              <p className="text-xs text-slate-600">{STRATEGY_EXPLAINER}</p>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* --- OPERATIONAL FILTERS --- */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <div className="p-3 flex flex-col xl:flex-row gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-3 w-full xl:w-auto flex-1 items-center">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Scan HU or Search Material..." 
                  className="pl-9 h-9 text-sm bg-slate-50 border-slate-200" 
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] h-9 text-sm bg-slate-50 border-slate-200">
                  <div className="flex items-center gap-2"><Filter className="h-3.5 w-3.5"/> <SelectValue placeholder="Filter Status" /></div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="QUARANTINE">Quarantined</SelectItem>
                  <SelectItem value="EXCEPTION">Exceptions</SelectItem>
                </SelectContent>
              </Select>

              <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block"></div>
              
              <Button variant="outline" size="sm" className="text-xs h-9 border-slate-200 text-slate-600">Bulk Suggest</Button>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <UNSConnectionInfo topic={TOPIC_TASK_QUEUE} />
            </div>
          </div>
        </Card>

        {/* --- WORKLIST TABLE --- */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">HU / Material</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Constraints</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Strategy</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Top Bin</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Age</TableHead>
                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data.raw[TOPIC_TASK_QUEUE] ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                      <p className="text-xs text-slate-400">Loading Tasks...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Box className="h-8 w-8 text-slate-200" />
                      <p className="text-sm font-medium text-slate-500">No tasks found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => {
                  const isStarted = selectedTask?.id === task.id; 
                  const isDone = task.status === 'COMPLETED'; 

                  return (
                    <TableRow key={task.id} className="cursor-pointer hover:bg-slate-50 group border-b border-slate-100 last:border-0" onClick={() => handleOpenTask(task)}>
                      <TableCell>
                        <div className="font-mono font-bold text-blue-600 text-xs">{task.hu}</div>
                        <div className="font-medium text-slate-900 text-sm mt-0.5">{task.material}</div>
                        <div className="text-[10px] text-slate-500">{task.qty} • {task.source}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {task.hazmat && <Badge variant="outline" className="w-fit text-[9px] px-1.5 py-0 border-red-200 text-red-700 bg-red-50 rounded-sm">Hazmat</Badge>}
                          {task.temp !== 'Ambient' && <Badge variant="outline" className="w-fit text-[9px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50 rounded-sm">{task.temp}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[9px] bg-slate-100 text-slate-600 border border-slate-200 rounded-sm">{task.strategy}</Badge>
                      </TableCell>
                      <TableCell>
                        {task.suggestionStatus === 'SUGGESTED' && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Suggested</span>}
                        {task.suggestionStatus === 'NO_BINS' && <span className="text-[10px] font-bold text-red-600 flex items-center gap-1"><XCircle className="h-3 w-3"/> No Bins</span>}
                        {task.suggestionStatus === 'EXCEPTION' && <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> Exception</span>}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-slate-800">{task.topBin}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3"/> {task.aging}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isDone ? (
                          <span className="text-xs font-bold text-green-600 flex items-center justify-end gap-1"><CheckCircle2 className="h-4 w-4"/> Done</span>
                        ) : isStarted ? (
                          <Button size="sm" className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200 border hover:bg-blue-100 font-semibold" onClick={(e) => { e.stopPropagation(); handleOpenTask(task); }}>
                            Continue <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300" onClick={(e) => { e.stopPropagation(); handleOpenTask(task); }}>
                            Open <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* --- 3. TASK EXECUTION MODAL (Tier0 Cockpit Style) --- */}
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white">
            {selectedTask && (
              <>
                <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-white text-[10px] font-bold border-slate-300 text-slate-600 rounded-sm">{selectedTask.status}</Badge>
                        {selectedTask.hazmat && <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] rounded-sm">HAZMAT</Badge>}
                      </div>
                      <DialogTitle className="text-xl font-mono font-bold text-slate-900 tracking-tight">{selectedTask.hu}</DialogTitle>
                      <DialogDescription className="text-xs mt-1 text-slate-500 font-medium">
                        {selectedTask.material} • {selectedTask.desc}
                      </DialogDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Source</div>
                      <div className="text-sm font-bold text-slate-900">{selectedTask.source}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{selectedTask.qty} Units</div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                  
                  {/* STEP 1: SUGGESTION */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <div className="h-5 w-5 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-[10px]">1</div>
                      System Recommendation
                    </Label>

                    {suggestions.length > 0 ? (
                      <div className="grid gap-2">
                        {suggestions.map((sug, i) => (
                          <div 
                            key={i}
                            onClick={() => !overrideMode && setConfirmedTarget(sug)}
                            className={`
                              p-3 rounded-lg border-2 cursor-pointer transition-all relative
                              ${confirmedTarget?.bin === sug.bin 
                                ? 'border-[#a3e635] bg-[#a3e635]/5 ring-1 ring-[#a3e635]' 
                                : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}
                              ${overrideMode ? 'opacity-50 pointer-events-none' : ''}
                            `}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-mono font-bold text-slate-900 text-sm flex items-center gap-2">
                                  {sug.bin}
                                  {i === 0 && <span className="text-[9px] px-1.5 py-0.5 bg-[#a3e635] text-slate-900 rounded font-bold">BEST</span>}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Capacity: {sug.capacity} • {sug.distance}</div>
                              </div>
                              {confirmedTarget?.bin === sug.bin && <CheckCircle2 className="h-5 w-5 text-[#65a30d]" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <div className="text-xs font-bold text-red-800">No Eligible Bins</div>
                          <div className="text-[10px] text-red-600">Constraints check failed. Manual Override required.</div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button variant="link" className="h-auto p-0 text-[10px] text-slate-400 hover:text-blue-600 font-medium" onClick={() => setOverrideMode(!overrideMode)}>
                        {overrideMode ? "Cancel Override" : "Enable Supervisor Override"}
                      </Button>
                    </div>

                    {overrideMode && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2 animate-in fade-in">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-[10px] uppercase">
                          <Lock className="h-3 w-3" /> Manual Override
                        </div>
                        <Select onValueChange={(val) => setConfirmedTarget({ bin: val })}>
                          <SelectTrigger className="bg-white h-8 text-xs border-amber-200"><SelectValue placeholder="Select Override Bin..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OVERRIDE-ZONE-A">ZONE-A (General)</SelectItem>
                            <SelectItem value="OVERRIDE-Cage">Secure Cage (Manual)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* STEP 2: VALIDATION */}
                  <div className={`space-y-3 transition-opacity duration-300 ${!confirmedTarget ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                    <Label className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <div className="h-5 w-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">2</div>
                      Scan Verification
                    </Label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Label className="text-[10px] text-slate-500 font-medium">HU Barcode</Label>
                          {scanHu === selectedTask.hu && <span className="text-[10px] text-green-600 font-bold">OK</span>}
                        </div>
                        <Input 
                          placeholder="Scan HU" 
                          value={scanHu}
                          onChange={(e) => setScanHu(e.target.value)}
                          className={`h-9 text-sm font-mono ${scanHu === selectedTask.hu ? "border-green-500 ring-1 ring-green-500 bg-green-50/20" : "bg-white"}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Label className="text-[10px] text-slate-500 font-medium">Bin Label</Label>
                          {scanBin === confirmedTarget?.bin && <span className="text-[10px] text-green-600 font-bold">OK</span>}
                        </div>
                        <Input 
                          placeholder="Scan Bin" 
                          value={scanBin}
                          onChange={(e) => setScanBin(e.target.value)}
                          disabled={!confirmedTarget}
                          className={`h-9 text-sm font-mono ${scanBin === confirmedTarget?.bin ? "border-green-500 ring-1 ring-green-500 bg-green-50/20" : "bg-white"}`}
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center sm:justify-between">
                  <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-medium h-9" onClick={() => setIsExceptionOpen(true)}>
                    Report Exception
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setSelectedTask(null)} className="text-slate-500 hover:text-slate-700 h-9">Cancel</Button>
                    <Button 
                      className={`min-w-[140px] font-bold shadow-sm transition-all h-9
                        ${scanHu === selectedTask.hu && scanBin === confirmedTarget?.bin 
                          ? "bg-[#a3e635] text-slate-900 hover:bg-[#8cd121]" 
                          : "bg-slate-300 text-slate-500 cursor-not-allowed"}
                      `}
                      disabled={scanHu !== selectedTask.hu || scanBin !== confirmedTarget?.bin}
                      onClick={handleConfirmPutaway}
                    >
                      Confirm Putaway
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* --- EXCEPTION MODAL --- */}
        <Dialog open={isExceptionOpen} onOpenChange={setIsExceptionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5"/> Report Exception
              </DialogTitle>
              <DialogDescription className="text-xs">
                Task will be flagged for supervisor review.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Reason Code</Label>
                <Select onValueChange={setExceptionReason}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BIN_FULL">Physical Bin is Full</SelectItem>
                    <SelectItem value="DAMAGE">Inventory Damaged</SelectItem>
                    <SelectItem value="ACCESS">Aisle Blocked</SelectItem>
                    <SelectItem value="LABEL">Label Unreadable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea placeholder="Describe the issue..." className="h-20 text-sm resize-none" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsExceptionOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleException} className="bg-red-600 hover:bg-red-700">Raise Exception</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}