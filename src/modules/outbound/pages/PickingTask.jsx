import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import { Label } from '../../../components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import { Textarea } from '../../../components/ui/textarea'
import { 
  ScanLine, Package, MapPin, ArrowRight, CheckCircle2, 
  AlertTriangle, Filter, ShoppingCart, Truck, Factory
} from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_PICK_QUEUE = "Henkelv2/Shanghai/Logistics/Outbound/State/Picking_Queue"
const TOPIC_ACTION_PICK = "Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Pick"
const TOPIC_EXCEPTION = "Henkelv2/Shanghai/Logistics/Outbound/Action/Report_Short_Pick"

export default function PickingTasks() {
  const { data, publish } = useGlobalUNS()
  
  // --- STATE ---
  const [selectedTask, setSelectedTask] = useState(null)
  const [filterZone, setFilterZone] = useState('ALL')
  const [scanBin, setScanBin] = useState('')
  const [scanItem, setScanItem] = useState('')
  const [scanQty, setScanQty] = useState('')
  
  // Exception State
  const [isExceptionOpen, setIsExceptionOpen] = useState(false)
  const [exceptionReason, setExceptionReason] = useState('')

  // --- DATA HANDLING ---
  const tasks = useMemo(() => {
    const rawData = data.raw[TOPIC_PICK_QUEUE]
    const queue = Array.isArray(rawData) ? rawData : rawData?.queue || []
    
    return queue.map(t => ({
      id: t.task_id || t.id,
      orderId: t.order_id || t.ref_no,
      type: t.order_type || 'SALES_ORDER', // SALES vs PROD
      sku: t.sku || t.material,
      desc: t.desc || 'Standard Material',
      location: t.location || t.bin || 'ZONE-A-01',
      zone: t.location ? t.location.split('-')[1] : 'A', // Mock Zone extraction
      qty: t.qty_req || t.qty || 0,
      uom: t.uom || 'EA',
      destination: t.destination || 'PACK-STATION-1', // or LINE-SIDE
      status: t.status || 'PENDING'
    }))
  }, [data.raw])

  // --- FILTERING ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterZone !== 'ALL' && t.zone !== filterZone) return false
      if (t.status !== 'PENDING') return false // Only show open tasks
      return true
    })
  }, [tasks, filterZone])

  // --- ACTIONS ---
  const handleOpenTask = (task) => {
    setSelectedTask(task)
    setScanBin('')
    setScanItem('')
    setScanQty(task.qty) // Default to full pick
  }

  const handleConfirmPick = () => {
    // 1. Validation
    if (scanBin !== selectedTask.location) return alert('Wrong Bin Scanned!')
    if (scanItem !== selectedTask.sku) return alert('Wrong Item Scanned!')
    
    // 2. Publish
    const payload = {
      task_id: selectedTask.id,
      order_id: selectedTask.orderId,
      sku: selectedTask.sku,
      qty_picked: Number(scanQty),
      operator: "Current_User",
      timestamp: Date.now()
    }
    
    publish(TOPIC_ACTION_PICK, payload)
    
    // 3. Reset
    setSelectedTask(null)
  }

  const handleShortPick = () => {
    const payload = {
      task_id: selectedTask.id,
      sku: selectedTask.sku,
      location: selectedTask.location,
      reason: exceptionReason,
      operator: "Current_User",
      timestamp: Date.now()
    }
    publish(TOPIC_EXCEPTION, payload)
    setIsExceptionOpen(false)
    setSelectedTask(null)
  }

  return (
    <PageContainer title="Picking Execution" subtitle="Fulfill allocated inventory tasks">
      <div className="space-y-4">
        <UNSConnectionInfo topic={TOPIC_PICK_QUEUE} />

        {/* --- KPI HEADER --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold text-blue-700">{filteredTasks.length}</div>
                <div className="text-xs font-bold text-blue-600 uppercase">Tasks in Zone</div>
              </div>
              <ShoppingCart className="text-blue-300 w-8 h-8" />
            </CardContent>
          </Card>
          {/* Add more KPIs like "Urgent" or "Next Due" */}
        </div>

        {/* --- WORKLIST --- */}
        <div className="flex gap-4 h-[600px]">
          
          {/* LEFT: Task List */}
          <Card className="flex-1 shadow-sm border-slate-200 flex flex-col">
            <div className="p-3 border-b bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <Select value={filterZone} onValueChange={setFilterZone}>
                  <SelectTrigger className="h-8 w-32 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Zones</SelectItem>
                    <SelectItem value="A">Zone A</SelectItem>
                    <SelectItem value="B">Zone B</SelectItem>
                    <SelectItem value="Q">Zone Q (Cage)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-slate-400">{filteredTasks.length} items pending</span>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Dest</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map(task => (
                    <TableRow 
                      key={task.id} 
                      className={`cursor-pointer hover:bg-blue-50 ${selectedTask?.id === task.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                      onClick={() => handleOpenTask(task)}
                    >
                      <TableCell className="font-mono font-bold text-slate-700">{task.location}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{task.sku}</div>
                        <div className="text-xs text-slate-500">{task.desc}</div>
                      </TableCell>
                      <TableCell className="text-right font-bold">{task.qty}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {task.type === 'SALES_ORDER' ? 
                          <span className="flex items-center gap-1"><Truck className="w-3 h-3"/> Pack</span> : 
                          <span className="flex items-center gap-1"><Factory className="w-3 h-3"/> Line</span>
                        }
                      </TableCell>
                      <TableCell><ArrowRight className="w-4 h-4 text-slate-300" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* RIGHT: Execution Panel (Active Task) */}
          <Card className="w-[400px] shadow-lg border-slate-200 flex flex-col">
            {!selectedTask ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <ScanLine className="w-12 h-12 mb-4 text-slate-200" />
                <p>Select a task to start picking</p>
              </div>
            ) : (
              <>
                <CardHeader className="bg-slate-50 border-b pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2 bg-white">Task: {selectedTask.id}</Badge>
                      <CardTitle className="text-2xl font-mono">{selectedTask.location}</CardTitle>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-[#a3e635]">{selectedTask.qty}</div>
                      <div className="text-xs text-slate-500">{selectedTask.uom}</div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 p-6 space-y-6">
                  {/* Step 1: Scan Bin */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                      1. Confirm Location
                      {scanBin === selectedTask.location && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        autoFocus
                        placeholder="Scan Bin Barcode..." 
                        value={scanBin}
                        onChange={e => setScanBin(e.target.value)}
                        className={scanBin === selectedTask.location ? "border-green-500 bg-green-50" : ""}
                      />
                    </div>
                  </div>

                  {/* Step 2: Scan Item */}
                  <div className={`space-y-2 transition-opacity ${scanBin !== selectedTask.location ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <Label className="text-xs font-bold uppercase text-slate-500 flex justify-between">
                      2. Confirm Item
                      {scanItem === selectedTask.sku && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    </Label>
                    <div className="p-3 bg-slate-50 rounded border mb-2">
                      <div className="text-sm font-bold text-slate-900">{selectedTask.sku}</div>
                      <div className="text-xs text-slate-500">{selectedTask.desc}</div>
                    </div>
                    <Input 
                      placeholder="Scan SKU..." 
                      value={scanItem}
                      onChange={e => setScanItem(e.target.value)}
                      className={scanItem === selectedTask.sku ? "border-green-500 bg-green-50" : ""}
                    />
                  </div>

                  {/* Step 3: Confirm Qty */}
                  <div className={`space-y-2 transition-opacity ${scanItem !== selectedTask.sku ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <Label className="text-xs font-bold uppercase text-slate-500">3. Pick Quantity</Label>
                    <Input 
                      type="number" 
                      value={scanQty}
                      onChange={e => setScanQty(e.target.value)}
                      className="font-mono text-lg"
                    />
                  </div>
                </CardContent>

                <div className="p-6 border-t bg-slate-50 flex flex-col gap-3">
                  <Button 
                    size="lg" 
                    className="w-full bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold"
                    disabled={scanBin !== selectedTask.location || scanItem !== selectedTask.sku}
                    onClick={handleConfirmPick}
                  >
                    Confirm Pick
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setIsExceptionOpen(true)}
                  >
                    Report Short Pick / Issue
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* --- EXCEPTION DIALOG --- */}
        <Dialog open={isExceptionOpen} onOpenChange={setIsExceptionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Report Pick Issue
              </DialogTitle>
              <DialogDescription>
                This will flag the task for supervisor review and move to the next item.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select onValueChange={setExceptionReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BIN_EMPTY">Bin Empty (Short Pick)</SelectItem>
                    <SelectItem value="DAMAGED">Item Damaged</SelectItem>
                    <SelectItem value="WRONG_ITEM">Wrong Item in Bin</SelectItem>
                    <SelectItem value="BLOCKED">Location Inaccessible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Additional details..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExceptionOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleShortPick}>Confirm Issue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}