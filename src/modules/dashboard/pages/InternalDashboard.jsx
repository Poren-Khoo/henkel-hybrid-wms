import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import {
  Package, FlaskConical, Factory, ShoppingCart,
  AlertTriangle, Truck, Search, ArrowRight,
  Layers, Zap
} from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import { useAnimatedCounter } from '../../../hooks/useAnimatedCounter'
import { ResponsiveContainer, LineChart, Line } from 'recharts'
import PageContainer from '../../../components/PageContainer'

// ─── TOPIC CONSTANTS ──────────────────────────────────────────
const TOPIC_INVENTORY = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"
const TOPIC_QC = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue"
const TOPIC_ORDERS = "Henkelv2/Shanghai/Logistics/Production/State/Order_List"
const TOPIC_TASKS = "Henkelv2/Shanghai/Logistics/Production/State/Picking_Tasks"

// ─── DEMO FALLBACK DATA ──────────────────────────────────────
const DEMO_INVENTORY = [
  { sku: 'GLUE-500', desc: 'Industrial Adhesive 500ml', qty: 1250, status: 'AVAILABLE', batch_id: 'B2026-001' },
  { sku: 'SEALANT-X', desc: 'Premium Sealant Compound', qty: 850, status: 'AVAILABLE', batch_id: 'B2026-002' },
  { sku: 'TAPE-PRO', desc: 'Professional Packing Tape', qty: 3200, status: 'AVAILABLE', batch_id: 'B2026-003' },
  { sku: 'ADHESIVE-PRO', desc: 'Adhesive Pro Grade', qty: 420, status: 'QUARANTINE', batch_id: 'B2026-004' },
  { sku: 'COATING-UV', desc: 'UV Coating Solution', qty: 680, status: 'AVAILABLE', batch_id: 'B2026-005' },
  { sku: 'RESIN-HG', desc: 'High-Grade Resin', qty: 0, status: 'EXPIRED', batch_id: 'B2025-091' },
  { sku: 'CLEANER-IND', desc: 'Industrial Cleaner', qty: 150, status: 'BLOCKED', batch_id: 'B2025-088' },
]

const DEMO_QC_QUEUE = [
  { sample_id: 'SMP-4201', desc: 'Adhesive Pro Grade', batch_id: 'B2026-004', sku: 'ADHESIVE-PRO', status: 'QUARANTINE' },
  { sample_id: 'SMP-4202', desc: 'UV Coating Solution', batch_id: 'B2026-010', sku: 'COATING-UV', status: 'QUARANTINE' },
  { sample_id: 'SMP-4203', desc: 'Premium Sealant', batch_id: 'B2026-011', sku: 'SEALANT-X', status: 'QUARANTINE' },
]

const DEMO_ORDERS = [
  { order_id: 'PO-2026-0042', product: 'Adhesive Batch A', productName: 'Adhesive Batch A', qty: 500, unit: 'KG', status: 'IN_PROGRESS' },
  { order_id: 'PO-2026-0043', product: 'Sealant Mix B', productName: 'Sealant Mix B', qty: 200, unit: 'KG', status: 'PLANNED' },
  { order_id: 'PO-2026-0044', product: 'Coating UV-100', productName: 'Coating UV-100', qty: 150, unit: 'L', status: 'IN_PROGRESS' },
]

const DEMO_PICKING = [
  { task_id: 'PICK-9001', status: 'PENDING', material_code: 'GLUE-500' },
  { task_id: 'PICK-9002', status: 'PENDING', material_code: 'SEALANT-X' },
  { task_id: 'PICK-9003', status: 'PICKED', material_code: 'TAPE-PRO' },
]

// ─── HELPERS ─────────────────────────────────────────────────

const makeSpark = (base) => Array.from({ length: 8 }, () => ({
  v: Math.max(0, Math.round(base + (Math.random() - 0.4) * Math.max(base * 0.5, 2)))
}))

// ─── REUSABLE COMPONENTS ─────────────────────────────────────

