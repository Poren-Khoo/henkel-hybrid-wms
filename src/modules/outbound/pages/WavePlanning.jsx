/**
 * WavePlanning.jsx - Wave Management Page
 * 
 * Enterprise wave planning for Trading context outbound operations.
 * Allows planners to group orders into waves for efficient picking.
 * 
 * DDD Pattern Applied:
 * - Uses WaveService for business logic, command building, status helpers
 * - Uses OutboundOrderValidationError for error handling
 * - UNS envelope unwrapping for MQTT data
 * - No inline validation or payload building in component
 * 
 * @see src/domain/outbound/WaveService.js
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
    AlertCircle, Eye, Trash2
} from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
// Domain Layer (DDD Pattern)
import { WaveService } from '../../../domain/outbound/WaveService'
import { OutboundOrderValidationError } from '../../../domain/outbound/OutboundOrderValidator'

// --- MQTT TOPICS ---
const TOPIC_WAVE_LIST = "Henkelv2/Shanghai/Logistics/Outbound/State/Wave_List"
const TOPIC_CREATE_WAVE = "Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Wave"
const TOPIC_RELEASE_WAVE = "Henkelv2/Shanghai/Logistics/Outbound/Action/Release_Wave"
const TOPIC_DELETE_WAVE = "Henkelv2/Shanghai/Logistics/Outbound/Action/Delete_Wave"

// --- STATUS CONFIG & PICK METHODS ---
// Now using WaveService.getStatusBadgeConfig() and WaveService.PICK_METHODS (DDD Pattern)

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

    // --- DATA (DDD Pattern: Use service for normalization) ---
    const waves = useMemo(() => {
        const rawData = data.raw?.[TOPIC_WAVE_LIST]

        // Use mock data if no real data
        if (!rawData) {
            return MOCK_WAVES
        }

        // Handle UNS envelope unwrapping (mqtt-uns-patterns)
        let packet = rawData
        if (rawData?.topics && Array.isArray(rawData.topics) && rawData.topics.length > 0) {
            packet = rawData.topics[0].value || rawData.topics[0]
        }

        // Handle different data structures
        const list = Array.isArray(packet) 
            ? packet 
            : packet?.items || packet?.waves || []

        // Return mock if empty
        if (list.length === 0) {
            return MOCK_WAVES
        }

        // Normalize using WaveService (DDD Pattern)
        return list.map(wave => WaveService.normalizeWave(wave)).filter(Boolean)
    }, [data.raw])

    // --- FILTERING (DDD Pattern: Use service for filtering) ---
    const filteredWaves = useMemo(() => {
        const tab = STATUS_TABS.find(t => t.id === activeTab)
        return WaveService.filterByStatus(waves, tab?.filter || 'all')
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

    // --- ACTIONS (DDD Pattern: Use service for command building + error handling) ---
    const handleCreateWave = () => {
        try {
            // Service handles validation + command building (DDD Pattern)
            const payload = WaveService.buildCreateWaveCommand({
                shipDate: newWave.ship_date,
                carrier: newWave.carrier,
                route: newWave.route,
                pickMethod: newWave.pick_method,
                deliveryIds: []
            })
            publish(TOPIC_CREATE_WAVE, payload)
            setIsCreateOpen(false)
            setNewWave(INITIAL_WAVE_FORM)
        } catch (error) {
            if (error instanceof OutboundOrderValidationError) {
                alert(error.message)
                return
            }
            throw error
        }
    }

    const handleReleaseWave = (wave) => {
        try {
            // Service handles validation + command building (DDD Pattern)
            const payload = WaveService.buildReleaseWaveCommand(wave.wave_id, wave.status)
            publish(TOPIC_RELEASE_WAVE, payload)
        } catch (error) {
            if (error instanceof OutboundOrderValidationError) {
                alert(error.message)
                return
            }
            throw error
        }
    }

    const handleDeleteWave = (wave) => {
        if (!confirm(`Delete wave ${wave.wave_id}? This action cannot be undone.`)) return
        try {
            // Service handles validation + command building (DDD Pattern)
            const payload = WaveService.buildCancelWaveCommand(wave.wave_id, 'Deleted by user')
            publish(TOPIC_DELETE_WAVE, payload)
        } catch (error) {
            if (error instanceof OutboundOrderValidationError) {
                alert(error.message)
                return
            }
            throw error
        }
    }

    // --- HELPERS (DDD Pattern: Use service for business logic) ---
    const getStatusBadge = (status) => {
        const config = WaveService.getStatusBadgeConfig(status)
        return (
            <Badge variant="secondary" className={`${config.className} font-medium text-[10px] px-2`}>
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
                                            {Object.entries(WaveService.PICK_METHODS).map(([key, val]) => (
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
                                            <span className="font-medium">{WaveService.calculateProgress(wave)}%</span>
                                        </div>
                                        <Progress value={WaveService.calculateProgress(wave)} className="h-2" />
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
                                        {WaveService.isPlanned(wave.status) && (
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
                                                    <p className="font-medium">{WaveService.PICK_METHODS[selectedWave.pick_method]?.label || selectedWave.pick_method}</p>
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
                                                    <p className="text-2xl font-bold text-green-600">{WaveService.calculateProgress(selectedWave)}%</p>
                                                    <p className="text-xs text-slate-500">Picked</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs text-slate-600">
                                                    <span>Pick Progress</span>
                                                    <span>{selectedWave.picks_completed} / {selectedWave.picks_total} picks</span>
                                                </div>
                                                <Progress value={WaveService.calculateProgress(selectedWave)} className="h-3" />
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

                                    {/* Actions (DDD Pattern: Use service for status checks) */}
                                    {WaveService.isPlanned(selectedWave.status) && (
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
