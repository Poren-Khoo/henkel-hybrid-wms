import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { useGlobalUNS } from '../../../context/UNSContext'
import { useAnimatedCounter } from '../../../hooks/useAnimatedCounter'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts'
import {
  Package, ClipboardList, ArrowDownLeft, ArrowUpRight,
  AlertTriangle, Upload, Calculator, Activity,
  TrendingUp, Zap, BarChart3, AlertOctagon, FileCheck2
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../../../components/PageContainer'

// ─── TOPIC CONSTANTS ──────────────────────────────────────────
const TOPIC_TASK_QUEUE  = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue"
const TOPIC_INVENTORY   = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"
const TOPIC_SYNC_STATUS = "Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status"
const TOPIC_EXCEPTIONS  = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Exceptions"
const TOPIC_QC          = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue"
const TOPIC_DN_WORKFLOW = "Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB"

// ─── DEMO FALLBACK DATA ──────────────────────────────────────
const DEMO_TASKS = [
  { id: 'TSK-78501', type: 'PUTAWAY', status: 'NEW',         sku: 'GLUE-500',     location: 'A-01-03' },
  { id: 'TSK-78502', type: 'PICK',    status: 'IN_PROGRESS', sku: 'SEALANT-X',    location: 'B-02-01' },
  { id: 'TSK-78503', type: 'PUTAWAY', status: 'COMPLETED',   sku: 'TAPE-PRO',     location: 'C-01-02' },
  { id: 'TSK-78504', type: 'PICK',    status: 'NEW',         sku: 'ADHESIVE-PRO', location: 'A-03-01' },
  { id: 'TSK-78505', type: 'PUTAWAY', status: 'COMPLETED',   sku: 'COATING-UV',   location: 'D-02-04' },
  { id: 'TSK-78506', type: 'PICK',    status: 'COMPLETED',   sku: 'GLUE-500',     location: 'A-01-01' },
]

const DEMO_INVENTORY = [
  { sku: 'GLUE-500',     desc: 'Industrial Adhesive 500ml',  qty: 1250, status: 'AVAILABLE'  },
  { sku: 'SEALANT-X',   desc: 'Premium Sealant Compound',   qty: 850,  status: 'AVAILABLE'  },
  { sku: 'TAPE-PRO',    desc: 'Professional Packing Tape',  qty: 3200, status: 'AVAILABLE'  },
  { sku: 'ADHESIVE-PRO',desc: 'Adhesive Pro Grade',          qty: 420,  status: 'QUARANTINE' },
  { sku: 'COATING-UV',  desc: 'UV Coating Solution',         qty: 680,  status: 'AVAILABLE'  },
]

const DEMO_SYNC_RECORDS = [
  { ref_no: 'ASN-20260325-001', type: 'INBOUND',  status: 'RECEIVED', '3pl_provider': 'DHL Shanghai', sync_status: 'SENT'    },
  { ref_no: 'ASN-20260325-002', type: 'INBOUND',  status: 'PENDING',  '3pl_provider': 'SF Express',   sync_status: 'PENDING' },
  { ref_no: 'ASN-20260324-003', type: 'INBOUND',  status: 'CLOSED',   '3pl_provider': 'Sinotrans',    sync_status: 'CLOSED'  },
  { ref_no: 'DN-20260325-001',  type: 'OUTBOUND', status: 'SHIPPED',  '3pl_provider': 'DHL Shanghai', sync_status: 'SHIPPED' },
  { ref_no: 'DN-20260325-002',  type: 'OUTBOUND', status: 'PENDING',  '3pl_provider': 'JD Logistics', sync_status: 'PENDING' },
  { ref_no: 'DN-20260324-003',  type: 'OUTBOUND', status: 'SHIPPED',  '3pl_provider': 'SF Express',   sync_status: 'SHIPPED' },
]

const DEMO_THROUGHPUT = {
  daily: [
    { date: '03-20', Inbound: 8,  Outbound: 5  },
    { date: '03-21', Inbound: 6,  Outbound: 9  },
    { date: '03-22', Inbound: 12, Outbound: 4  },
    { date: '03-23', Inbound: 7,  Outbound: 11 },
    { date: '03-24', Inbound: 10, Outbound: 8  },
    { date: '03-25', Inbound: 9,  Outbound: 7  },
    { date: '03-26', Inbound: 6,  Outbound: 10 },
  ],
  monthly: [
    { month: '2025-10', Inbound: 148, Outbound: 132 },
    { month: '2025-11', Inbound: 162, Outbound: 158 },
    { month: '2025-12', Inbound: 145, Outbound: 170 },
    { month: '2026-01', Inbound: 178, Outbound: 165 },
    { month: '2026-02', Inbound: 155, Outbound: 148 },
    { month: '2026-03', Inbound: 142, Outbound: 138 },
  ],
}

const DEMO_EXCEPTIONS = [
  { id: 'EX-001', type: 'QUALITY_FAIL', severity: 'CRITICAL', status: 'OPEN', sku: 'ADHESIVE-PRO', ref: 'ASN-20260325-002' },
  { id: 'EX-002', type: 'OVER_RECEIPT', severity: 'WARNING',  status: 'OPEN', sku: 'GLUE-500',     ref: 'ASN-20260324-003' },
  { id: 'EX-003', type: 'MISSING_DOCS', severity: 'INFO',     status: 'OPEN', sku: 'COATING-UV',   ref: 'ASN-20260323-001' },
]

const DEMO_PENDING_DNS = [
  { dn_no: 'DN-2026-0041', customer: 'Henkel Beijing',    items: 3, status: 'PENDING_APPROVAL' },
  { dn_no: 'DN-2026-0038', customer: 'Henkel Guangzhou',  items: 1, status: 'PENDING_APPROVAL' },
  { dn_no: 'DN-2026-0035', customer: 'Henkel Chengdu',    items: 5, status: 'PENDING_APPROVAL' },
]

// ─── HELPERS ───────────────────────────────────────────────

const getStatusStyle = (status) => {
  const s = (status || '').toUpperCase()
  if (['COMPLETED', 'RECEIVED', 'SHIPPED', 'CLOSED'].includes(s))
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (['PENDING', 'NEW', 'OPEN', 'PICKING', 'QUARANTINE'].includes(s))
    return 'bg-amber-50 text-amber-700 border-amber-200'
  if (['IN_PROGRESS', 'RECEIVING', 'PACKING', 'SENT'].includes(s))
    return 'bg-blue-50 text-blue-700 border-blue-200'
  if (['ERROR', 'FAILED', 'REJECTED'].includes(s))
    return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

// Builds throughput chart data from sync records grouped by date/month
const buildThroughputData = (records, view) => {
  const map = {}
  records.forEach(r => {
    const m = view === 'daily'
      ? (r.ref_no || '').match(/\d{4}(\d{2})(\d{2})-/)
      : (r.ref_no || '').match(/(\d{4})(\d{2})\d{2}-/)
    if (!m) return
    const key = view === 'daily' ? `${m[1]}-${m[2]}` : `${m[1]}-${m[2]}`
    if (!map[key]) map[key] = view === 'daily'
      ? { date: key, Inbound: 0, Outbound: 0 }
      : { month: key, Inbound: 0, Outbound: 0 }
    const t = (r.type || '').toUpperCase()
    if (t.includes('INBOUND'))  map[key].Inbound++
    else if (t.includes('OUTBOUND')) map[key].Outbound++
  })
  const rows = Object.values(map).sort((a, b) => {
    const ka = view === 'daily' ? a.date : a.month
    const kb = view === 'daily' ? b.date : b.month
    return ka.localeCompare(kb)
  })
  return rows.length >= 2 ? rows : null
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-xl px-4 py-3 text-xs">
      <p className="font-semibold text-slate-900 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-bold text-slate-900">{entry.value} orders</span>
        </div>
      ))}
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────

