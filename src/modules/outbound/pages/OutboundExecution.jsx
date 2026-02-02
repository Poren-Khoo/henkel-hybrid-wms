/**
 * OutboundExecution.jsx - Consolidated Execution Page
 * 
 * Combined view for outbound execution operations:
 * - Picking: Task queue with priority sorting
 * - Staging: Zone-based view of staged items
 * - Loading: Dock assignments and progress
 * 
 * No hardcoded mocks - displays empty states until Node-RED publishes data.
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import { Progress } from '../../../components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from '../../../components/ui/sheet'
import {
    ClipboardList, Package, Truck, MapPin, Play, CheckCircle, Clock,
    AlertTriangle, RefreshCw, ArrowRight, Box, Layers, Search
} from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'

// --- MQTT TOPICS ---
const TOPIC_PICK_QUEUE = "Henkelv2/Shanghai/Logistics/Outbound/State/Picking_Queue"
const TOPIC_STAGING_AREA = "Henkelv2/Shanghai/Logistics/Outbound/State/Staging_Area"
const TOPIC_LOADING_DOCKS = "Henkelv2/Shanghai/Logistics/Outbound/State/Loading_Docks"
const TOPIC_CONFIRM_PICK = "Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Pick"
const TOPIC_CONFIRM_STAGE = "Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Stage"
const TOPIC_CONFIRM_LOAD = "Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Load"
const TOPIC_REPORT_SHORT = "Henkelv2/Shanghai/Logistics/Outbound/Action/Report_Short_Pick"

// --- STATUS CONFIGS ---
const PICK_STATUS_CONFIG = {
    'PENDING': { label: 'Pending', color: 'bg-slate-100 text-slate-700', icon: Clock },
    'ASSIGNED': { label: 'Assigned', color: 'bg-blue-100 text-blue-700', icon: ClipboardList },
    'IN_PROGRESS': { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: RefreshCw },
    'COMPLETED': { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    'SHORT': { label: 'Short Pick', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
}

const DOCK_STATUS_CONFIG = {
    'AVAILABLE': { label: 'Available', color: 'bg-green-100 text-green-700' },
    'WAITING': { label: 'Waiting', color: 'bg-yellow-100 text-yellow-700' },
    'LOADING': { label: 'Loading', color: 'bg-blue-100 text-blue-700' },
    'COMPLETED': { label: 'Completed', color: 'bg-slate-100 text-slate-700' }
}

// --- TABS ---
const EXECUTION_TABS = [
    { id: 'picking', label: 'Picking', icon: ClipboardList, topic: TOPIC_PICK_QUEUE },
    { id: 'staging', label: 'Staging', icon: Package, topic: TOPIC_STAGING_AREA },
    { id: 'loading', label: 'Loading', icon: Truck, topic: TOPIC_LOADING_DOCKS }
]

export default function OutboundExecution() {
    const { data, publish } = useGlobalUNS()

    // --- STATE ---
    const [activeTab, setActiveTab] = useState('picking')
    const [selectedTask, setSelectedTask] = useState(null)
    const [pickedQty, setPickedQty] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    // --- DATA FROM UNS ---
    const pickTasks = useMemo(() => {
        const rawData = data.raw?.[TOPIC_PICK_QUEUE]
        const list = Array.isArray(rawData) ? rawData : rawData?.tasks || rawData?.queue || []
        return list
    }, [data.raw])

    const stagingAreas = useMemo(() => {
        const rawData = data.raw?.[TOPIC_STAGING_AREA]
        const list = Array.isArray(rawData) ? rawData : rawData?.areas || rawData?.zones || []
        return list
    }, [data.raw])

    const loadingDocks = useMemo(() => {
        const rawData = data.raw?.[TOPIC_LOADING_DOCKS]
        const list = Array.isArray(rawData) ? rawData : rawData?.docks || []
        return list
    }, [data.raw])

    // --- FILTERING ---
    const filteredPickTasks = useMemo(() => {
        if (!searchQuery) return pickTasks
        const q = searchQuery.toLowerCase()
        return pickTasks.filter(t =>
            t.task_id?.toLowerCase().includes(q) ||
            t.material_code?.toLowerCase().includes(q) ||
            t.from_location?.toLowerCase().includes(q)
        )
    }, [pickTasks, searchQuery])

    // --- COUNTS ---
    const taskCounts = useMemo(() => ({
        pending: pickTasks.filter(t => t.status === 'PENDING').length,
        inProgress: pickTasks.filter(t => t.status === 'IN_PROGRESS').length,
        completed: pickTasks.filter(t => t.status === 'COMPLETED').length,
        total: pickTasks.length
    }), [pickTasks])

    // --- ACTIONS ---
    const handleStartPick = (task) => {
        setSelectedTask(task)
        setPickedQty(task.qty?.toString() || '')
    }

    const handleConfirmPick = () => {
        if (!selectedTask) return
        const payload = {
            task_id: selectedTask.task_id,
            picked_qty: parseFloat(pickedQty) || 0,
            operator: 'Current User',
            timestamp: Date.now()
        }
        publish(TOPIC_CONFIRM_PICK, payload)
        setSelectedTask(null)
        setPickedQty('')
    }

    const handleReportShort = () => {
        if (!selectedTask) return
        const payload = {
            task_id: selectedTask.task_id,
            expected_qty: selectedTask.qty,
            actual_qty: parseFloat(pickedQty) || 0,
            reason: 'Stock not found at location',
            operator: 'Current User',
            timestamp: Date.now()
        }
        publish(TOPIC_REPORT_SHORT, payload)
        setSelectedTask(null)
        setPickedQty('')
    }

    const handleConfirmStage = (areaId, dnNo) => {
        const payload = {
            area_id: areaId,
            dn_no: dnNo,
            operator: 'Current User',
            timestamp: Date.now()
        }
        publish(TOPIC_CONFIRM_STAGE, payload)
    }

    const handleConfirmLoad = (dockId, shipmentId) => {
        const payload = {
            dock_id: dockId,
            shipment_id: shipmentId,
            operator: 'Current User',
            timestamp: Date.now()
        }
        publish(TOPIC_CONFIRM_LOAD, payload)
    }

    // --- HELPERS ---
    const getPickStatusBadge = (status) => {
        const config = PICK_STATUS_CONFIG[status] || PICK_STATUS_CONFIG['PENDING']
        const Icon = config.icon
        return (
            <Badge variant="secondary" className={`${config.color} font-medium text-[10px] px-2`}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
            </Badge>
        )
    }

    // --- RENDER PICKING TAB ---
    const renderPickingTab = () => (
        <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-slate-900">{taskCounts.total}</p>
                        <p className="text-xs text-slate-500">Total Tasks</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-amber-600">{taskCounts.pending}</p>
                        <p className="text-xs text-slate-500">Pending</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{taskCounts.inProgress}</p>
                        <p className="text-xs text-slate-500">In Progress</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{taskCounts.completed}</p>
                        <p className="text-xs text-slate-500">Completed</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by task ID, material, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Task Table */}
            <Card className="border-slate-200">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="text-xs font-bold">Task ID</TableHead>
                            <TableHead className="text-xs font-bold">Status</TableHead>
                            <TableHead className="text-xs font-bold">Material</TableHead>
                            <TableHead className="text-xs font-bold">Batch</TableHead>
                            <TableHead className="text-xs font-bold">From Location</TableHead>
                            <TableHead className="text-xs font-bold">To Location</TableHead>
                            <TableHead className="text-xs font-bold text-right">Qty</TableHead>
                            <TableHead className="text-xs font-bold">Wave</TableHead>
                            <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPickTasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-48 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <ClipboardList className="h-10 w-10 text-slate-300" />
                                        <p className="font-medium">No pick tasks available</p>
                                        <p className="text-xs">Tasks will appear when orders are released and allocated</p>
                                        <p className="text-xs text-slate-400 mt-2">
                                            Listening on: <code className="bg-slate-100 px-1 rounded">{TOPIC_PICK_QUEUE}</code>
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPickTasks.map(task => (
                                <TableRow key={task.task_id} className="hover:bg-blue-50/50">
                                    <TableCell className="font-mono text-xs font-bold text-blue-600">{task.task_id}</TableCell>
                                    <TableCell>{getPickStatusBadge(task.status)}</TableCell>
                                    <TableCell className="text-xs">
                                        <div>
                                            <span className="font-medium">{task.material_code}</span>
                                            {task.material_desc && (
                                                <span className="text-slate-500 ml-1">- {task.material_desc}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">{task.batch || '-'}</TableCell>
                                    <TableCell className="text-xs">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 text-slate-400" />
                                            {task.from_location}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <span className="flex items-center gap-1">
                                            <ArrowRight className="h-3 w-3 text-slate-400" />
                                            {task.to_location}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-mono">{task.qty} {task.uom}</TableCell>
                                    <TableCell className="text-xs">
                                        {task.wave_id ? (
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px]">
                                                <Layers className="h-3 w-3 inline mr-1" />
                                                {task.wave_id}
                                            </span>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {task.status === 'PENDING' || task.status === 'ASSIGNED' ? (
                                            <Button
                                                size="sm"
                                                className="h-7 text-xs bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121]"
                                                onClick={() => handleStartPick(task)}
                                            >
                                                <Play className="h-3 w-3 mr-1" /> Start
                                            </Button>
                                        ) : task.status === 'COMPLETED' ? (
                                            <span className="text-green-600 text-xs flex items-center justify-end gap-1">
                                                <CheckCircle className="h-3.5 w-3.5" /> Done
                                            </span>
                                        ) : (
                                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleStartPick(task)}>
                                                View
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )

    // --- RENDER STAGING TAB ---
    const renderStagingTab = () => (
        <div className="space-y-4">
            {stagingAreas.length === 0 ? (
                <Card className="border-slate-200">
                    <CardContent className="py-16 text-center text-slate-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-lg font-medium">No staging areas configured</p>
                        <p className="text-sm mt-1">Staging area data will appear when published by backend</p>
                        <p className="text-xs text-slate-400 mt-4">
                            Listening on: <code className="bg-slate-100 px-1 rounded">{TOPIC_STAGING_AREA}</code>
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stagingAreas.map(area => (
                        <Card key={area.area_id} className="border-slate-200 hover:border-slate-300 transition-colors">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-sm font-bold">{area.area_id}</CardTitle>
                                    <Badge variant="secondary" className={area.items?.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                                        {area.items?.length > 0 ? `${area.items.length} items` : 'Available'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {area.items?.length > 0 ? (
                                    <div className="space-y-2">
                                        {area.items.slice(0, 5).map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-xs p-2 bg-slate-50 rounded">
                                                <span className="font-mono text-blue-600">{item.dn_no}</span>
                                                <span className="text-slate-500">{item.line_count} lines</span>
                                            </div>
                                        ))}
                                        {area.items.length > 5 && (
                                            <p className="text-xs text-slate-400 text-center">+{area.items.length - 5} more</p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-4">Empty zone</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )

    // --- RENDER LOADING TAB ---
    const renderLoadingTab = () => (
        <div className="space-y-4">
            {loadingDocks.length === 0 ? (
                <Card className="border-slate-200">
                    <CardContent className="py-16 text-center text-slate-500">
                        <Truck className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-lg font-medium">No loading docks configured</p>
                        <p className="text-sm mt-1">Dock status will appear when published by backend</p>
                        <p className="text-xs text-slate-400 mt-4">
                            Listening on: <code className="bg-slate-100 px-1 rounded">{TOPIC_LOADING_DOCKS}</code>
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loadingDocks.map(dock => {
                        const statusConfig = DOCK_STATUS_CONFIG[dock.status] || DOCK_STATUS_CONFIG['AVAILABLE']
                        const loadProgress = dock.shipments_total > 0
                            ? Math.round((dock.shipments_loaded / dock.shipments_total) * 100)
                            : 0

                        return (
                            <Card key={dock.dock_id} className="border-slate-200 hover:border-slate-300 transition-colors">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-bold">{dock.dock_id}</CardTitle>
                                        <Badge variant="secondary" className={statusConfig.color}>
                                            {statusConfig.label}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-slate-500">Carrier</span>
                                            <p className="font-medium">{dock.carrier || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500">Vehicle</span>
                                            <p className="font-medium">{dock.vehicle || '-'}</p>
                                        </div>
                                    </div>

                                    {dock.status === 'LOADING' && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Loaded: {dock.shipments_loaded}/{dock.shipments_total}</span>
                                                <span className="font-medium">{loadProgress}%</span>
                                            </div>
                                            <Progress value={loadProgress} className="h-2" />
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        {dock.status === 'AVAILABLE' && (
                                            <Button size="sm" className="w-full h-8 text-xs" variant="outline">
                                                Assign Carrier
                                            </Button>
                                        )}
                                        {dock.status === 'WAITING' && (
                                            <Button size="sm" className="w-full h-8 text-xs bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121]">
                                                <Play className="h-3 w-3 mr-1" /> Start Loading
                                            </Button>
                                        )}
                                        {dock.status === 'LOADING' && (
                                            <Button size="sm" className="w-full h-8 text-xs bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121]">
                                                <Box className="h-3 w-3 mr-1" /> Load Next
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )

    return (
        <PageContainer title="Outbound Execution" subtitle="Picking, Staging & Loading Operations">
            <div className="space-y-4">
                {/* === TAB NAVIGATION === */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                    {EXECUTION_TABS.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${activeTab === tab.id
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* === TAB CONTENT === */}
                {activeTab === 'picking' && renderPickingTab()}
                {activeTab === 'staging' && renderStagingTab()}
                {activeTab === 'loading' && renderLoadingTab()}

                {/* === PICK EXECUTION SHEET === */}
                <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
                    <SheetContent className="w-[400px] sm:w-[500px]">
                        {selectedTask && (
                            <>
                                <SheetHeader className="mb-6">
                                    <SheetTitle className="font-bold">{selectedTask.task_id}</SheetTitle>
                                    <SheetDescription>
                                        {getPickStatusBadge(selectedTask.status)}
                                    </SheetDescription>
                                </SheetHeader>

                                <div className="space-y-6">
                                    {/* Task Details */}
                                    <Card className="border-slate-200">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-500 text-xs">Material</span>
                                                    <p className="font-medium">{selectedTask.material_code}</p>
                                                    {selectedTask.material_desc && (
                                                        <p className="text-xs text-slate-500">{selectedTask.material_desc}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 text-xs">Batch</span>
                                                    <p className="font-medium font-mono">{selectedTask.batch || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 text-xs">From Location</span>
                                                    <p className="font-medium flex items-center gap-1">
                                                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                        {selectedTask.from_location}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 text-xs">To Location</span>
                                                    <p className="font-medium flex items-center gap-1">
                                                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                                                        {selectedTask.to_location}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 text-xs">Requested Qty</span>
                                                    <p className="font-bold text-lg">{selectedTask.qty} {selectedTask.uom}</p>
                                                </div>
                                                {selectedTask.wave_id && (
                                                    <div>
                                                        <span className="text-slate-500 text-xs">Wave</span>
                                                        <p className="font-medium">{selectedTask.wave_id}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Pick Input */}
                                    {(selectedTask.status === 'PENDING' || selectedTask.status === 'ASSIGNED' || selectedTask.status === 'IN_PROGRESS') && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold">Picked Quantity</label>
                                                <Input
                                                    type="number"
                                                    value={pickedQty}
                                                    onChange={(e) => setPickedQty(e.target.value)}
                                                    placeholder={`Enter qty (expected: ${selectedTask.qty})`}
                                                    className="text-lg h-12"
                                                />
                                            </div>

                                            <div className="flex gap-3">
                                                <Button
                                                    className="flex-1 bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold h-11"
                                                    onClick={handleConfirmPick}
                                                    disabled={!pickedQty}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" /> Confirm Pick
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="border-red-200 text-red-600 hover:bg-red-50"
                                                    onClick={handleReportShort}
                                                >
                                                    <AlertTriangle className="h-4 w-4 mr-2" /> Short
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </div>
        </PageContainer>
    )
}
