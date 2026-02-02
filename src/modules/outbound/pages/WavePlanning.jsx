/**
 * WavePlanning.jsx - Wave Management Page
 * 
 * Enterprise wave planning for Trading context outbound operations.
 * Allows planners to group orders into waves for efficient picking.
 * 
 * Follows patterns from OutboundOrders.jsx and InboundOrders.jsx
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Badge } from '../../../components/ui/badge'
import { Progress } from '../../../components/ui/progress'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '../../../components/ui/dialog'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from '../../../components/ui/sheet'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import {
    Layers, Plus, Play, Truck, Calendar, MapPin, Package,
    CheckCircle, Clock, AlertCircle, Eye, Trash2, RefreshCw
} from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'

// --- MQTT TOPICS ---
const TOPIC_WAVE_LIST = "Henkelv2/Shanghai/Logistics/Outbound/State/Wave_List"
const TOPIC_CREATE_WAVE = "Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Wave"
const TOPIC_RELEASE_WAVE = "Henkelv2/Shanghai/Logistics/Outbound/Action/Release_Wave"
const TOPIC_DELETE_WAVE = "Henkelv2/Shanghai/Logistics/Outbound/Action/Delete_Wave"

// --- STATUS CONFIG ---
const WAVE_STATUS_CONFIG = {
    'PLANNED': { label: 'Planned', color: 'bg-slate-100 text-slate-700', icon: Clock },
    'RELEASED': { label: 'Released', color: 'bg-blue-100 text-blue-700', icon: Play },
    'IN_PROGRESS': { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: RefreshCw },
    'COMPLETED': { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle }
}

const PICK_METHODS = {
    'DISCRETE': { label: 'Discrete (1 order at a time)', description: 'Best for small operations' },
    'BATCH': { label: 'Batch (Multiple orders)', description: 'Good for similar items' },
    'ZONE': { label: 'Zone (By location)', description: 'Best for large warehouses' },
    'CLUSTER': { label: 'Cluster (Multiple totes)', description: 'Optimized for ecommerce' }
}

// --- TABS ---
const STATUS_TABS = [
    { id: 'all', label: 'All Waves', filter: null },
    { id: 'PLANNED', label: 'Open', filter: 'PLANNED' },
    { id: 'RELEASED', label: 'Released', filter: 'RELEASED' },
    { id: 'IN_PROGRESS', label: 'In Progress', filter: 'IN_PROGRESS' },
    { id: 'COMPLETED', label: 'Completed', filter: 'COMPLETED' }
]

// Initial form state
const INITIAL_WAVE_FORM = {
    ship_date: new Date().toISOString().split('T')[0],
    carrier: '',
    route: '',
    pick_method: 'BATCH'
}

// --- MOCK DATA (until backend ready) ---
const MOCK_WAVES = [
    {
        wave_id: 'WAVE-2026-001',
        status: 'PLANNED',
        ship_date: '2026-02-02',
        carrier: 'SF-EXPRESS',
        route: 'Shanghai North',
        delivery_count: 15,
        line_count: 45,
        picks_completed: 0,
        picks_total: 45,
        created_at: '2026-02-01T08:00:00Z',
        pick_method: 'BATCH'
    },
    {
        wave_id: 'WAVE-2026-002',
        status: 'RELEASED',
        ship_date: '2026-02-02',
        carrier: 'DHL',
        route: 'Shanghai South',
        delivery_count: 8,
        line_count: 24,
        picks_completed: 6,
        picks_total: 24,
        created_at: '2026-02-01T09:30:00Z',
        released_at: '2026-02-01T10:00:00Z',
        pick_method: 'ZONE'
    },
    {
        wave_id: 'WAVE-2026-003',
        status: 'IN_PROGRESS',
        ship_date: '2026-02-01',
        carrier: 'SF-EXPRESS',
        route: 'Jiangsu',
        delivery_count: 12,
        line_count: 36,
        picks_completed: 28,
        picks_total: 36,
        created_at: '2026-01-31T14:00:00Z',
        released_at: '2026-01-31T15:00:00Z',
        pick_method: 'BATCH'
    },
    {
        wave_id: 'WAVE-2026-004',
        status: 'COMPLETED',
        ship_date: '2026-01-31',
        carrier: 'YTO',
        route: 'Zhejiang',
        delivery_count: 20,
        line_count: 55,
        picks_completed: 55,
        picks_total: 55,
        created_at: '2026-01-30T08:00:00Z',
        released_at: '2026-01-30T09:00:00Z',
        pick_method: 'CLUSTER'
    }
]

export default function WavePlanning() {
    const { data, publish } = useGlobalUNS()

    // --- STATE ---
    const [activeTab, setActiveTab] = useState('all')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newWave, setNewWave] = useState(INITIAL_WAVE_FORM)
    const [selectedWave, setSelectedWave] = useState(null)

    // --- DATA ---
    const waves = useMemo(() => {
        const rawData = data.raw?.[TOPIC_WAVE_LIST]

        // Use mock data if no real data
        if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
            return MOCK_WAVES
        }

        const list = Array.isArray(rawData) ? rawData : rawData?.waves || []
        return list
    }, [data.raw])

    // --- FILTERING ---
    const filteredWaves = useMemo(() => {
        const tab = STATUS_TABS.find(t => t.id === activeTab)
        if (!tab?.filter) return waves
        return waves.filter(w => w.status === tab.filter)
    }, [waves, activeTab])

    // --- COUNTS ---
    const statusCounts = useMemo(() => {
        const counts = { all: waves.length }
        STATUS_TABS.forEach(tab => {
            if (tab.filter) {
                counts[tab.id] = waves.filter(w => w.status === tab.filter).length
            }
        })
        return counts
    }, [waves])

    // --- ACTIONS ---
    const handleCreateWave = () => {
        const waveId = `WAVE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
        const payload = {
            wave_id: waveId,
            ...newWave,
            status: 'PLANNED',
            delivery_count: 0,
            line_count: 0,
            picks_completed: 0,
            picks_total: 0,
            created_at: new Date().toISOString(),
            operator: 'Current User',
            timestamp: Date.now()
        }
        publish(TOPIC_CREATE_WAVE, payload)
        setIsCreateOpen(false)
        setNewWave(INITIAL_WAVE_FORM)
    }

    const handleReleaseWave = (wave) => {
        const payload = {
            wave_id: wave.wave_id,
            action: 'RELEASE',
            operator: 'Current User',
            timestamp: Date.now()
        }
        publish(TOPIC_RELEASE_WAVE, payload)
    }

    const handleDeleteWave = (wave) => {
        if (!confirm(`Delete wave ${wave.wave_id}? This action cannot be undone.`)) return
        const payload = {
            wave_id: wave.wave_id,
            operator: 'Current User',
            timestamp: Date.now()
        }
        publish(TOPIC_DELETE_WAVE, payload)
    }

    // --- HELPERS ---
    const getProgressPercentage = (wave) => {
        if (!wave.picks_total) return 0
        return Math.round((wave.picks_completed / wave.picks_total) * 100)
    }

    const getStatusBadge = (status) => {
        const config = WAVE_STATUS_CONFIG[status] || WAVE_STATUS_CONFIG['PLANNED']
        const Icon = config.icon
        return (
            <Badge variant="secondary" className={`${config.color} font-medium text-[10px] px-2`}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
            </Badge>
        )
    }

    return (
        <PageContainer title="Wave Planning" subtitle="Group orders for efficient picking (Trading Context)">
            <div className="space-y-4">
                {/* === SECTION 1: STATUS TABS === */}
                <div className="flex justify-between items-center">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === tab.id
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {tab.label}
                                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-200 rounded text-[10px]">
                                    {statusCounts[tab.id] || 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Create Wave Button */}
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#b2ed1d] text-slate-900 font-bold hover:bg-[#8cd121] shadow-sm h-9">
                                <Plus className="h-4 w-4 mr-2" /> Create Wave
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create New Wave</DialogTitle>
                                <DialogDescription>
                                    Group outbound orders for efficient batch picking.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Ship Date</Label>
                                    <Input
                                        type="date"
                                        value={newWave.ship_date}
                                        onChange={(e) => setNewWave({ ...newWave, ship_date: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Carrier</Label>
                                    <Input
                                        placeholder="e.g. SF-EXPRESS, DHL"
                                        value={newWave.carrier}
                                        onChange={(e) => setNewWave({ ...newWave, carrier: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Route</Label>
                                    <Input
                                        placeholder="e.g. Shanghai North"
                                        value={newWave.route}
                                        onChange={(e) => setNewWave({ ...newWave, route: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Pick Method</Label>
                                    <Select
                                        value={newWave.pick_method}
                                        onValueChange={(v) => setNewWave({ ...newWave, pick_method: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(PICK_METHODS).map(([key, val]) => (
                                                <SelectItem key={key} value={key}>
                                                    <div>
                                                        <div className="font-medium">{val.label}</div>
                                                        <div className="text-xs text-slate-500">{val.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateWave}
                                    disabled={!newWave.ship_date || !newWave.carrier}
                                    className="bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121]"
                                >
                                    Create Wave
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* === SECTION 2: WAVE CARDS GRID === */}
                {filteredWaves.length === 0 ? (
                    <Card className="border-slate-200">
                        <CardContent className="py-16 text-center text-slate-500">
                            <Layers className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                            <p className="text-lg font-medium">No waves found</p>
                            <p className="text-sm mt-1">
                                {activeTab === 'all'
                                    ? 'Create a new wave to get started'
                                    : `No waves with status "${STATUS_TABS.find(t => t.id === activeTab)?.label}"`}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredWaves.map(wave => (
                            <Card
                                key={wave.wave_id}
                                className="border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                                onClick={() => setSelectedWave(wave)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-sm font-bold text-blue-600">
                                            {wave.wave_id}
                                        </CardTitle>
                                        {getStatusBadge(wave.status)}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Wave Details */}
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>Ship: {wave.ship_date}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Truck className="h-3.5 w-3.5" />
                                            <span>{wave.carrier || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span>{wave.route || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Package className="h-3.5 w-3.5" />
                                            <span>{wave.delivery_count} orders</span>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Picks: {wave.picks_completed}/{wave.picks_total}</span>
                                            <span className="font-medium">{getProgressPercentage(wave)}%</span>
                                        </div>
                                        <Progress value={getProgressPercentage(wave)} className="h-2" />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="flex-1 h-8 text-xs"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedWave(wave)
                                            }}
                                        >
                                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                                        </Button>
                                        {wave.status === 'PLANNED' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    className="flex-1 h-8 text-xs bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121]"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleReleaseWave(wave)
                                                    }}
                                                >
                                                    <Play className="h-3.5 w-3.5 mr-1" /> Release
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeleteWave(wave)
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* === SECTION 3: WAVE DETAIL SHEET === */}
                <Sheet open={!!selectedWave} onOpenChange={(open) => !open && setSelectedWave(null)}>
                    <SheetContent className="w-[500px] sm:w-[640px] overflow-y-auto">
                        {selectedWave && (
                            <>
                                <SheetHeader className="mb-6">
                                    <div className="flex items-center justify-between">
                                        <SheetTitle className="text-lg font-bold">{selectedWave.wave_id}</SheetTitle>
                                        {getStatusBadge(selectedWave.status)}
                                    </div>
                                    <SheetDescription>
                                        Created: {new Date(selectedWave.created_at).toLocaleString()}
                                        {selectedWave.released_at && (
                                            <> • Released: {new Date(selectedWave.released_at).toLocaleString()}</>
                                        )}
                                    </SheetDescription>
                                </SheetHeader>

                                <div className="space-y-6">
                                    {/* Wave Info */}
                                    <Card className="border-slate-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold">Wave Details</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-500">Ship Date</span>
                                                    <p className="font-medium">{selectedWave.ship_date}</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Carrier</span>
                                                    <p className="font-medium">{selectedWave.carrier || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Route</span>
                                                    <p className="font-medium">{selectedWave.route || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Pick Method</span>
                                                    <p className="font-medium">{PICK_METHODS[selectedWave.pick_method]?.label || selectedWave.pick_method}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Progress Card */}
                                    <Card className="border-slate-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold">Progress</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div className="p-3 bg-slate-50 rounded-lg">
                                                    <p className="text-2xl font-bold text-blue-600">{selectedWave.delivery_count}</p>
                                                    <p className="text-xs text-slate-500">Orders</p>
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-lg">
                                                    <p className="text-2xl font-bold text-indigo-600">{selectedWave.line_count}</p>
                                                    <p className="text-xs text-slate-500">Lines</p>
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-lg">
                                                    <p className="text-2xl font-bold text-green-600">{getProgressPercentage(selectedWave)}%</p>
                                                    <p className="text-xs text-slate-500">Picked</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-slate-600">
                                                    <span>Pick Progress</span>
                                                    <span>{selectedWave.picks_completed} / {selectedWave.picks_total} picks</span>
                                                </div>
                                                <Progress value={getProgressPercentage(selectedWave)} className="h-3" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Orders in Wave (placeholder) */}
                                    <Card className="border-slate-200">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold">Orders in Wave</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {selectedWave.delivery_count > 0 ? (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="text-xs">Order #</TableHead>
                                                            <TableHead className="text-xs">Customer</TableHead>
                                                            <TableHead className="text-xs text-right">Lines</TableHead>
                                                            <TableHead className="text-xs text-right">Picked</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-center text-sm text-slate-500 py-8">
                                                                <AlertCircle className="h-5 w-5 mx-auto mb-2 text-slate-300" />
                                                                Order details will load from backend
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            ) : (
                                                <div className="text-center py-8 text-slate-500 text-sm">
                                                    <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                                    No orders assigned to this wave yet.
                                                    <br />
                                                    <span className="text-xs">Use "Add to Wave" on the Orders page.</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Actions */}
                                    {selectedWave.status === 'PLANNED' && (
                                        <div className="flex gap-3">
                                            <Button
                                                className="flex-1 bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold"
                                                onClick={() => handleReleaseWave(selectedWave)}
                                            >
                                                <Play className="h-4 w-4 mr-2" /> Release Wave
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="border-red-200 text-red-600 hover:bg-red-50"
                                                onClick={() => handleDeleteWave(selectedWave)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                            </Button>
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
