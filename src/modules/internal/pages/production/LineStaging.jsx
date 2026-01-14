import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Badge } from '../../../../components/ui/badge'
import { Progress } from '../../../../components/ui/progress'
import { Input } from '../../../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { 
  Truck, ArrowRight, Package, AlertTriangle, MapPin, CheckCircle2, 
  Layers, Beaker, ScanLine, Clock, ShieldAlert, AlertCircle, Filter, XCircle
} from 'lucide-react'
import { useGlobalUNS } from '../../../../context/UNSContext'
import PageContainer from '../../../../components/PageContainer'
import { cn } from '../../../../lib/utils'

const TOPIC_TASKS = "Henkelv2/Shanghai/Logistics/Production/State/Picking_Tasks"
const TOPIC_ACTION_STAGE = "Henkelv2/Shanghai/Logistics/Production/Action/Confirm_Stage"

// --- UPDATED MASTER DATA ---
const DEMAND_Mock = {
  // Existing
  'ORD-FLOOD-6482': { target: 1200, unit: 'KG', due: '14:00', line: 'L1', risk: 'Low' },
  'ORD-FLOOD-1410': { target: 600, unit: 'KG', due: '16:30', line: 'L2', risk: 'Med' },
  // New Bindings (Fixing the ??)
  'ORD-FLOOD-390':  { target: 2000, unit: 'KG', due: '11:30', line: 'L1', risk: 'High' }, 
  'ORD-FLOOD-6343': { target: 2000, unit: 'KG', due: '13:00', line: 'L1', risk: 'Low' },
  'ORD-FLOOD-8631': { target: 2000, unit: 'KG', due: '15:15', line: 'L1', risk: 'Low' },
  'ORD-FLOOD-9016': { target: 2000, unit: 'KG', due: '17:00', line: 'L1', risk: 'Low' },
  'PO-SAP-8675':    { target: 2000, unit: 'KG', due: '18:45', line: 'L2', risk: 'Low' },
  'ORD-2026-001':   { target: 2000, unit: 'KG', due: 'Next Day', line: 'L2', risk: 'Low' }
}

