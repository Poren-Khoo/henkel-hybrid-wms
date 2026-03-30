import React, { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Progress } from '../../../components/ui/progress'
import { Checkbox } from '../../../components/ui/checkbox'
import { Package, Box, CheckCircle2, ClipboardList, MapPin, X } from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { useGlobalUNS } from '../../../context/UNSContext'

// ─── MQTT Topics ──────────────────────────────────────────────────────────────
const TOPIC_SHIPMENT_LIST  = 'Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List'
const TOPIC_CONFIRM_STAGE  = 'Henkelv2/Shanghai/Logistics/Outbound/Action/Confirm_Stage'

// ─── Initial Stations ─────────────────────────────────────────────────────────
const INITIAL_STATIONS = [
  { id: 'PACK-01', status: 'Available' },
  { id: 'PACK-02', status: 'Available' },
  { id: 'PACK-03', status: 'Maintenance' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateTaskId(seq) {
  const now = new Date()
  const yy  = now.getFullYear()
  const mm  = String(now.getMonth() + 1).padStart(2, '0')
  const dd  = String(now.getDate()).padStart(2, '0')
  return `PACK-${yy}${mm}${dd}-${String(seq).padStart(4, '0')}`
}

const STATION_STYLES = {
  Available:   'bg-green-50  text-green-700  border-green-200',
  'In Use':    'bg-amber-50  text-amber-700  border-amber-200',
  Maintenance: 'bg-red-50    text-red-700    border-red-200',
}

const TASK_STATUS_STYLES = {
  Pending:     'bg-slate-100  text-slate-600',
  'In Progress': 'bg-amber-100 text-amber-700',
  Completed:   'bg-green-100  text-green-700',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DispatchPacking() {
  const { data, publish } = useGlobalUNS()

  // Local UI state — not persisted to MQTT
  const [packingTasks, setPackingTasks] = useState([])   // { id, dnId, station, isCompleted }
  const [stations,     setStations]     = useState(INITIAL_STATIONS)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [taskCounter,  setTaskCounter]  = useState(1)
  const [packedItems,  setPackedItems]  = useState({})   // { taskId: number[] }

  // ── Unwrap UNS envelope ────────────────────────────────────────────────────
  const shipmentList = useMemo(() => {
    const rawData = data.raw?.[TOPIC_SHIPMENT_LIST]
    let packet = rawData
    if (rawData?.topics?.[0]) packet = rawData.topics[0].value ?? rawData.topics[0]
    const list = Array.isArray(packet) ? packet : (packet?.items ?? packet?.shipments ?? [])
    return Array.isArray(list) ? list : []
  }, [data.raw])

  // ── Orders ready to pack: PICKED and not yet assigned ─────────────────────
  const assignedDnIds = useMemo(() => new Set(packingTasks.map(t => t.dnId)), [packingTasks])
  const ordersReadyToPack = useMemo(
    () => {
      console.log('SHIPMENT_LIST in packing:', shipmentList)
      return shipmentList.filter(s => s.status === 'PICKED' && !assignedDnIds.has(s.dn_id))
    },
    [shipmentList, assignedDnIds],
  )

  // ── Derived helpers ────────────────────────────────────────────────────────
  const getPackedCount  = (taskId) => packedItems[taskId]?.length ?? 0
  const getTotalLines   = (taskId) => {
    const task = packingTasks.find(t => t.id === taskId)
    if (!task) return 0
    const ship = shipmentList.find(s => s.dn_id === task.dnId)
    return (ship?.items ?? []).length
  }
  const getTaskStatus = (task) => {
    if (task.isCompleted) return 'Completed'
    const packed = getPackedCount(task.id)
    return packed === 0 ? 'Pending' : 'In Progress'
  }

  const selectedTask     = packingTasks.find(t => t.id === selectedTaskId) ?? null
  const selectedShipment = selectedTask ? shipmentList.find(s => s.dn_id === selectedTask.dnId) : null
  const taskItems        = selectedShipment?.items ?? []
  const packedSet        = new Set(packedItems[selectedTaskId] ?? [])
  const allPacked        = taskItems.length > 0 && packedSet.size === taskItems.length

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleStartPacking = (shipment) => {
    const station = stations.find(s => s.status === 'Available')
    if (!station) return

    const taskId = generateTaskId(taskCounter)
    setPackingTasks(prev => [...prev, { id: taskId, dnId: shipment.dn_id, station: station.id, isCompleted: false }])
    setStations(prev => prev.map(s => s.id === station.id ? { ...s, status: 'In Use' } : s))
    setPackedItems(prev => ({ ...prev, [taskId]: [] }))
    setTaskCounter(prev => prev + 1)
    setSelectedTaskId(taskId)
  }

  const handleToggleItem = (taskId, itemIndex) => {
    setPackedItems(prev => {
      const current = prev[taskId] ?? []
      const already = current.includes(itemIndex)
      return {
        ...prev,
        [taskId]: already ? current.filter(i => i !== itemIndex) : [...current, itemIndex],
      }
    })
  }

  const handleCompletePacking = () => {
    if (!selectedTask || !selectedShipment) return
    publish(TOPIC_CONFIRM_STAGE, {
      area_id:   'STAGE-A',
      dn_no:     selectedShipment.dn_id,
      operator:  'Current User',
      timestamp: Date.now(),
    })
    setPackingTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, isCompleted: true } : t))
    setStations(prev => prev.map(s => s.id === selectedTask.station ? { ...s, status: 'Available' } : s))
    setSelectedTaskId(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      <div className="mb-3 pb-3 border-b border-slate-200">
        <UNSConnectionInfo topic={TOPIC_SHIPMENT_LIST} />
      </div>

      {/* Two-column layout */}
      <div className="flex border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden"
           style={{ minHeight: 'calc(100vh - 160px)' }}>

        {/* ══════════════════ LEFT PANEL ══════════════════ */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col overflow-y-auto">

          {/* ── Section 1: Orders Ready to Pack ── */}
          <section className="border-b border-slate-200">
            <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Box className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Orders Ready to Pack
              </span>
              {ordersReadyToPack.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-[#b2ed1d] text-slate-800 rounded px-1.5 py-0.5">
                  {ordersReadyToPack.length}
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {ordersReadyToPack.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">No orders awaiting packing</p>
              ) : (
                ordersReadyToPack.map(shipment => {
                  const hasStation = stations.some(s => s.status === 'Available')
                  return (
                    <div key={shipment.dn_id} className="px-3 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-slate-800 truncate">{shipment.dn_id}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{shipment.customer || '—'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{(shipment.items ?? []).length} line(s)</p>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs font-semibold bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] flex-shrink-0 shadow-none border-0"
                          disabled={!hasStation}
                          onClick={() => handleStartPacking(shipment)}
                        >
                          Start Packing
                        </Button>
                      </div>
                      {!hasStation && (
                        <p className="text-[10px] text-amber-600 mt-1.5">All stations are occupied</p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* ── Section 2: Packing Tasks ── */}
          <section className="border-b border-slate-200">
            <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Packing Tasks</span>
              {packingTasks.length > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-slate-200 text-slate-700 rounded px-1.5 py-0.5">
                  {packingTasks.length}
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {packingTasks.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">No active tasks</p>
              ) : (
                packingTasks.map(task => {
                  const isSelected = task.id === selectedTaskId
                  const packed     = getPackedCount(task.id)
                  const total      = getTotalLines(task.id)
                  const progress   = total > 0 ? Math.round((packed / total) * 100) : 0
                  const status     = getTaskStatus(task)

                  return (
                    <button
                      key={task.id}
                      className={`w-full text-left px-3 py-3 transition-colors ${
                        isSelected
                          ? 'bg-slate-100 border-l-[3px] border-l-[#b2ed1d]'
                          : 'hover:bg-slate-50 border-l-[3px] border-l-transparent'
                      }`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-800 truncate">{task.id}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${TASK_STATUS_STYLES[status]}`}>
                          {status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">DN: {task.dnId} · {task.station}</p>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0">
                          {packed}/{total}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          {/* ── Section 3: Packing Stations ── */}
          <section className="flex-1">
            <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Packing Stations</span>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              {stations.map(station => (
                <div
                  key={station.id}
                  className={`rounded-lg border px-2 py-3 text-center ${STATION_STYLES[station.status]}`}
                >
                  <p className="font-mono text-xs font-bold leading-tight">{station.id}</p>
                  <p className="text-[10px] mt-1 opacity-75">{station.status}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ══════════════════ RIGHT PANEL ══════════════════ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedTask && selectedShipment ? (
            <>
              {/* Detail header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-mono text-base font-bold text-slate-900">{selectedTask.id}</h2>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${TASK_STATUS_STYLES[getTaskStatus(selectedTask)]}`}>
                      {getTaskStatus(selectedTask)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                    <span>DN: <span className="font-mono font-semibold text-slate-700">{selectedTask.dnId}</span></span>
                    <span className="text-slate-300">·</span>
                    <span>Station: <span className="font-semibold text-slate-700">{selectedTask.station}</span></span>
                    {selectedShipment.customer && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{selectedShipment.customer}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                  aria-label="Close detail"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Items list */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Items to Pack
                </h3>

                {taskItems.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No items on this shipment</p>
                ) : (
                  <div className="space-y-2">
                    {taskItems.map((item, idx) => {
                      const isPacked = packedSet.has(idx)
                      const isCompleted = selectedTask.isCompleted
                      return (
                        <label
                          key={idx}
                          htmlFor={`item-${selectedTask.id}-${idx}`}
                          className={`flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer ${
                            isPacked
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          } ${isCompleted ? 'pointer-events-none opacity-70' : ''}`}
                        >
                          <Checkbox
                            id={`item-${selectedTask.id}-${idx}`}
                            checked={isPacked}
                            onCheckedChange={() => !isCompleted && handleToggleItem(selectedTask.id, idx)}
                            disabled={isCompleted}
                            className="h-4 w-4 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`font-mono text-sm font-bold ${isPacked ? 'text-green-700 line-through' : 'text-slate-800'}`}>
                              {item.sku || item.code || `Item ${idx + 1}`}
                            </p>
                            {item.description && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-slate-700">
                              {item.qty ?? item.quantity ?? '—'}
                            </p>
                            <p className="text-xs text-slate-400">{item.uom || 'units'}</p>
                          </div>
                          {isPacked && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer action */}
              <div className="px-6 py-4 border-t border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-500">
                    <span className="font-bold text-slate-800">{packedSet.size}</span>
                    {' '}of{' '}
                    <span className="font-bold text-slate-800">{taskItems.length}</span>
                    {' '}items packed
                    {taskItems.length > 0 && !allPacked && (
                      <span className="text-slate-400"> — check all items to enable completion</span>
                    )}
                  </p>
                  <Button
                    className="h-9 px-5 bg-[#b2ed1d] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm disabled:opacity-40"
                    disabled={!allPacked || selectedTask.isCompleted}
                    onClick={handleCompletePacking}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Packing
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 select-none">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-600 mb-1">Select a packing task to begin</h3>
              <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                Click a task in the left panel, or start a new one from an order that is ready to pack.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
