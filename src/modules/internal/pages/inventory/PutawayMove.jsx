import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
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
  Search, 
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
  Layers
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_TASK_QUEUE = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue"
const TOPIC_ACTION_CONFIRM = "Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Confirm_Putaway"

// --- MOCK STRATEGY ENGINE ---
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
  'BLOCKED': [], // Simulates "No Eligible Bins"
  'EXCEPTION': [] 
}

// MOCK AUDIT TRAIL DATA GENERATOR
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

  // DEBUG: Track when MQTT data arrives
  useEffect(() => {
    const rawData = data.raw[TOPIC_TASK_QUEUE]
    console.log('🔍 [PutawayMove] useEffect - Data changed:', {
      hasData: !!rawData,
      dataType: typeof rawData,
      isArray: Array.isArray(rawData),
      keys: rawData ? Object.keys(rawData) : [],
      topic: TOPIC_TASK_QUEUE,
      allTopics: Object.keys(data.raw)
    })
  }, [data.raw])

  // 1. DATA PREP - Get live data from MQTT
  const tasks = useMemo(() => {
    // Get raw data from MQTT (handle different possible structures)
    const rawData = data.raw[TOPIC_TASK_QUEUE]
    
    // Debug logging - always log to track data flow
    console.log('📊 [PutawayMove] Raw MQTT Data:', rawData)
    console.log('📊 [PutawayMove] data.raw keys:', Object.keys(data.raw))
    
    // Handle different data structures:
    // 1. Direct array: [{ task_id: ... }, ...]
    // 2. Object with queue property: { queue: [...] }
    // 3. Object with items property: { items: [...] }
    // 4. Object with tasks property: { tasks: [...] }
    const rawTasks = Array.isArray(rawData) 
      ? rawData 
      : rawData?.queue || rawData?.items || rawData?.tasks || []
    
    // Map raw MQTT data to table structure
    // Handle field name variations: task_id/id, hu/handling_unit, material/material_code, etc.
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
    
    // Apply filters
    return mappedTasks.filter(t => {
      // 1. Common Search Filter
      const matchesSearch = (t.hu.toLowerCase().includes(filterText.toLowerCase()) || t.material.toLowerCase().includes(filterText.toLowerCase()))
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter

      // 2. CONTEXT FILTER (The Logic Fix)
      if (isPutaway) {
        // PUTAWAY MODE:
        // Must be at DOCK.
        // Can be QUARANTINE (standard) or AVAILABLE (direct release).
        return matchesSearch && matchesStatus && t.source.includes('DOCK')
      } else {
        // INTERNAL MOVES MODE:
        // Must NOT be at DOCK.
        // Should generally NOT be QUARANTINE (unless moving to a different cage).
        return matchesSearch && matchesStatus && 
               !t.source.includes('DOCK') && 
               t.status !== 'QUARANTINE' 
      }
    })
  }, [data.raw, filterText, statusFilter, isPutaway])

  const suggestions = useMemo(() => {
    if (!selectedTask) return []
    return SUGGESTION_LOGIC[selectedTask.status] || []
  }, [selectedTask])

  // KPI DATA - Use live tasks data
  const kpiData = useMemo(() => {
    const pending = tasks.filter(t => t.status !== 'COMPLETED').length
    const inProgress = selectedTask ? 1 : 0 // 1 if a task is currently selected/being worked on
    const completedToday = 0 // TODO: Get from backend if available (data.raw[TOPIC_TASK_QUEUE]?.completed_count)
    const total = tasks.length
    
    return { pending, inProgress, completedToday, total }
  }, [tasks, selectedTask])

  // --- ACTIONS ---

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
    
    // Publish confirmation action to MQTT
    const payload = {
      task_id: selectedTask.id,
      hu: scanHu,
      target_bin: confirmedTarget?.bin || scanBin,
      operator: "Current_User", // TODO: Get from auth context
      timestamp: Date.now()
    }
    
    publish(TOPIC_ACTION_CONFIRM, payload)
    console.log(`📤 Published Putaway Confirmation:`, payload)
    
    // Close modal - wait for backend to send updated list (reactive UI)
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
        
        {/* --- KPI SUMMARY DASHBOARD --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Pending Tasks */}
          <Card className="bg-amber-50 border-amber-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-amber-700 mb-1">{kpiData.pending}</div>
              <div className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pending Tasks</div>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-blue-700 mb-1">{kpiData.inProgress}</div>
              <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">In Progress</div>
            </CardContent>
          </Card>

          {/* Completed Today */}
          <Card className="bg-green-50 border-green-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-green-700 mb-1">{kpiData.completedToday}</div>
              <div className="text-xs font-medium text-green-600 uppercase tracking-wide">Completed Today</div>
            </CardContent>
          </Card>

          {/* Total Tasks */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="text-3xl font-bold text-slate-700 mb-1">{kpiData.total}</div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Tasks</div>
            </CardContent>
          </Card>
        </div>

        {/* --- ACTIVE STRATEGY BANNER --- */}
        <Popover>
          <PopoverTrigger asChild>
            <Card className="bg-indigo-50/50 border-indigo-100 shadow-sm cursor-pointer hover:bg-indigo-50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-indigo-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Active Putaway Strategy:</span>
                        <span className="font-semibold text-indigo-700">RM-Quarantine-Strict</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-200 text-indigo-600 bg-white">
                          v2.1
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-indigo-700 hover:text-indigo-800 hover:bg-indigo-100 h-8">
                    View Rules <Info className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-indigo-700 text-sm mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  RM-Quarantine-Strict v2.1
                </h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Hard Constraints
                  </div>
                  <ul className="space-y-1.5 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                      <span>Status Separation (Quarantine vs Available)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></div>
                      <span>Hazmat Compatibility Check</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Soft Optimization
                  </div>
                  <ul className="space-y-1.5 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                      <span>Consolidation (Fill partial bins first)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                      <span>FEFO (First Expired First Out)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* --- 1. OPERATIONAL FILTERS --- */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-4 flex flex-col xl:flex-row gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-4 w-full xl:w-auto flex-1 items-center">
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Scan HU or Search Material..." 
                  className="pl-8" 
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2"><Filter className="h-4 w-4"/> <SelectValue placeholder="Filter Status" /></div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="QUARANTINE">Quarantined</SelectItem>
                  <SelectItem value="EXCEPTION">Exceptions</SelectItem>
                </SelectContent>
              </Select>

              <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs">Bulk Suggest</Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <UNSConnectionInfo topic={TOPIC_TASK_QUEUE} />
            </div>
          </div>
        </Card>

        {/* --- 2. ENTERPRISE WORKLIST TABLE --- */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>HU / Material</TableHead>
                <TableHead>Constraints</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Suggestion Status</TableHead>
                <TableHead>Top Bin</TableHead>
                <TableHead>Priority / Age</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data.raw[TOPIC_TASK_QUEUE] ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-700">Loading Tasks...</p>
                        <p className="text-xs text-slate-400">Waiting for MQTT data from backend</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Box className="h-8 w-8 text-slate-300" />
                      <p className="font-medium text-slate-600">No tasks found</p>
                      <p className="text-xs text-slate-400">No tasks match your current filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => {
                  // Define Task Status Logic (Mock or Real)
                  const isStarted = selectedTask?.id === task.id; // Or check a real 'status' field from backend
                  const isDone = task.status === 'COMPLETED'; // If you had completed tasks in this list

                  return (
                    <TableRow key={task.id} className="cursor-pointer hover:bg-slate-50 group" onClick={() => handleOpenTask(task)}>
                  <TableCell>
                        <div className="font-mono font-medium text-blue-600 text-sm">{task.hu}</div>
                        <div className="font-medium text-slate-900 text-sm">{task.material}</div>
                        <div className="text-xs text-slate-500">{task.qty} • {task.source}</div>
                  </TableCell>
                  <TableCell>
                        <div className="flex flex-col gap-1">
                          {task.hazmat && <Badge variant="outline" className="w-fit text-[10px] px-1 py-0 border-red-200 text-red-700 bg-red-50"><ShieldAlert className="h-3 w-3 mr-1"/> Hazmat</Badge>}
                          {task.temp !== 'Ambient' && <Badge variant="outline" className="w-fit text-[10px] px-1 py-0 border-blue-200 text-blue-700 bg-blue-50"><Thermometer className="h-3 w-3 mr-1"/> {task.temp}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="secondary" className="font-mono text-[10px] cursor-help">{task.strategy}</Badge>
                            </TooltipTrigger>
                            <TooltipContent><p>Active Logic Rule applied to this HU</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {task.suggestionStatus === 'SUGGESTED' && <span className="text-xs font-medium text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Suggested</span>}
                        {task.suggestionStatus === 'NO_BINS' && <span className="text-xs font-bold text-red-600 flex items-center gap-1"><XCircle className="h-3 w-3"/> No Eligible Bins</span>}
                        {task.suggestionStatus === 'EXCEPTION' && <span className="text-xs font-bold text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> Exception</span>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{task.topBin}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock className="h-3 w-3"/> {task.aging}
                        </div>
                        {task.status === 'QUARANTINE' && <div className="text-[10px] font-bold text-amber-600 mt-1">QUARANTINE</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        {isDone ? (
                          <span className="text-xs font-bold text-green-600 flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-4 w-4"/> Done
                          </span>
                        ) : isStarted ? (
                          <Button size="sm" className="h-8 bg-blue-50 text-blue-700 border-blue-200 border hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); handleOpenTask(task); }}>
                            Continue <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 group-hover:border-blue-300 group-hover:text-blue-600" onClick={(e) => { e.stopPropagation(); handleOpenTask(task); }}>
                            Open Task <ArrowRight className="ml-1 h-3 w-3" />
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

        {/* --- 3. TASK DETAIL MODAL (DEFENSIBLE UI) --- */}
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            {selectedTask && (
              <>
                <DialogHeader className="px-6 py-5 border-b bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="bg-white mb-2">{selectedTask.status}</Badge>
                      <DialogTitle className="text-xl font-mono">{selectedTask.hu}</DialogTitle>
                      <DialogDescription className="text-xs mt-1">
                        {selectedTask.material} • {selectedTask.desc}
                      </DialogDescription>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>Qty: <span className="font-bold text-slate-900">{selectedTask.qty}</span></div>
                      <div>From: <span className="font-bold text-slate-900">{selectedTask.source}</span></div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-6 space-y-8">
                  
                  {/* SECTION A: SUGGESTION ENGINE */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        1. System Suggestions
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-slate-400" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px]"><p>{STRATEGY_EXPLAINER}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {suggestions.length > 0 ? (
                      <div className="grid gap-2">
                        {suggestions.map((sug, i) => (
                          <div 
                            key={i}
                            onClick={() => !overrideMode && setConfirmedTarget(sug)}
                            className={`
                              p-3 rounded-lg border-2 cursor-pointer transition-all relative
                              ${confirmedTarget?.bin === sug.bin ? 'border-green-600 bg-green-50' : 'border-slate-100 hover:border-slate-300'}
                              ${overrideMode ? 'opacity-50 pointer-events-none' : ''}
                            `}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                  {sug.bin}
                                  {i === 0 && <Badge className="h-4 text-[9px] bg-green-600">BEST</Badge>}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">Capacity: {sug.capacity} • {sug.distance}</div>
                              </div>
                              {confirmedTarget?.bin === sug.bin && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                            </div>
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {sug.reason.map((r, idx) => (
                                <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-white border rounded-full text-slate-500 font-medium">
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // NO ELIGIBLE BINS STATE
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <h4 className="font-bold text-red-800 text-sm">No Eligible Bins Found</h4>
                        <p className="text-xs text-red-600 mt-1 mb-3">
                          Constraints check failed. No bins match: <br/>
                          <b>{selectedTask.strategy}</b> for <b>{selectedTask.status}</b>.
                        </p>
                        <Button size="sm" variant="outline" className="border-red-300 text-red-700 bg-white" onClick={() => setIsExceptionOpen(true)}>
                          Raise No-Bin Exception
                        </Button>
                      </div>
                    )}

                    {/* OVERRIDE TOGGLE */}
                    <div className="pt-2 flex justify-end">
                      <Button variant="link" className="h-auto p-0 text-xs text-slate-400 hover:text-blue-600" onClick={() => setOverrideMode(!overrideMode)}>
                        {overrideMode ? "Cancel Override" : "Supervisor Override"}
                      </Button>
                    </div>

                    {overrideMode && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3 animate-in fade-in">
                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase">
                          <Lock className="h-3 w-3" /> Manual Override Mode
                        </div>
                        <Select onValueChange={(val) => setConfirmedTarget({ bin: val })}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Select Override Bin..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OVERRIDE-ZONE-A">ZONE-A (General)</SelectItem>
                            <SelectItem value="OVERRIDE-Cage">Secure Cage (Manual)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea placeholder="Required: Override Justification" className="bg-white h-16 text-xs" />
                        </div>
                    )}
                  </div>

                  {/* SECTION B: VALIDATION (Scanning) */}
                  <div className={`space-y-4 transition-all duration-300 ${!confirmedTarget ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <Label className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-blue-600" />
                      2. Validation Scan
                    </Label>
                    
                    <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                      <div>
                        <div className="flex justify-between mb-1">
                          <Label className="text-xs text-slate-500">Confirm HU</Label>
                          {scanHu === selectedTask.hu && <span className="text-[10px] text-green-600 font-bold">MATCH</span>}
                        </div>
                        <Input 
                          placeholder="Scan HU Barcode" 
                          value={scanHu}
                          onChange={(e) => setScanHu(e.target.value)}
                          className={scanHu === selectedTask.hu ? "border-green-500 ring-1 ring-green-500 bg-white" : "bg-white"}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <Label className="text-xs text-slate-500">Confirm Bin</Label>
                          {scanBin === confirmedTarget?.bin && <span className="text-[10px] text-green-600 font-bold">MATCH</span>}
                        </div>
                        <Input 
                          placeholder={`Scan Bin ${confirmedTarget?.bin || ''}`} 
                          value={scanBin}
                          onChange={(e) => setScanBin(e.target.value)}
                          disabled={!confirmedTarget}
                          className={scanBin === confirmedTarget?.bin ? "border-green-500 ring-1 ring-green-500 bg-white" : "bg-white"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION C: AUDIT TRAIL */}
                  <div className="border-t pt-4">
                    <div 
                      className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-600 transition-colors"
                      onClick={() => setShowAudit(!showAudit)}
                    >
                      <History className="h-3 w-3" />
                      <span className="font-medium uppercase tracking-wider">History & Audit Trail</span>
                      <span className="ml-auto text-[10px]">{showAudit ? 'Hide' : 'Show'}</span>
                    </div>
                    
                    {showAudit && (
                      <div className="mt-3 space-y-3 pl-1.5 relative border-l border-slate-200 ml-1.5">
                        {generateAudit(selectedTask).map((log, i) => (
                          <div key={i} className="pl-4 relative">
                            <div className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-slate-300 ring-2 ring-white"></div>
                            <div className="text-xs font-bold text-slate-700">{log.event}</div>
                            <div className="text-[10px] text-slate-500">{log.user} • {log.time}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{log.detail}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                <DialogFooter className="p-6 border-t bg-white flex flex-col gap-3 sm:flex-col">
                  <Button 
                    className="w-full bg-slate-900 hover:bg-slate-800" 
                    size="lg"
                    disabled={scanHu !== selectedTask.hu || scanBin !== confirmedTarget?.bin}
                    onClick={handleConfirmPutaway}
                  >
                    Confirm Putaway
                  </Button>
                  <Button variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 h-8 text-xs" onClick={() => setIsExceptionOpen(true)}>
                    Report Issue / Exception
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* --- EXCEPTION MODAL --- */}
        <Dialog open={isExceptionOpen} onOpenChange={setIsExceptionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5"/> Report Exception
              </DialogTitle>
              <DialogDescription>
                This task will be removed from the operator queue and flagged for supervisor review.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Select onValueChange={setExceptionReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BIN_FULL">Physical Bin is Full</SelectItem>
                    <SelectItem value="DAMAGE">Inventory Damaged</SelectItem>
                    <SelectItem value="ACCESS">Aisle Blocked</SelectItem>
                    <SelectItem value="LABEL">Label Unreadable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea placeholder="Describe the issue..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExceptionOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleException}>Raise Exception</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}