export default function Dashboard() {
  const { data } = useGlobalUNS()
  const [throughputView, setThroughputView] = useState('daily')

  // ─── Data Extraction with Fallbacks ──────────────────────
  const taskData      = data.raw[TOPIC_TASK_QUEUE]
  const inventoryData = data.raw[TOPIC_INVENTORY]
  const externalData  = data.raw[TOPIC_SYNC_STATUS]

  let tasks = Array.isArray(taskData) ? taskData : (taskData?.queue ?? taskData?.items ?? null)
  if (!Array.isArray(tasks) || tasks.length === 0) tasks = DEMO_TASKS

  let inventoryItems = Array.isArray(inventoryData)
    ? inventoryData
    : (inventoryData?.stock_items ?? inventoryData?.items ?? null)
  if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) inventoryItems = DEMO_INVENTORY

  let syncRecords = Array.isArray(externalData)
    ? externalData
    : (externalData?.sync_records ?? externalData?.items ?? null)
  if (!Array.isArray(syncRecords) || syncRecords.length === 0) syncRecords = DEMO_SYNC_RECORDS

  // Exceptions
  const exceptionRaw = data.raw[TOPIC_EXCEPTIONS]
  let exceptions = Array.isArray(exceptionRaw) ? exceptionRaw : (exceptionRaw?.items ?? null)
  if (!Array.isArray(exceptions) || exceptions.length === 0) exceptions = DEMO_EXCEPTIONS
  const openExceptions = exceptions.filter(e => (e.status || '').toUpperCase() === 'OPEN')

  // QC / quarantine items from inventory
  const quarantineItems = inventoryItems.filter(i =>
    ['QUARANTINE', 'BLOCKED', 'EXPIRED'].includes((i.status || '').toUpperCase())
  )

  // Pending DN Approvals — try both raw topic and data.dns bucket
  const dnRaw = data.raw[TOPIC_DN_WORKFLOW] ?? data.dns
  let allDNs = Array.isArray(dnRaw) ? dnRaw : (dnRaw?.items ?? null)
  if (!Array.isArray(allDNs) || allDNs.length === 0) allDNs = DEMO_PENDING_DNS
  const pendingDNs = allDNs.filter(dn =>
    ['PENDING_APPROVAL', 'PENDING'].includes((dn.status || dn.workflow_status || '').toUpperCase())
  )

  // ─── Computed Metrics ────────────────────────────────────
  const totalStock    = inventoryItems.reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0)
  const activeTasks   = tasks.filter(t => (t.status || '').toUpperCase() !== 'COMPLETED').length
  const allTaskCount  = tasks.length
  const completedCount = allTaskCount - activeTasks
  const completionPct  = allTaskCount > 0 ? Math.round((completedCount / allTaskCount) * 100) : 0

  const putawayTasks = tasks.filter(t =>
    (t.type || '').toUpperCase() === 'PUTAWAY' && (t.status || '').toUpperCase() !== 'COMPLETED'
  ).length
  const pickTasks = tasks.filter(t =>
    (t.type || '').toUpperCase() === 'PICK' && (t.status || '').toUpperCase() !== 'COMPLETED'
  ).length

  const realInbound  = syncRecords.filter(r => (r.type || '').toUpperCase().includes('INBOUND')).slice(0, 5)
  const realOutbound = syncRecords.filter(r => (r.type || '').toUpperCase().includes('OUTBOUND')).slice(0, 5)
  const pendingInboundCount  = realInbound.filter(r =>
    !['CLOSED', 'RECEIVED'].includes((r.status || '').toUpperCase())
  ).length
  const pendingOutboundCount = realOutbound.filter(r =>
    (r.status || '').toUpperCase() !== 'SHIPPED'
  ).length

  // Throughput chart
  const builtThroughput = useMemo(
    () => buildThroughputData(syncRecords, throughputView),
    [syncRecords, throughputView]
  )
  const chartData = builtThroughput ?? (throughputView === 'daily' ? DEMO_THROUGHPUT.daily : DEMO_THROUGHPUT.monthly)
  const chartXKey = throughputView === 'daily' ? 'date' : 'month'

  // Animated counters
  const animTotalStock  = useAnimatedCounter(totalStock)
  const animActiveTasks = useAnimatedCounter(activeTasks)
  const animInbound     = useAnimatedCounter(pendingInboundCount)
  const animOutbound    = useAnimatedCounter(pendingOutboundCount)
  const animExceptions  = useAnimatedCounter(openExceptions.length + quarantineItems.length)
  const animCompletion  = useAnimatedCounter(completionPct)

  // Sparklines
  const sparkStock = useMemo(() => {
    const base = totalStock || 100
    return Array.from({ length: 8 }, () => ({ v: Math.round(base * (0.88 + Math.random() * 0.25)) }))
  }, [totalStock])

  const sparkTasks = useMemo(() => {
    const base = activeTasks || 5
    return Array.from({ length: 8 }, () => ({
      v: Math.max(0, Math.round(base + (Math.random() - 0.4) * Math.max(base, 2)))
    }))
  }, [activeTasks])

  const gaugeData = [{ name: 'Completion', value: completionPct, fill: '#b2ed1d' }]

  return (
    <PageContainer variant="standard" className="!bg-slate-50 !p-0">
      <div className="p-4 sm:p-6 space-y-6">

        {/* ─── KPI CARDS ───────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-fade-in">

          {/* Total Stock */}
          <Card className="relative overflow-hidden bg-white border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#b2ed1d] to-[#65a30d]" />
            <CardContent className="p-5 pl-6 pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Total Stock</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1.5 tabular-nums tracking-tight">
                    {animTotalStock.toLocaleString()}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2">
                    {quarantineItems.length > 0 ? (
                      <>
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-[11px] font-semibold text-amber-600">{quarantineItems.length} in quarantine</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span className="text-[11px] font-semibold text-emerald-600">All clear</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-[#b2ed1d]/10 transition-colors">
                  <Package className="h-5 w-5 text-slate-400 group-hover:text-[#65a30d] transition-colors" />
                </div>
              </div>
            </CardContent>
            <div className="h-10 -mx-1 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkStock}>
                  <Line type="monotone" dataKey="v" stroke="#b2ed1d" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Active Tasks */}
          <Card className="relative overflow-hidden bg-white border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600" />
            <CardContent className="p-5 pl-6 pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Active Tasks</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1.5 tabular-nums tracking-tight">{animActiveTasks}</h3>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Activity className="h-3 w-3 text-blue-500" />
                    <span className="text-[11px] font-semibold text-blue-600">{putawayTasks} putaway</span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="text-[11px] font-semibold text-violet-600">{pickTasks} pick</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <ClipboardList className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </CardContent>
            <div className="h-10 -mx-1 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkTasks}>
                  <Line type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Pending Inbound */}
          <Card className="relative overflow-hidden bg-white border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-orange-500" />
            <CardContent className="p-5 pl-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Pending Inbound</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1.5 tabular-nums tracking-tight">{animInbound}</h3>
                  <div className="flex items-center gap-1.5 mt-2">
                    <ArrowDownLeft className="h-3 w-3 text-amber-500" />
                    <span className="text-[11px] font-semibold text-amber-600">{realInbound.length} total ASNs</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-amber-50 transition-colors">
                  <ArrowDownLeft className="h-5 w-5 text-slate-400 group-hover:text-amber-600 transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Outbound */}
          <Card className="relative overflow-hidden bg-white border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-purple-600" />
            <CardContent className="p-5 pl-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Pending Outbound</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1.5 tabular-nums tracking-tight">{animOutbound}</h3>
                  <div className="flex items-center gap-1.5 mt-2">
                    <ArrowUpRight className="h-3 w-3 text-violet-500" />
                    <span className="text-[11px] font-semibold text-violet-600">{realOutbound.length} total DNs</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-violet-50 transition-colors">
                  <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-violet-600 transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exceptions / QC Holds */}
          <Card className="relative overflow-hidden bg-white border-slate-200/80 shadow-sm hover:shadow-md transition-all group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 to-rose-600" />
            <CardContent className="p-5 pl-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Exceptions / QC</p>
                  <h3 className={`text-3xl font-bold mt-1.5 tabular-nums tracking-tight ${animExceptions > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {animExceptions}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2">
                    <AlertOctagon className="h-3 w-3 text-red-500" />
                    <span className="text-[11px] font-semibold text-red-600">{openExceptions.length} open</span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="text-[11px] font-semibold text-amber-600">{quarantineItems.length} quarantine</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-red-50 transition-colors">
                  <AlertOctagon className="h-5 w-5 text-slate-400 group-hover:text-red-600 transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── COMMAND CENTER ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Warehouse Throughput Chart */}
          <Card className="bg-white border-slate-200/80 shadow-sm lg:col-span-8">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                  Warehouse Throughput
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Inbound receipts vs outbound shipments</p>
              </div>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                <button
                  onClick={() => setThroughputView('daily')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${throughputView === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setThroughputView('monthly')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${throughputView === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Monthly
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b2ed1d" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#b2ed1d" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gSlate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey={chartXKey}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Inbound"
                      name="Inbound"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      fill="url(#gSlate)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Outbound"
                      name="Outbound"
                      stroke="#65a30d"
                      strokeWidth={2}
                      fill="url(#gGreen)"
                      activeDot={{ r: 5, fill: '#b2ed1d', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Right Column */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Task Completion Gauge */}
            <Card className="bg-white border-slate-200/80 shadow-sm">
              <CardContent className="pt-5 pb-4 flex items-center gap-5">
                <div className="w-[110px] h-[110px] shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%" cy="50%"
                      innerRadius="70%" outerRadius="100%"
                      barSize={10}
                      data={gaugeData}
                      startAngle={90} endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar
                        background={{ fill: '#f1f5f9' }}
                        dataKey="value"
                        angleAxisId={0}
                        cornerRadius={5}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-900 tabular-nums">{animCompletion}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Task Completion</p>
                  <p className="text-xs text-slate-400 mt-1">{completedCount} of {allTaskCount} tasks done</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="h-2 w-2 rounded-full bg-[#b2ed1d]" />
                    <span className="text-[11px] text-slate-500">Completed</span>
                    <div className="h-2 w-2 rounded-full bg-slate-200 ml-2" />
                    <span className="text-[11px] text-slate-500">Remaining</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white border-slate-200/80 shadow-sm flex-1">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#b2ed1d]" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  <Link to="/operations/inbound/orders" className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <Upload className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Upload ASN / DN</div>
                      <div className="text-[11px] text-slate-400">Import documents</div>
                    </div>
                  </Link>
                  <Link to="/reconciliation" className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Raise Dispute</div>
                      <div className="text-[11px] text-slate-400">Flag discrepancies</div>
                    </div>
                  </Link>
                  <Link to="/costing" className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                      <Calculator className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Run Costing</div>
                      <div className="text-[11px] text-slate-400">Calculate spend</div>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── BOTTOM TABLES ───────────────────────────────── */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* Recent Inbound */}
          <Card className="bg-white border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-slate-400" />
                  Recent Inbound
                </CardTitle>
                <Link to="/operations/inbound/orders" className="text-xs text-slate-400 hover:text-slate-900 font-semibold transition-colors">
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-0">
              <div className="divide-y divide-slate-50">
                {realInbound.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No records found.</p>
                ) : (
                  realInbound.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          ['CLOSED', 'RECEIVED'].includes((item.status || '').toUpperCase()) ? 'bg-emerald-500' : 'bg-amber-400'
                        }`} />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{item.ref_no || item.id}</div>
                          <div className="text-[11px] text-slate-400">{item['3pl_provider'] || item.provider || '—'}</div>
                        </div>
                      </div>
                      <Badge className={`${getStatusStyle(item.sync_status || item.status)} border text-[10px] font-bold rounded px-2 py-0.5`}>
                        {item.sync_status || item.status || 'UNKNOWN'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending DN Approvals */}
          <Card className="bg-white border-slate-200/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="h-4 w-4 text-slate-400" />
                  Pending DN Approvals
                </CardTitle>
                <Link to="/operations/outbound/planning" className="text-xs text-slate-400 hover:text-slate-900 font-semibold transition-colors">
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-0">
              <div className="divide-y divide-slate-50">
                {pendingDNs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No pending approvals.</p>
                ) : (
                  pendingDNs.slice(0, 5).map((dn, idx) => (
                    <div key={idx} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-amber-400" />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{dn.dn_no || dn.id}</div>
                          <div className="text-[11px] text-slate-400">{dn.customer || dn.consignee || dn.ship_to || '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(dn.items || dn.sku_count) ? (
                          <span className="text-[11px] text-slate-400">
                            {dn.items || dn.sku_count} SKU{(dn.items || dn.sku_count) !== 1 ? 's' : ''}
                          </span>
                        ) : null}
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-[10px] font-bold rounded px-2 py-0.5">
                          AWAITING
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
