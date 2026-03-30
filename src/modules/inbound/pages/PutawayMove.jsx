import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import { Label } from '../../../components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeletonRows } from '../../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Textarea } from '../../../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip"
import { 
  ArrowRight, 
  Search, 
  ScanLine, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Thermometer, 
  Clock, 
  Filter, 
  XCircle,
  Box,
  Factory,
  Truck
} from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { PutawayTaskValidator, PutawayTaskValidationError } from '../../../domain/inbound/PutawayTaskValidator'
import { PutawayTaskService } from '../../../domain/inbound/PutawayTaskService'

// TOPICS
const TOPIC_TASK_QUEUE = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue"
const TOPIC_ACTION_CONFIRM = "Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Confirm_Putaway"
const TOPIC_ACTION_REPORT_EX = "Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Report_Exception"

export default function PutawayTasks() {
  const { data, publish } = useGlobalUNS()
  
  const pageTitle = "Putaway"
  const pageSubtitle = "Move released inventory to storage bins"
  
  // VIEW STATE
  const [selectedTask, setSelectedTask] = useState(null) 
  const [isExceptionOpen, setIsExceptionOpen] = useState(false)
  
  // FILTERS
  const [filterText, setFilterText] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // EXECUTION STATE
  const [scanBin, setScanBin] = useState('')
  const [scanHu, setScanHu] = useState('')
  const [confirmedTarget, setConfirmedTarget] = useState(null)
  const [overrideMode, setOverrideMode] = useState(false)
  const [exceptionReason, setExceptionReason] = useState('')
  const [exceptionNotes, setExceptionNotes] = useState('')

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
    
    // Normalize tasks using service
    const mappedTasks = Array.isArray(rawTasks) 
      ? rawTasks.map(task => PutawayTaskService.normalizeTask(task))
      : []
    
    // Apply common filters (search and status)
    const filteredTasks = mappedTasks.filter(t => {
      const matchesSearch = (t.hu.toLowerCase().includes(filterText.toLowerCase()) || t.material.toLowerCase().includes(filterText.toLowerCase()))
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter
      return matchesSearch && matchesStatus
    })

    // Apply context filter using service (putaway vs internal moves)
    return PutawayTaskService.filterTasksByContext(filteredTasks, true)
  }, [data.raw, filterText, statusFilter])

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
    const defaultBin = task.topBin || ''
    setConfirmedTarget(defaultBin ? { bin: defaultBin } : null)
    setScanBin(defaultBin)
    setScanHu('')
    setOverrideMode(false)
    setExceptionReason('')
    setExceptionNotes('')
  }

  const handleConfirmPutaway = () => {
    try {
      // Service handles validation + command building (DDD pattern)
      const payload = PutawayTaskService.buildConfirmationCommand({
        task: selectedTask,
        scanHu: scanHu,
        scanBin: scanBin,
        confirmedTarget: confirmedTarget,
        operator: "Current_User"
      })
  
      publish(TOPIC_ACTION_CONFIRM, payload)
      console.log(`📤 Published Putaway Confirmation:`, payload)
  
      // Close modal - wait for backend to send updated list (reactive UI)
      setSelectedTask(null)
      setScanBin('')
      setScanHu('')
      setConfirmedTarget(null)
    } catch (error) {
      if (error instanceof PutawayTaskValidationError) {
        alert(error.message)
        return
      }
      // Re-throw unexpected errors
      throw error
    }
  }

  const handleException = () => {
    try {
      // Service handles validation + command building (DDD pattern)
      const payload = PutawayTaskService.buildExceptionCommand({
        task: selectedTask,
        reason: exceptionReason,
        notes: exceptionNotes,
        operator: "Current_User"
      })
  
      publish(TOPIC_ACTION_REPORT_EX, payload)
      console.log(`📤 Published Exception Report:`, payload)
  
      // Close modal and reset state
      setIsExceptionOpen(false)
      setSelectedTask(null)
      setExceptionReason('')
      setExceptionNotes('')
    } catch (error) {
      if (error instanceof PutawayTaskValidationError) {
        alert(error.message)
        return
      }
      // Re-throw unexpected errors
      throw error
    }
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

        {/* --- 1. OPERATIONAL FILTERS --- */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-4 flex flex-col xl:flex-row gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-4 w-full xl:w-auto flex-1 items-center">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Scan HU or Search Material..." 
                  className="pl-8" 
                  value={filterText}
                  onChange={e => setFilterText(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
                <TableHead>Source PO</TableHead>
                <TableHead>Supplier</TableHead>
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
                <TableSkeletonRows rows={6} cols={9} />
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
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          {/* Dynamic Icon */}
                          {task.source.includes('LINE') ? <Factory className="h-3 w-3"/> : <Truck className="h-3 w-3"/>}
                          {task.qty} • {task.source}
                        </div>
                  </TableCell>
                  <TableCell>
                        <div className="font-mono text-xs text-slate-700">{task.doc_id}</div>
                  </TableCell>
                  <TableCell>
                        <div className="text-xs text-slate-500">{task.supplier}</div>
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
                        {selectedTask.material}{selectedTask.batch ? ` • Batch: ${selectedTask.batch}` : ''} {selectedTask.desc ? `• ${selectedTask.desc}` : ''}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                  {/* Task Info */}
                  <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500">HU</span>
                        <div className="font-mono font-bold text-slate-900">{selectedTask.hu}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Material</span>
                        <div className="font-medium text-slate-900">{selectedTask.material}{selectedTask.batch ? ` (${selectedTask.batch})` : ''}</div>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="text-slate-500">Source</span>
                        <span className="font-mono font-medium text-slate-900">{selectedTask.source}</span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-500">Target</span>
                        <span className="font-mono font-medium text-slate-900">{selectedTask.topBin}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Quantity</span>
                        <div className="font-bold text-slate-900">{selectedTask.qty}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Source PO</span>
                        <div className="font-mono text-slate-900">{selectedTask.doc_id}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Supplier</span>
                        <div className="text-slate-900">{selectedTask.supplier}</div>
                      </div>
                    </div>
                  </div>

                  {/* Validation Scan */}
                  <div className="space-y-4">
                    <Label className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-blue-600" />
                      Validation Scan
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
                          <Label className="text-xs text-slate-500">Target Bin</Label>
                          {scanBin === confirmedTarget?.bin && scanBin && <span className="text-[10px] text-green-600 font-bold">MATCH</span>}
                        </div>
                        <Input 
                          placeholder={`Scan or enter bin (default: ${selectedTask.topBin || '—'})`} 
                          value={scanBin}
                          onChange={(e) => {
                            const v = e.target.value
                            setScanBin(v)
                            setConfirmedTarget(v ? { bin: v } : null)
                          }}
                          className={scanBin === confirmedTarget?.bin && scanBin ? "border-green-500 ring-1 ring-green-500 bg-white" : "bg-white"}
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <DialogFooter className="p-6 border-t bg-white flex flex-col gap-3 sm:flex-col">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
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
        <Dialog open={isExceptionOpen} onOpenChange={(open) => {
          setIsExceptionOpen(open)
          if (!open) {
            setExceptionReason('')
            setExceptionNotes('')
          }
        }}>
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
                <Textarea 
                  placeholder="Describe the issue..." 
                  value={exceptionNotes}
                  onChange={e => setExceptionNotes(e.target.value)}
                />
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