export default function LineStaging() {
  const { data, publish } = useGlobalUNS()
  const [selectedTransitItem, setSelectedTransitItem] = useState(null)
  
  // View State
  const [lineFilter, setLineFilter] = useState('ALL') // 'ALL', 'L1', 'L2'

  // Execution State (Scanner Simulation)
  const [scanInput, setScanInput] = useState('')
  const [scanMode, setScanMode] = useState('HU') // 'HU' -> 'LANE'
  const [scannedHu, setScannedHu] = useState(null)

  // 1. Data Processing
  const rawItems = data.raw[TOPIC_TASKS]?.items || []
  // Create a copy to avoid mutation issues
  const taskDataItems = [...rawItems]

  const { inTransit, lanes, demandStats, exceptions, suggestion } = useMemo(() => {
    const transit = []
    const exceptionsList = []
    const stats = {} 
    
    // A. Define Physical Layout (Now with 'line' attribute)
    const physicalLanes = [
      { id: 'LANE-01', line: 'L1', type: 'RM', label: 'L1 Solids A', capacity: 3, slots: [null, null, null] },
      { id: 'LANE-02', line: 'L1', type: 'RM', label: 'L1 Solids B', capacity: 3, slots: [null, null, null] },
      { id: 'LANE-03', line: 'L2', type: 'RM', label: 'L2 Solids', capacity: 3, slots: [null, null, null] },
      { id: 'BUFFER-TANK-01', line: 'L1', type: 'SFG', label: 'L1 Liquid Buffer', capacity: 1, slots: [null] },
      { id: 'BUFFER-TANK-02', line: 'L2', type: 'SFG', label: 'L2 Liquid Buffer', capacity: 1, slots: [null] },
    ]

    taskDataItems.forEach(task => {
       const isSFG = task.material_name?.includes("Premix") || task.material_name?.includes("Base")
       
       // Enterprise Data Enrichment
       const enriched = { 
         ...task, 
         inv_type: isSFG ? 'SFG' : 'RM',
         hu_id: task.hu_id || (task.batch_id + "-HU"), 
         // Mock Compliance Data
         expiry: "2026-06-12", 
         qc_status: "Released", // Released, Hold, Quarantine
         aging: "20m",
         risk: Math.random() > 0.9 ? 'QC_HOLD' : 'OK' 
       }

       // Track Demand
       if (!stats[task.order_id]) stats[task.order_id] = { staged: 0, pending: 0 }
       
       if (task.status === 'PICKED') {
         transit.push(enriched)
         stats[task.order_id].pending += parseFloat(task.qty)
       } else if (task.status === 'STAGED') {
         const finalLocation = task.actual_to_loc || task.to_loc;
         const laneIndex = physicalLanes.findIndex(l => l.id === finalLocation)
         
         if (laneIndex !== -1) {
            const slotIndex = physicalLanes[laneIndex].slots.findIndex(s => s === null)
            if (slotIndex !== -1) {
                physicalLanes[laneIndex].slots[slotIndex] = enriched
            } else {
                exceptionsList.push({ type: 'OVERFLOW', msg: `Lane ${finalLocation} Full`, item: enriched })
            }
            stats[task.order_id].staged += parseFloat(task.qty)
         } else {
             exceptionsList.push({ type: 'LOC_ERR', msg: `Lost HU ${enriched.hu_id}`, item: enriched })
         }
       }
    })

    // B. Calculate Recommendation for Scanned HU
    let rec = null;
    const activeItem = scannedHu || selectedTransitItem;
    if (activeItem) {
        const targetLine = DEMAND_Mock[activeItem.order_id]?.line || 'L1'; 
        const bestLane = physicalLanes.find(l => l.line === targetLine && l.type === activeItem.inv_type && l.slots.includes(null));
        
        if (bestLane) {
            const slotIdx = bestLane.slots.findIndex(s => s === null);
            rec = { laneId: bestLane.id, slot: `S${slotIdx + 1}` };
        }
    }

    return { inTransit: transit, lanes: physicalLanes, demandStats: stats, exceptions: exceptionsList, suggestion: rec }
  }, [taskDataItems, scannedHu, selectedTransitItem])

  // 2. Action: Stage
  const handleStage = (task, targetLaneId) => {
    publish(TOPIC_ACTION_STAGE, {
      task_id: task.task_id,
      operator_id: "User_Admin", 
      to_loc: targetLaneId,
      timestamp: Date.now()
    })
    setSelectedTransitItem(null)
    setScannedHu(null)
    setScanMode('HU')
    setScanInput('')
  }

  // 3. Scan Handler
  const handleScan = (e) => {
    if (e.key === 'Enter') {
        if (scanMode === 'HU') {
            const found = inTransit.find(i => i.hu_id.toLowerCase().includes(scanInput.toLowerCase()) || i.batch_id?.toLowerCase().includes(scanInput.toLowerCase()))
            if (found) {
                setScannedHu(found)
                setScanMode('LANE')
                setScanInput('') 
            } else {
                alert("HU Not Found in Transit")
            }
        } else if (scanMode === 'LANE') {
            const lane = lanes.find(l => scanInput.toLowerCase().startsWith(l.id.toLowerCase()))
            if (lane && scannedHu) {
                handleStage(scannedHu, lane.id)
            } else {
                alert("Invalid Lane")
            }
        }
    }
  }

  // Filter Lanes for Display
  const visibleLanes = lineFilter === 'ALL' ? lanes : lanes.filter(l => l.line === lineFilter)

  return (
    <PageContainer title="Line Staging Workbench" subtitle="Line Feeding & Point-of-Use Management" variant="compact">
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-140px)]">
        
        {/* --- COL 1: CONTROL TOWER (Unified Stack) --- */}
        <div className="lg:col-span-1 flex flex-col h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm min-h-0">
            
            {/* SECTION A: DEMAND (Header) */}
            <div className="bg-slate-50 p-2 border-b border-slate-200 shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" /> Production Demand
                </h3>
            </div>
            {/* CHANGE: Removed fixed maxHeight. Let it scroll if huge, but usually it fits. */}
            <div className="overflow-y-auto flex-shrink-0 border-b border-slate-100 max-h-[35%]">
                {Object.entries(demandStats).map(([orderId, stat]) => {
                    const meta = DEMAND_Mock[orderId] || { target: 2000, line: '??', risk: 'Low' }
                    const pct = Math.min(100, Math.round((stat.staged / meta.target) * 100))
                    
                    return (
                        <div key={orderId} className="p-2 hover:bg-slate-50 border-b border-slate-50 transition-colors space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="font-mono font-medium text-slate-700 truncate pr-2">{orderId} ({meta.line})</span>
                                <span className={cn("font-bold whitespace-nowrap", pct < 100 ? "text-amber-600" : "text-emerald-600")}>
                                    {stat.staged} / {meta.target} {meta.unit}
                                </span>
                            </div>
                            <Progress value={pct} className="h-1.5 bg-slate-100" indicatorClassName={pct < 50 ? 'bg-red-500' : pct < 100 ? 'bg-amber-500' : 'bg-emerald-500'} />
                        </div>
                    )
                })}
                {Object.keys(demandStats).length === 0 && (
                    <div className="p-3">
                        <p className="text-xs text-slate-400 italic">No active demand signals.</p>
                    </div>
                )}
            </div>

            {/* SECTION B: EXCEPTIONS (Middle Priority) */}
            {exceptions.length > 0 && (
                <div className="bg-red-50 border-b border-red-100 flex-shrink-0 max-h-[25%] overflow-y-auto">
                    <div className="px-2 py-1.5 flex items-center justify-between sticky top-0 bg-red-50">
                        <span className="text-xs font-bold text-red-700 uppercase flex gap-2">
                            <AlertTriangle className="h-3 w-3" /> Exceptions
                        </span>
                        <Badge variant="destructive" className="h-5 text-[10px] px-1">{exceptions.length}</Badge>
                    </div>
                    <div className="p-2 space-y-1">
                        {exceptions.map((ex, i) => (
                            <div key={i} className="flex items-start gap-2 bg-white p-2 rounded border border-red-100 text-xs">
                                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-red-800">{ex.msg}</div>
                                    <div className="text-red-600 font-mono mt-0.5">{ex.item.hu_id}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECTION C: IN TRANSIT (Takes remaining space) */}
            <div className="bg-slate-50 p-2 border-b border-slate-200 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-slate-500 uppercase flex gap-2">
                    <Truck className="h-3 w-3" /> In Transit
                </span>
                <div className="flex items-center gap-2">
                    {scannedHu && <Badge className="bg-blue-600 animate-pulse text-[10px]">Scanning...</Badge>}
                    <span className="text-[10px] font-mono text-slate-400">{inTransit.length} Items</span>
                </div>
            </div>
            {/* CHANGE: Use flex-1 to fill the rest of the column height naturally */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-2 min-h-0">
                {inTransit.map(item => (
                    <div 
                        key={item.task_id}
                        onClick={() => setSelectedTransitItem(item.task_id === selectedTransitItem?.task_id ? null : item)}
                        className={cn(
                            "cursor-pointer p-2 rounded border shadow-sm transition-all group relative mb-2",
                            (selectedTransitItem?.task_id === item.task_id || scannedHu?.task_id === item.task_id)
                                ? "border-blue-500 bg-white ring-1 ring-blue-200" 
                                : "border-slate-200 bg-white hover:border-blue-300"
                        )}
                    >
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex gap-1">
                                <Badge variant="outline" className="font-mono text-[9px] h-4 px-1 border-slate-200 text-slate-500">
                                    {item.inv_type}
                                </Badge>
                                <Badge variant="outline" className="font-mono text-[9px] h-4 px-1 border-slate-200 text-slate-500">
                                    {item.order_id}
                                </Badge>
                            </div>
                            {item.risk === 'QC_HOLD' && <AlertCircle className="h-3 w-3 text-red-500" />}
                        </div>
                        
                        {/* Material */}
                        <div className="font-bold text-xs text-slate-900 leading-tight mb-1.5 truncate">{item.material_name}</div>
                        
                        {/* Compliance Chips */}
                        <div className="flex flex-wrap gap-1">
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                                {item.hu_id}
                            </span>
                            <span className={cn("inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium border", 
                                item.qc_status === 'Released' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                            )}>
                                {item.qc_status}
                            </span>
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Exp: {item.expiry}
                            </span>
                        </div>

                        {/* Arrow */}
                        {(selectedTransitItem?.task_id === item.task_id || scannedHu?.task_id === item.task_id) && (
                            <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
                                <ArrowRight className="h-5 w-5 text-blue-600 drop-shadow-sm animate-pulse" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* --- COL 2: EXECUTION & SUPERMARKET --- */}
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0">
            
            {/* D. EXECUTION BAR (RF Workflow) */}
            <div className="bg-slate-800 p-2.5 rounded-lg flex flex-col md:flex-row items-center gap-3 shadow-md border border-slate-700 shrink-0">
                <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider px-2 shrink-0">
                    <ScanLine className="h-5 w-5 text-blue-400" /> 
                    RF Command
                </div>
                <div className="h-8 w-px bg-slate-600 hidden md:block"></div>
                
                {/* Steps Visualizer */}
                <div className="flex gap-2 items-center shrink-0">
                    <div className={cn("text-xs font-mono px-2 py-1 rounded transition-colors", scanMode === 'HU' ? "bg-blue-600 text-white font-bold" : "text-slate-400 bg-slate-700/50")}>1. SCAN HU</div>
                    <ArrowRight className="h-3 w-3 text-slate-600" />
                    <div className={cn("text-xs font-mono px-2 py-1 rounded transition-colors", scanMode === 'LANE' ? "bg-blue-600 text-white font-bold" : "text-slate-400 bg-slate-700/50")}>2. SCAN LANE</div>
                </div>

                {/* Input Area */}
                <div className="flex-1 w-full relative">
                    <Input 
                        autoFocus
                        placeholder={scanMode === 'HU' ? "Waiting for HU Scan..." : `Scan Destination...`}
                        className="w-full bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:ring-blue-500 font-mono pl-3 pr-32"
                        value={scanInput}
                        onChange={e => setScanInput(e.target.value)}
                        onKeyDown={handleScan}
                    />
                    {/* Recommendation Hint */}
                    {suggestion && scanMode === 'LANE' && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-mono flex items-center gap-1 animate-pulse">
                            <CheckCircle2 className="h-3 w-3" /> Rec: {suggestion.laneId}-{suggestion.slot}
                        </div>
                    )}
                </div>
            </div>

            {/* E. LANE MAP (Slot Based) */}
            <Card className="flex-1 border-slate-200 shadow-sm flex flex-col bg-slate-50/50 overflow-hidden min-h-0">
                <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between h-9 shrink-0">
                    <div className="flex items-center gap-2 pl-2">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Storage Lanes</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                        <Select value={lineFilter} onValueChange={setLineFilter}>
                            <SelectTrigger className="h-7 w-[130px] text-xs bg-slate-50"><SelectValue placeholder="Filter Line" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Lines</SelectItem>
                                <SelectItem value="L1">Line 1 (Auto)</SelectItem>
                                <SelectItem value="L2">Line 2 (Manual)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <CardContent className="p-4 overflow-y-auto min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {visibleLanes.map(lane => {
                            const activeItem = selectedTransitItem || scannedHu
                            const isCompatible = activeItem && activeItem.inv_type === lane.type
                            const hasSpace = lane.slots.some(s => s === null)
                            const isRecommended = suggestion?.laneId === lane.id
                            
                            let borderClass = "border-slate-300"
                            let bgClass = "bg-white"
                            
                            if (isCompatible) {
                                if (hasSpace) {
                                    borderClass = isRecommended ? "border-emerald-500 ring-2 ring-emerald-100" : "border-blue-400 border-dashed ring-2 ring-blue-50"
                                    bgClass = "bg-blue-50/30 cursor-pointer"
                                } else {
                                    borderClass = "border-red-300 bg-red-50/30 opacity-60 cursor-not-allowed"
                                }
                            }

                            return (
                                <div 
                                    key={lane.id}
                                    onClick={() => isCompatible && hasSpace && handleStage(activeItem, lane.id)}
                                    // CHANGE: Increased min-height for the lane container so it doesn't look cramped
                                    className={cn("rounded-xl border-2 p-3 transition-all relative min-h-[220px] flex flex-col", borderClass, bgClass)}
                                >
                                    {/* Lane Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-1.5">
                                            {lane.type === 'SFG' ? <Beaker className="h-3.5 w-3.5 text-purple-500"/> : <Package className="h-3.5 w-3.5 text-slate-500"/>}
                                            <span className="font-bold text-xs text-slate-700">{lane.label}</span>
                                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-slate-100 text-slate-500">{lane.line}</Badge>
                                        </div>
                                        <div className="font-mono text-[9px] text-slate-400">{lane.id}</div>
                                    </div>

                                    {/* SLOTS RENDERER */}
                                    {/* FIX 1: Use 'grid grid-cols-3' instead of flex. This forces exact 33% width per slot. 
                                        Added 'w-full' and 'mt-auto' to ensure it sits at the bottom. */}
                                    <div className="grid grid-cols-3 gap-2 w-full mt-auto">
                                        {lane.slots.map((slotItem, idx) => (
                                            <div 
                                                key={idx} 
                                                className={cn(
                                                    // FIX 2: Added 'min-w-0'. This is CRITICAL. It allows the box to shrink 
                                                    // past the text width, enabling the truncation to work.
                                                    "h-28 rounded-lg border flex flex-col p-1.5 relative transition-all min-w-0",
                                                    slotItem 
                                                        ? "bg-white border-slate-400 shadow-md ring-1 ring-slate-100" 
                                                        : "bg-slate-50/50 border-slate-200 border-dashed opacity-70"
                                                )}
                                            >
                                                {/* Slot Label */}
                                                <span className="absolute top-1 right-1.5 text-[9px] font-bold text-slate-300">S{idx+1}</span>
                                                
                                                {slotItem ? (
                                                    <div className="flex flex-col h-full justify-between overflow-hidden">
                                                        {/* TOP: CRITICAL IDENTIFIERS */}
                                                        <div className="border-b border-slate-100 pb-1 mb-1">
                                                            <div className="font-mono text-xs font-black text-slate-800 tracking-tight leading-tight truncate">
                                                                {slotItem.hu_id.split('-HU')[0]} 
                                                            </div>
                                                            <div className="text-[8px] text-slate-400 font-mono leading-tight mt-0.5 truncate">
                                                                HU: {slotItem.hu_id}
                                                            </div>
                                                        </div>

                                                        {/* BOTTOM: Descriptive Data */}
                                                        <div className="flex justify-between items-end">
                                                            <div className="text-[10px] font-medium text-slate-600 leading-tight truncate pr-1">
                                                                {slotItem.material_name}
                                                            </div>
                                                            <Badge variant="outline" className="shrink-0 h-4 text-[9px] px-1 bg-slate-100 border-slate-300 text-slate-700 font-mono">
                                                                {slotItem.qty}kg
                                                            </Badge>
                                                        </div>
                                                        
                                                        {/* QC Status Indicator */}
                                                        <div className={cn("absolute top-2 left-2 w-1.5 h-1.5 rounded-full", 
                                                            slotItem.qc_status === 'Released' ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                                                        )} />
                                                    </div>
                                                ) : (
                                                    /* Empty State */
                                                    <div className="h-full flex flex-col items-center justify-center gap-1">
                                                        {isCompatible && hasSpace && !lane.slots.slice(0, idx).includes(null) ? (
                                                            <div className="w-full h-full border-2 border-blue-400/30 rounded border-dashed flex items-center justify-center bg-blue-50/20">
                                                                <span className="text-blue-500 font-bold text-[9px]">SCAN</span>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Action Hint Overlay */}
                                    {isCompatible && hasSpace && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-blue-500/5 rounded-xl pointer-events-none">
                                            <Button size="sm" className="bg-blue-600 shadow-lg">Put to {lane.id}</Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>
    </PageContainer>
  )
}