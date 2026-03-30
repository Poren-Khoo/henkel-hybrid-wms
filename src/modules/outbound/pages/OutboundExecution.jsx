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
import { useSearchParams, useNavigate } from 'react-router-dom'
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
    SheetTitle
} from '../../../components/ui/sheet'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import {
    ClipboardList, Package, Truck, MapPin, Play, CheckCircle, Clock,
    AlertTriangle, RefreshCw, ArrowRight, Box, Search,
    CheckCircle2, FileCheck, ClipboardCheck
} from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { useGlobalUNS } from '../../../context/UNSContext'

// --- MQTT TOPICS ---
const TOPIC_PICK_QUEUE = "Henkelv2/Shanghai/Logistics/Outbound/State/Picking_Queue"
const TOPIC_STAGING_AREA = "Henkelv2/Shanghai/Logistics/Outbound/State/Staging_Area"
const TOPIC_LOADING_DOCKS = "Henkelv2/Shanghai/Logistics/Outbound/State/Loading_Docks"
const TOPIC_CONFIRM_PICK = "Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Pick"
const TOPIC_CONFIRM_STAGE = "Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Stage"
const TOPIC_CONFIRM_LOAD = "Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Load"
const TOPIC_REPORT_SHORT = "Henkelv2/Shanghai/Logistics/Outbound/Action/Report_Short_Pick"
const TOPIC_SHIPMENT_LIST = "Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List"

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
    { id: 'loading', label: 'Loading', icon: Truck, topic: TOPIC_LOADING_DOCKS },
    { id: 'dispatch', label: 'Dispatch', icon: CheckCircle2, topic: TOPIC_SHIPMENT_LIST }
]