function StatCard({ title, value, subtext, icon: Icon, onClick, sparkData, sparkColor = '#b2ed1d', accentFrom, accentTo }) {
  return (
    <Card
      className="relative cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200/80 bg-white group overflow-hidden"
      onClick={onClick}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: `linear-gradient(180deg, ${accentFrom || '#b2ed1d'}, ${accentTo || '#65a30d'})` }}
      />
      <CardContent className="p-5 pl-6 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">{title}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1.5 tabular-nums tracking-tight">{value}</h3>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">{subtext}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-[#b2ed1d]/10">
            <Icon className="h-5 w-5 text-slate-400 transition-colors group-hover:text-[#65a30d]" />
          </div>
        </div>
      </CardContent>
      {sparkData && (
        <div className="h-9 -mx-1 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function QuickActionTile({ label, icon: Icon, path, navigate }) {
  return (
    <button
      onClick={() => navigate(path)}
      className="flex flex-col items-center justify-center py-5 transition-all duration-200 group relative overflow-hidden outline-none focus:ring-2 focus:ring-[#b2ed1d] focus:ring-offset-2 hover:bg-slate-50"
    >
      <div className="absolute top-0 left-0 w-full h-0.5 bg-[#b2ed1d] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center mb-2.5 transition-all group-hover:bg-[#b2ed1d] group-hover:shadow-md">
        <Icon className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
      </div>
      <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
    </button>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────

export default function InternalDashboard() {
  const { data } = useGlobalUNS()
  const navigate = useNavigate()

  // ─── Data with Fallbacks ─────────────────────────────────
  const invData = data.raw[TOPIC_INVENTORY] || {}
  let inventory = Array.isArray(invData) ? invData : (invData.stock_items ?? invData.items ?? null)
  if (!Array.isArray(inventory) || inventory.length === 0) inventory = DEMO_INVENTORY

  const totalStock = inventory.reduce((sum, item) => sum + (Number(item?.qty) || 0), 0)
  const expiredItems = inventory.filter(i => i?.status === 'EXPIRED' || i?.status === 'BLOCKED')

  const qcData = data.raw[TOPIC_QC] || {}
  let qcQueue = Array.isArray(qcData) ? qcData : (qcData.items ?? null)
  if (!Array.isArray(qcQueue) || qcQueue.length === 0) qcQueue = DEMO_QC_QUEUE

  const orderData = data.raw[TOPIC_ORDERS] || {}
  let orderItems = Array.isArray(orderData) ? orderData : (orderData.items ?? null)
  if (!Array.isArray(orderItems) || orderItems.length === 0) orderItems = DEMO_ORDERS
  const activeOrders = orderItems.filter(o => o?.status === 'IN_PROGRESS' || o?.status === 'PLANNED')

  const taskData = data.raw[TOPIC_TASKS] || {}
  let taskItems = Array.isArray(taskData) ? taskData : (taskData.items ?? null)
  if (!Array.isArray(taskItems) || taskItems.length === 0) taskItems = DEMO_PICKING
  const pendingPicks = taskItems.filter(t => t?.status === 'PENDING').length

  // Animated counters
  const animBatches = useAnimatedCounter(inventory.length)
  const animQC = useAnimatedCounter(qcQueue.length)
  const animAvailable = useAnimatedCounter(inventory.filter(i => i.status === 'AVAILABLE').length)
  const animOrders = useAnimatedCounter(activeOrders.length)
  const animPicks = useAnimatedCounter(pendingPicks)

  const sparkBatches = useMemo(() => makeSpark(inventory.length), [inventory.length])
  const sparkQC = useMemo(() => makeSpark(qcQueue.length), [qcQueue.length])

  return (
    <PageContainer variant="standard" className="!bg-slate-50 !p-0">
      <div className="p-4 sm:p-6 space-y-6">

        {/* ─── KEY METRICS ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-fade-in">
          <StatCard
            title="Total Batches"
            value={animBatches}
            subtext={`${totalStock.toLocaleString()} kg on hand`}
            icon={Package}
            onClick={() => navigate('/operations/inventory/list')}
            sparkData={sparkBatches}
            accentFrom="#b2ed1d"
            accentTo="#65a30d"
          />
          <StatCard
            title="Awaiting QC"
            value={animQC}
            subtext="Urgent inspections"
            icon={FlaskConical}
            onClick={() => navigate('/quality/decisions')}
            sparkData={sparkQC}
            sparkColor="#f59e0b"
            accentFrom="#f59e0b"
            accentTo="#d97706"
          />
          <StatCard
            title="Active Inventory"
            value={animAvailable}
            subtext="Released for use"
            icon={Layers}
            onClick={() => navigate('/operations/inventory/list')}
            accentFrom="#3b82f6"
            accentTo="#2563eb"
          />
          <StatCard
            title="Active Orders"
            value={animOrders}
            subtext="Production schedule"
            icon={Factory}
            onClick={() => navigate('/production/orders')}
            accentFrom="#8b5cf6"
            accentTo="#7c3aed"
          />
          <StatCard
            title="Pending Picks"
            value={animPicks}
            subtext="Move tasks"
            icon={ShoppingCart}
            onClick={() => navigate('/production/picking')}
            accentFrom="#ec4899"
            accentTo="#db2777"
          />
        </div>

        {/* ─── ALERTS ──────────────────────────────────────── */}
        {(expiredItems.length > 0 || qcQueue.length > 5) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Operational Attention Needed</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {expiredItems.length > 0 ? `${expiredItems.length} items are Expired/Blocked. ` : ''}
                  {qcQueue.length > 5 ? 'QC Queue is backing up.' : ''}
                </p>
              </div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => navigate('/operations/inventory/list')}>
              Review Issues
            </Button>
          </div>
        )}

        {/* ─── QUICK ACTIONS ──────────────────────────────── */}
        <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-0 border-b border-slate-100 px-6 py-4 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#b2ed1d]" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-slate-100">
              <QuickActionTile label="Receive Goods" icon={Truck} path="/operations/inbound/receiving" navigate={navigate} />
              <QuickActionTile label="QA Decisions" icon={FlaskConical} path="/quality/decisions" navigate={navigate} />
              <QuickActionTile label="Create Order" icon={Factory} path="/production/orders" navigate={navigate} />
              <QuickActionTile label="Picking" icon={ShoppingCart} path="/production/picking" navigate={navigate} />
              <QuickActionTile label="Trace Batch" icon={Search} path="/governance/traceability" navigate={navigate} />
            </div>
          </CardContent>
        </Card>

        {/* ─── DATA TABLES ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* QC Pending */}
          <Card className="shadow-sm border-slate-200/80 bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-amber-500" />
                QC Pending Items
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-slate-400 hover:text-slate-900"
                onClick={() => navigate('/quality/decisions')}
              >
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0 px-0">
              <div className="divide-y divide-slate-50">
                {qcQueue.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex justify-between items-center px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{item.desc}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.batch_id}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded text-[10px] font-bold">
                      QUARANTINE
                    </Badge>
                  </div>
                ))}
                {qcQueue.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">All caught up!</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Production */}
          <Card className="shadow-sm border-slate-200/80 bg-white">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Factory className="h-4 w-4 text-violet-500" />
                Active Production
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-slate-400 hover:text-slate-900"
                onClick={() => navigate('/production/orders')}
              >
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0 px-0">
              <div className="divide-y divide-slate-50">
                {activeOrders.slice(0, 4).map((order, i) => (
                  <div key={i} className="flex justify-between items-center px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{order.productName || order.product}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{order.order_id}</span>
                        <span>{order.qty} {order.unit || 'KG'}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        order.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 rounded text-[10px] font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 rounded text-[10px] font-bold'
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                ))}
                {activeOrders.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">No active orders scheduled.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
