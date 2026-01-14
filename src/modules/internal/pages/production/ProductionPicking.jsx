import React, { useState, useMemo, useEffect } from 'react'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Badge } from '../../../../components/ui/badge'
import { Progress } from '../../../../components/ui/progress'
import { Input } from '../../../../components/ui/input'
import { 
  Package, MapPin, CheckCircle2, AlertTriangle, ArrowRight, 
  ShoppingCart, Scan, Truck, Barcode, Printer, Box, AlertCircle
} from 'lucide-react'
import { useGlobalUNS } from '../../../../context/UNSContext'
import PageContainer from '../../../../components/PageContainer'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'
import { cn } from '../../../../lib/utils'

// --- CONFIGURATION ---
const TOPIC_TASKS = "Henkelv2/Shanghai/Logistics/Production/State/Picking_Tasks"
const TOPIC_ACTION_PICK = "Henkelv2/Shanghai/Logistics/Production/Action/Confirm_Pick"

export default function ProductionPicking() {
  const { data, publish } = useGlobalUNS()
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  
  // RF SCANNER STATE
  const [scanStep, setScanStep] = useState('SCAN_LOC') // SCAN_LOC -> SCAN_SKU -> CONFIRM
  const [scanInput, setScanInput] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [mockTargetHU, setMockTargetHU] = useState('TOTE-2026-X1') // Simulated "Pick Into" container

  // 1. DATA PROCESSING
  const taskData = data.raw[TOPIC_TASKS] || { items: [] }
  
  const { activeOrders } = useMemo(() => {
    const ordersMap = {}
    const allTasks = taskData.items || []

    allTasks.forEach(task => {
      // Filter logic (Same as before)
      if (task.status === 'STAGED' || task.status === 'COMPLETED') return

      // Mock Enterprise Data Enrichment (Since UNS might be raw)
      const enrichedTask = {
        ...task,
        lot_id: task.batch_id || "L-" + Math.floor(Math.random() * 9000), // Simulate Lot
        expiry: "2026-08-15", // Simulate FEFO
        qc_status: "Released", // Simulate QC
        is_priority: task.qty > 500
      }

      if (!ordersMap[task.order_id]) {
        ordersMap[task.order_id] = {
          id: task.order_id,
          tasks: [],
          total: 0,
          picked: 0,
          status: 'PENDING',
          hasException: false
        }
      }

      const order = ordersMap[task.order_id]
      order.tasks.push(enrichedTask)
      order.total++
      if (task.status === 'PICKED') order.picked++
    })

    // Sort Orders
    const ordersArray = Object.values(ordersMap).sort((a, b) => {
        if (a.status === 'READY_FOR_TRANSPORT') return 1;
        return 0;
    })

    return { activeOrders: ordersArray }
  }, [taskData])

  // 2. DETERMINE CURRENT ACTIVE TASK (The "Cursor" logic)
  const currentOrder = activeOrders.find(o => o.id === selectedOrderId) || activeOrders[0]
  
  // Find the first task that is NOT picked yet (The "Next Task")
  const activeTask = currentOrder?.tasks.find(t => t.status !== 'PICKED')

  // Reset scan step when task changes
  useEffect(() => {
    setScanStep('SCAN_LOC')
    setScanInput('')
  }, [activeTask?.task_id])

  // 3. RF GUN SIMULATION LOGIC
  const handleScanSubmit = (e) => {
    e?.preventDefault()
    if (!activeTask) return

    // Simulation Logic (In real life, validate against activeTask data)
    if (scanStep === 'SCAN_LOC') {
        // Validate Location (Mock: Accept anything that looks like a Loc)
        setScanStep('SCAN_SKU')
        setScanInput('')
    } else if (scanStep === 'SCAN_SKU') {
        // Validate Item/Lot
        setScanStep('CONFIRM')
        setScanInput(activeTask.qty) // Auto-fill Qty for speed
    } else if (scanStep === 'CONFIRM') {
        handleConfirmPick(activeTask)
    }
  }

  const handleConfirmPick = (task) => {
    setProcessingId(task.task_id)
    publish(TOPIC_ACTION_PICK, {
      task_id: task.task_id,
      operator_id: "User_Admin",
      target_hu: mockTargetHU, // CRITICAL: Binding the pick to a container
      timestamp: Date.now()
    })
    
    // Simulate slight network delay then reset
    setTimeout(() => {
        setProcessingId(null)
    }, 500)
  }

  // Helper for progress bar color
  const getProgressColor = (step) => {
      if (step === 'SCAN_LOC' && scanStep === 'SCAN_LOC') return 'bg-blue-600 animate-pulse'
      if (step === 'SCAN_SKU' && scanStep === 'SCAN_SKU') return 'bg-blue-600 animate-pulse'
      if (step === 'CONFIRM' && scanStep === 'CONFIRM') return 'bg-blue-600 animate-pulse'
      const steps = ['SCAN_LOC', 'SCAN_SKU', 'CONFIRM']
      return steps.indexOf(scanStep) > steps.indexOf(step) ? 'bg-emerald-500' : 'bg-slate-200'
  }

  return (
    <PageContainer title="Picking Workbench" subtitle="RF-Guided Task Execution" variant="standard">
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_TASKS} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
          
          {/* --- LEFT COL: WORK QUEUE (Unchanged structure, refined style) --- */}
          <Card className="lg:col-span-1 bg-slate-50 border-slate-200 flex flex-col h-full">
            <CardHeader className="pb-3 bg-white border-b border-slate-200 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Pick Waves
                </CardTitle>
                <Badge variant="secondary">{activeOrders.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
               {/* (Kept your existing mapping logic here, omitted for brevity) */}
               {activeOrders.map(order => {
                  const progress = Math.round((order.picked / order.total) * 100)
                  const isSelected = currentOrder?.id === order.id
                  return (
                    <div 
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={cn(
                        "cursor-pointer p-3 rounded-lg border transition-all",
                        isSelected ? "border-indigo-500 bg-white shadow-md ring-1 ring-indigo-200" : "border-slate-200 bg-white hover:border-indigo-300"
                      )}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono font-bold text-sm text-slate-800">{order.id}</span>
                        <span className="text-xs text-slate-500">{order.picked}/{order.total} Lines</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )
               })}
            </CardContent>
          </Card>

          {/* --- RIGHT COL: EXECUTION (The Enterprise Upgrade) --- */}
          <div className="lg:col-span-2 flex flex-col gap-4 h-full overflow-hidden">
            
            {activeTask ? (
                <>
                {/* 1. TOP: ACTIVE TASK CARD (The "What" & "Where") */}
                <Card className="border-l-4 border-l-indigo-600 shadow-md bg-white shrink-0">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 mb-2">
                                    Current Task: {activeTask.task_id}
                                </Badge>
                                <h2 className="text-3xl font-bold text-slate-900">{activeTask.material_name}</h2>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <span className="font-mono text-sm">Batch: {activeTask.batch_id}</span>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 text-[10px]">
                                        QC: {activeTask.qc_status}
                                    </Badge>
                                    <Badge variant="outline" className="text-slate-600 bg-slate-50 text-[10px]">
                                        Exp: {activeTask.expiry}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Pick From</div>
                                <div className="text-4xl font-mono font-black text-indigo-600">{activeTask.from_loc}</div>
                                <div className="text-sm font-bold text-slate-700 mt-1">Qty: {activeTask.qty} KG</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. MIDDLE: CONTAINER & METADATA (The "To") */}
                <div className="grid grid-cols-2 gap-4 shrink-0">
                    <Card className="bg-slate-50 border-dashed border-slate-300">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <div className="text-xs text-slate-500 font-bold uppercase">Target HU (Tote)</div>
                                <div className="text-xl font-mono font-bold text-slate-800 flex items-center gap-2">
                                    <Box className="h-5 w-5 text-amber-600" />
                                    {mockTargetHU}
                                </div>
                            </div>
                            <Button size="icon" variant="ghost"><Printer className="h-4 w-4 text-slate-400"/></Button>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200">
                         <CardContent className="p-4 flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                                <div>Next Location</div>
                                <div className="font-mono font-bold">B-02-11 (Proximity: Near)</div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300" />
                        </CardContent>
                    </Card>
                </div>

                {/* 3. BOTTOM: RF CONSOLE (The "Action") */}
                <Card className="flex-1 bg-slate-900 text-white flex flex-col shadow-xl overflow-hidden border-slate-800">
                    <div className="p-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-xs font-mono text-slate-400">
                        <div className="flex items-center gap-2"><Scan className="h-4 w-4 text-blue-400"/> RF COMMAND</div>
                        <div>Connected: 24ms</div>
                    </div>
                    
                    <div className="flex-1 p-6 flex flex-col justify-center max-w-2xl mx-auto w-full space-y-6">
                        {/* Step Visualizer */}
                        <div className="flex items-center gap-2 mb-4">
                            <div className={cn("h-2 flex-1 rounded-full", getProgressColor('SCAN_LOC'))} />
                            <div className={cn("h-2 flex-1 rounded-full", getProgressColor('SCAN_SKU'))} />
                            <div className={cn("h-2 flex-1 rounded-full", getProgressColor('CONFIRM'))} />
                        </div>

                        {/* Prompt */}
                        <div className="text-center">
                            <h3 className="text-2xl font-bold mb-1">
                                {scanStep === 'SCAN_LOC' && `Scan Bin: ${activeTask.from_loc}`}
                                {scanStep === 'SCAN_SKU' && `Scan Item / Batch`}
                                {scanStep === 'CONFIRM' && `Confirm Qty: ${activeTask.qty}`}
                            </h3>
                            <p className="text-slate-400 text-sm">
                                {scanStep === 'SCAN_LOC' ? "Verify you are at the correct location" : 
                                 scanStep === 'SCAN_SKU' ? "Verify material correctness" : "Ensure physical quantity matches"}
                            </p>
                        </div>

                        {/* Input & Action */}
                        <form onSubmit={handleScanSubmit} className="flex gap-4">
                            <div className="relative flex-1">
                                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
                                <Input 
                                    autoFocus
                                    value={scanInput}
                                    onChange={e => setScanInput(e.target.value)}
                                    className="pl-10 h-14 text-lg bg-slate-800 border-slate-600 text-white focus-visible:ring-blue-500 font-mono"
                                    placeholder={scanStep === 'CONFIRM' ? "Enter Quantity" : "Scan Barcode..."}
                                />
                            </div>
                            <Button 
                                type="submit" 
                                size="lg" 
                                className="h-14 px-8 bg-blue-600 hover:bg-blue-500 font-bold text-lg shadow-lg shadow-blue-900/20"
                                disabled={processingId === activeTask.task_id}
                            >
                                {scanStep === 'CONFIRM' ? "CONFIRM" : "ENTER"}
                            </Button>
                        </form>

                        {/* Exceptions Toolbar (Critical for Enterprise) */}
                        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800">
                            <Button variant="outline" className="border-slate-700 bg-transparent text-slate-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-900 h-10 text-xs">
                                <AlertCircle className="mr-2 h-3 w-3" /> Short Pick
                            </Button>
                            <Button variant="outline" className="border-slate-700 bg-transparent text-slate-400 hover:bg-amber-900/20 hover:text-amber-400 hover:border-amber-900 h-10 text-xs">
                                <Box className="mr-2 h-3 w-3" /> Bin Empty
                            </Button>
                            <Button variant="outline" className="border-slate-700 bg-transparent text-slate-400 hover:bg-slate-800 h-10 text-xs">
                                <AlertTriangle className="mr-2 h-3 w-3" /> Damaged
                            </Button>
                        </div>
                    </div>
                </Card>
                </>
            ) : (
                /* Empty State when order is done */
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400">
                    <CheckCircle2 className="h-16 w-16 mb-4 text-emerald-500/50" />
                    <p className="text-lg font-medium text-slate-600">Picking Complete</p>
                    {currentOrder ? (
                        <p className="text-sm mb-4">Order {currentOrder.id} is ready for transport.</p>
                    ) : (
                        <p className="text-sm mb-4">No active orders available.</p>
                    )}
                    <Button variant="outline">Print Transport Label</Button>
                </div>
            )}

          </div>
        </div>
      </div>
    </PageContainer>
  )
}