const PICK_STATUS_PILLS = ['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']
const PICK_STATUS_PILL_LABELS = { ALL: 'All', PENDING: 'Pending', ASSIGNED: 'Assigned', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' }

export default function OutboundExecution() {
    const navigate = useNavigate()
    const { data, publish } = useGlobalUNS()
    const [searchParams] = useSearchParams()

    // --- STATE ---
    const initialTab = searchParams.get('tab')
    const [activeTab, setActiveTab] = useState(
        EXECUTION_TABS.find(t => t.id === initialTab) ? initialTab : 'picking'
    )
    const [selectedTask, setSelectedTask] = useState(null)
    const [pickedQty, setPickedQty] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [pickStatusFilter, setPickStatusFilter] = useState('ALL')
    const [pickSuccess, setPickSuccess] = useState(null)
    const [dispatchSuccess, setDispatchSuccess] = useState(null)

    // --- DISPATCH STATE ---
    const [dispatchShipment, setDispatchShipment] = useState(null)
    const [driverName, setDriverName] = useState('')
    const [plateNo, setPlateNo] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

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

    const shipmentList = useMemo(() => {
        const rawData = data.raw?.[TOPIC_SHIPMENT_LIST]
        let packet = rawData
        if (rawData?.topics?.[0]) {
            packet = rawData.topics[0].value ?? rawData.topics[0]
        }
        let list = Array.isArray(packet) ? packet : (packet?.items ?? packet?.shipments ?? [])
        if (!Array.isArray(list)) list = []
        return list
    }, [data.raw])

    const readyToShip = useMemo(() => {
        return shipmentList.filter(s => ['PACKED', 'READY_TO_SHIP', 'READY TO SHIP'].includes(s?.status))
    }, [shipmentList])

    const dispatchHistory = useMemo(() => {
        return shipmentList.filter(s => s?.status === 'SHIPPED')
    }, [shipmentList])

    const assignedDispatchDockId = useMemo(() => {
        const first = loadingDocks.find(d => d.status === 'AVAILABLE')
        return first?.dock_id ?? 'DOCK-01'
    }, [loadingDocks])

    // --- FILTERING ---
    const filteredPickTasks = useMemo(() => {
        let filtered = pickTasks
        if (pickStatusFilter !== 'ALL') {
            filtered = filtered.filter(t => t.status === pickStatusFilter)
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(t =>
                t.task_id?.toLowerCase().includes(q) ||
                t.material_code?.toLowerCase().includes(q) ||
                t.from_location?.toLowerCase().includes(q)
            )
        }
        return filtered
    }, [pickTasks, searchQuery, pickStatusFilter])

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
        setPickSuccess({
            task_id: selectedTask.task_id,
            material: selectedTask.material_code,
            qty: pickedQty,
            dn_no: selectedTask.dn_no
        })
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

    const handleDispatch = () => {
        if (!dispatchShipment) return
        setIsSubmitting(true)

        const payload = {
            dn_id: dispatchShipment.dn_id,
            dock_id: assignedDispatchDockId,
            carrier_info: {
                driver: driverName || "Unknown",
                plate: plateNo || "N/A",
                time: new Date().toISOString()
            }
        }

        publish(TOPIC_CONFIRM_LOAD, payload)

        setTimeout(() => {
            setIsSubmitting(false)
            setDispatchSuccess({
                dn_id: dispatchShipment.dn_id,
                customer: dispatchShipment.customer,
                driver: driverName,
                plate: plateNo
            })
            setDispatchShipment(null)
            setDriverName('')
            setPlateNo('')
        }, 800)
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

    // --- PICK STATUS COUNTS ---
    const pickStatusCounts = useMemo(() => {
        const counts = { ALL: pickTasks.length, PENDING: 0, ASSIGNED: 0, IN_PROGRESS: 0, COMPLETED: 0 }
        pickTasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++ })
        return counts
    }, [pickTasks])

    // --- RENDER PICKING TAB ---
    const renderPickingTab = () => (
        <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-3 flex justify-between items-start">
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{taskCounts.total}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Total Tasks</div>
                        </div>
                        <div className="h-7 w-7 rounded-md flex items-center justify-center bg-slate-50 text-slate-600"><ClipboardList className="h-3.5 w-3.5" /></div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-3 flex justify-between items-start">
                        <div>
                            <div className="text-2xl font-bold text-amber-600">{taskCounts.pending}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Pending</div>
                        </div>
                        <div className="h-7 w-7 rounded-md flex items-center justify-center bg-amber-50 text-amber-600"><Clock className="h-3.5 w-3.5" /></div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-3 flex justify-between items-start">
                        <div>
                            <div className="text-2xl font-bold text-blue-600">{taskCounts.inProgress}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">In Progress</div>
                        </div>
                        <div className="h-7 w-7 rounded-md flex items-center justify-center bg-blue-50 text-blue-600"><RefreshCw className="h-3.5 w-3.5" /></div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-3 flex justify-between items-start">
                        <div>
                            <div className="text-2xl font-bold text-green-600">{taskCounts.completed}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Completed</div>
                        </div>
                        <div className="h-7 w-7 rounded-md flex items-center justify-center bg-green-50 text-green-600"><CheckCircle className="h-3.5 w-3.5" /></div>
                    </CardContent>
                </Card>
            </div>

            {/* Status Pills + Search */}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {PICK_STATUS_PILLS.map(s => (
                        <button
                            key={s}
                            onClick={() => setPickStatusFilter(s)}
                            className={`px-3 py-1.5 sm:py-1 text-xs font-medium rounded-full transition-colors ${
                                pickStatusFilter === s
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {PICK_STATUS_PILL_LABELS[s]}
                            <span className="ml-1 opacity-70">({pickStatusCounts[s] || 0})</span>
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-72 shrink-0">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                        placeholder="Search task, material, location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-7 text-xs bg-white border-slate-200"
                    />
                </div>
            </div>

            {/* Task Table */}
            <Card className="border-slate-200">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="text-xs font-bold">Task ID</TableHead>
                            <TableHead className="text-xs font-bold">DN No.</TableHead>
                            <TableHead className="text-xs font-bold">Customer</TableHead>
                            <TableHead className="text-xs font-bold">Status</TableHead>
                            <TableHead className="text-xs font-bold">Material</TableHead>
                            <TableHead className="text-xs font-bold">Batch</TableHead>
                            <TableHead className="text-xs font-bold">From Location</TableHead>
                            <TableHead className="text-xs font-bold">To Location</TableHead>
                            <TableHead className="text-xs font-bold text-right">Qty</TableHead>
                            <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPickTasks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="h-48 text-center text-slate-500">
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
                            filteredPickTasks.map(task => {
                                const pickCustomer = shipmentList.find(s => s.dn_id === task.dn_no)?.customer
                                return (
                                <TableRow key={task.task_id} className="hover:bg-blue-50/50">
                                    <TableCell className="font-mono text-xs font-bold text-blue-600">{task.task_id}</TableCell>
                                    <TableCell className="text-xs font-mono">{task.dn_no ?? '-'}</TableCell>
                                    <TableCell className="text-xs">{pickCustomer ?? '-'}</TableCell>
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
                                )
                            })
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
                                        {area.items.slice(0, 5).map((item, idx) => {
                                            const stageCustomer = shipmentList.find(s => s.dn_id === item.dn_no)?.customer
                                            return (
                                            <div key={idx} className="flex justify-between items-center gap-2 text-xs p-2 bg-slate-50 rounded">
                                                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                                    <div className="flex flex-col min-w-0 gap-0.5">
                                                        <span className="font-mono text-blue-600">{item.dn_no}</span>
                                                        {stageCustomer && (
                                                            <span className="text-[10px] text-slate-500 leading-tight">
                                                                {stageCustomer}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-xs shrink-0 bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121]"
                                                        onClick={() => handleConfirmStage(area.area_id, item.dn_no)}
                                                    >
                                                        Confirm Stage
                                                    </Button>
                                                </div>
                                                <span className="text-slate-500 shrink-0">{item.line_count} lines</span>
                                            </div>
                                            )
                                        })}
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
                                            <Button
                                                size="sm"
                                                className="w-full h-8 text-xs bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121]"
                                                onClick={() => handleConfirmLoad(dock.dock_id, dock.current_shipment_id)}
                                            >
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

    // --- RENDER DISPATCH TAB ---
    const renderDispatchTab = () => (
        <div className="space-y-6">
            <UNSConnectionInfo topic={TOPIC_SHIPMENT_LIST} />

            {/* KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex justify-between items-center">
                        <div>
                            <div className="text-3xl font-bold text-slate-900">{readyToShip.length}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Ready for Pickup</div>
                        </div>
                        <Truck className="h-8 w-8 text-slate-400 opacity-20" />
                    </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-4 flex justify-between items-center">
                        <div>
                            <div className="text-3xl font-bold text-slate-900">{dispatchHistory.length}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Dispatched Today</div>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-slate-400 opacity-20" />
                    </CardContent>
                </Card>
            </div>

            {/* READY TABLE */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-slate-500" />
                    <h3 className="font-semibold text-slate-900">Loading Bay (Ready for Dispatch)</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">DN Number</TableHead>
                            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Customer</TableHead>
                            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Tracking No</TableHead>
                            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Packed At</TableHead>
                            <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {readyToShip.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">Bay is empty. Waiting for Packing.</TableCell></TableRow>
                        ) : (
                            readyToShip.map(s => (
                                <TableRow key={s.dn_id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                                    <TableCell className="font-mono text-xs font-bold text-slate-700">{s.dn_id}</TableCell>
                                    <TableCell className="font-medium text-slate-900">{s.customer}</TableCell>
                                    <TableCell><Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm">{s.tracking_no || 'N/A'}</Badge></TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        {s.packed_at ? new Date(s.packed_at).toLocaleTimeString() : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            className="bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm"
                                            onClick={() => setDispatchShipment(s)}
                                        >
                                            Dispatch Truck
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* HISTORY TABLE */}
            <Card className="bg-white border-slate-200 shadow-sm opacity-80">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-slate-500" />
                    <h3 className="font-semibold text-slate-800">Dispatch History</h3>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">DN Number</TableHead>
                            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Customer</TableHead>
                            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Driver / Plate</TableHead>
                            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Dispatched At</TableHead>
                            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {dispatchHistory.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No dispatched shipments yet.</TableCell></TableRow>
                        ) : (
                            dispatchHistory.map(s => (
                                <TableRow key={s.dn_id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                                    <TableCell className="font-mono text-xs font-bold text-slate-700">{s.dn_id}</TableCell>
                                    <TableCell className="font-medium text-slate-900">{s.customer}</TableCell>
                                    <TableCell className="text-xs text-slate-600">
                                        {s.carrier_info?.driver} ({s.carrier_info?.plate})
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        {s.shipped_at ? new Date(s.shipped_at).toLocaleTimeString() : '-'}
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm">SHIPPED</Badge></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* DISPATCH SUCCESS */}
            <Dialog open={!!dispatchSuccess} onOpenChange={(open) => !open && setDispatchSuccess(null)}>
                <DialogContent>
                    <div className="flex flex-col items-center py-6">
                        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">Dispatched Successfully</h2>
                        <p className="text-slate-500 text-sm mb-6">
                            Shipment <span className="font-mono font-bold">{dispatchSuccess?.dn_id}</span> is on its way.
                        </p>
                        <div className="bg-slate-50 rounded-md p-4 text-left space-y-2 mb-6 border border-slate-100 text-xs w-full">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Customer</span>
                                <span className="font-bold text-slate-900">{dispatchSuccess?.customer}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Driver</span>
                                <span className="text-slate-700">{dispatchSuccess?.driver}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Plate</span>
                                <span className="font-mono text-slate-700">{dispatchSuccess?.plate}</span>
                            </div>
                        </div>
                        <div className="space-y-2 w-full">
                            <Button
                                variant="outline"
                                className="w-full h-9 text-xs gap-2 border-slate-200"
                                onClick={() => { setDispatchSuccess(null); navigate('/operations/outbound/planning') }}
                            >
                                View in Planning <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-9 text-xs"
                                onClick={() => setDispatchSuccess(null)}
                            >
                                Continue Dispatching
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* DISPATCH DIALOG */}
            <Dialog open={!!dispatchShipment} onOpenChange={(open) => !open && setDispatchShipment(null)}>
                <DialogContent>
                    <DialogHeader className="border-b border-slate-100 bg-slate-50/50">
                        <DialogTitle>Confirm Dispatch</DialogTitle>
                        <DialogDescription>
                            Enter carrier details to release shipment {dispatchShipment?.dn_id}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Driver Name</Label>
                            <Input placeholder="e.g. John Doe" value={driverName} onChange={e => setDriverName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Vehicle Plate No.</Label>
                            <Input placeholder="e.g. A-12345" value={plateNo} onChange={e => setPlateNo(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Assigned dock</Label>
                            <Input readOnly className="bg-slate-50 text-slate-700" value={assignedDispatchDockId} />
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded border border-amber-200 flex gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            <span>Warning: This action is irreversible. Inventory will be permanently deducted.</span>
                        </div>
                    </div>
                    <DialogFooter className="border-t border-slate-100 bg-slate-50/30">
                        <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-4" onClick={() => setDispatchShipment(null)}>Cancel</Button>
                        <Button
                            className="bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2"
                            onClick={handleDispatch}
                            disabled={isSubmitting || !driverName || !plateNo}
                        >
                            {isSubmitting ? "Processing..." : "Confirm & Sign"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )

    return (
        <PageContainer>
            <div className="space-y-4">
                {/* === TAB NAVIGATION === */}
                <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                        {EXECUTION_TABS.map(tab => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeTab === tab.id
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className="sm:hidden text-xs">{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* === TAB CONTENT === */}
                {activeTab === 'picking' && renderPickingTab()}
                {activeTab === 'staging' && renderStagingTab()}
                {activeTab === 'loading' && renderLoadingTab()}
                {activeTab === 'dispatch' && renderDispatchTab()}

                {/* === PICK EXECUTION SHEET === */}
                <Sheet open={!!(selectedTask || pickSuccess)} onOpenChange={(open) => {
                    if (!open) { setSelectedTask(null); setPickSuccess(null) }
                }}>
                    <SheetContent className="w-[400px] sm:w-[500px]">
                        {pickSuccess ? (
                            <div className="flex flex-col items-center justify-center h-full px-4">
                                <div className="bg-white p-8 rounded-xl text-center max-w-sm w-full">
                                    <div className="mx-auto h-16 w-16 bg-[#b2ed1d]/20 rounded-full flex items-center justify-center mb-6">
                                        <CheckCircle className="h-8 w-8 text-[#65a30d]" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-1">Pick Confirmed</h2>
                                    <p className="text-slate-500 text-sm mb-6">Task <span className="font-mono font-bold">{pickSuccess.task_id}</span> completed.</p>
                                    <div className="bg-slate-50 rounded-md p-4 text-left space-y-2 mb-6 border border-slate-100 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Material</span>
                                            <span className="font-bold text-slate-900">{pickSuccess.material}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Picked Qty</span>
                                            <span className="font-mono font-bold text-slate-900">{pickSuccess.qty}</span>
                                        </div>
                                        {pickSuccess.dn_no && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">DN</span>
                                                <span className="font-mono text-slate-700">{pickSuccess.dn_no}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Button
                                            variant="outline"
                                            className="w-full h-9 text-xs gap-2 border-slate-200"
                                            onClick={() => navigate('/operations/outbound/planning')}
                                        >
                                            View Order in Planning <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            className="w-full bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-9 text-xs"
                                            onClick={() => { setPickSuccess(null); setSelectedTask(null) }}
                                        >
                                            Pick Next Task
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : selectedTask ? (
                            <>
                                <SheetHeader className="mb-6">
                                    <SheetTitle className="font-bold">{selectedTask.task_id}</SheetTitle>
                                    <div className="mt-1">
                                        {getPickStatusBadge(selectedTask.status)}
                                    </div>
                                </SheetHeader>

                                <div className="space-y-6">
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
                        ) : null}
                    </SheetContent>
                </Sheet>
            </div>
        </PageContainer>
    )
}
