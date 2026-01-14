import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { 
  Package, FlaskConical, Factory, ShoppingCart, 
  AlertTriangle, Truck, ListChecks, Search, ArrowRight
} from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import PageContainer from '../../../components/PageContainer'

// TOPICS
const TOPIC_INVENTORY = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"
const TOPIC_QC = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue"
const TOPIC_ORDERS = "Henkelv2/Shanghai/Logistics/Production/State/Order_List"
const TOPIC_TASKS = "Henkelv2/Shanghai/Logistics/Production/State/Picking_Tasks"

export default function InternalDashboard() {
  const { data } = useGlobalUNS()
  const navigate = useNavigate()

  // --- DATA AGGREGATION ---
  const invData = data.raw[TOPIC_INVENTORY] || { stock_items: [] }
  const inventory = invData.stock_items || []
  const totalStock = inventory.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
  
  const expiredItems = inventory.filter(i => i.status === 'EXPIRED' || i.status === 'BLOCKED')
  const qcData = data.raw[TOPIC_QC] || { items: [] }
  const qcQueue = qcData.items || []
  
  const orderData = data.raw[TOPIC_ORDERS] || { items: [] }
  const activeOrders = (orderData.items || []).filter(o => o.status === 'IN_PROGRESS' || o.status === 'PLANNED')
  
  const taskData = data.raw[TOPIC_TASKS] || { items: [] }
  const pendingPicks = (taskData.items || []).filter(t => t.status === 'PENDING').length

  // --- COMPONENT: STAT CARD (Neutral) ---
  const StatCard = ({ title, value, subtext, icon: Icon, onClick }) => (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-md border-slate-200 bg-white group hover:border-slate-300"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2 font-mono tracking-tight">{value}</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">{subtext}</p>
            </div>
            {/* Icon highlights in Green on hover */}
            <div className="h-10 w-10 rounded-md bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-[#a3e635]/10">
                <Icon className="h-5 w-5 text-slate-400 transition-colors group-hover:text-[#65a30d]" />
            </div>
        </div>
      </CardContent>
    </Card>
  )

  // --- COMPONENT: QUICK ACTION TILE (Unified Button System) ---
  // Replaces the "Rainbow Grid" with a strict "Secondary -> Primary Hover" system
  const QuickActionTile = ({ label, icon: Icon, path }) => (
    <button 
        onClick={() => navigate(path)} 
        className="flex flex-col items-center justify-center py-6 transition-all duration-200 group relative overflow-hidden outline-none focus:ring-2 focus:ring-[#a3e635] focus:ring-offset-2 rounded-none first:rounded-bl-lg last:rounded-br-lg hover:bg-slate-50"
    >
        {/* Hover Highlight Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#a3e635] opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 transition-colors group-hover:bg-[#a3e635] group-hover:text-slate-900 group-hover:shadow-md">
            <Icon className="h-6 w-6 text-slate-500 group-hover:text-slate-900" />
        </div>
        <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900">{label}</span>
    </button>
  )

  return (
    <PageContainer title="Internal Operations" subtitle="Factory floor overview">
      <div className="space-y-8">
        
        {/* ROW 1: KEY METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Batches" value={inventory.length} subtext={`${totalStock.toLocaleString()} kg On Hand`} icon={Package} onClick={() => navigate('/inventory/list')} />
          <StatCard title="Awaiting QC" value={qcQueue.length} subtext="Urgent Inspections" icon={FlaskConical} onClick={() => navigate('/quality/worklist')} />
          <StatCard title="Active Inventory" value={inventory.filter(i => i.status === 'AVAILABLE').length} subtext="Released for Use" icon={ListChecks} onClick={() => navigate('/inventory/list')} />
          <StatCard title="Active Orders" value={activeOrders.length} subtext="Production Schedule" icon={Factory} onClick={() => navigate('/production/orders')} />
          <StatCard title="Pending Picks" value={pendingPicks} subtext="Move Tasks" icon={ShoppingCart} onClick={() => navigate('/production/picking')} />
        </div>

        {/* ROW 2: ALERTS (Only Red if Critical) */}
        {(expiredItems.length > 0 || qcQueue.length > 5) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                 <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Operational Attention Needed</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {expiredItems.length > 0 ? `${expiredItems.length} items are Expired/Blocked. ` : ""}
                  {qcQueue.length > 5 ? "QC Queue is backing up." : ""}
                </p>
              </div>
            </div>
            {/* Destructive Button Variant */}
            <Button variant="destructive" size="sm" onClick={() => navigate('/inventory/list')}>
                Review Issues
            </Button>
          </div>
        )}

        {/* ROW 3: QUICK ACTIONS (Unified System) */}
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="pb-0 border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-slate-100">
                    <QuickActionTile label="Receive Goods" icon={Truck} path="/inventory/receipt" />
                    <QuickActionTile label="QA Decisions" icon={FlaskConical} path="/qc/worklist" />
                    <QuickActionTile label="Create Order" icon={Factory} path="/production/orders" />
                    <QuickActionTile label="Picking" icon={ShoppingCart} path="/production/picking" />
                    <QuickActionTile label="Trace Batch" icon={Search} path="/traceability" />
                </div>
            </CardContent>
        </Card>

        {/* ROW 4: LISTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT: PENDING QC */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <FlaskConical className="h-4 w-4 text-slate-400" /> QC Pending Items
              </CardTitle>
              {/* Tertiary/Ghost Button */}
              <Button variant="ghost" size="sm" className="text-xs h-8 text-slate-500 hover:text-slate-900" onClick={() => navigate('/quality/worklist')}>
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0 px-0">
              <div className="divide-y divide-slate-50">
                {qcQueue.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{item.desc}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{item.batch_id}</p>
                    </div>
                    {/* Semantic Badge: Amber for Warning/Pending */}
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-sm">QUARANTINE</Badge>
                  </div>
                ))}
                {qcQueue.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">All caught up! No pending QC.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: ACTIVE PRODUCTION */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                <Factory className="h-4 w-4 text-slate-400" /> Active Production
              </CardTitle>
              {/* Tertiary/Ghost Button */}
              <Button variant="ghost" size="sm" className="text-xs h-8 text-slate-500 hover:text-slate-900" onClick={() => navigate('/production/orders')}>
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0 px-0">
              <div className="divide-y divide-slate-50">
                {activeOrders.slice(0, 4).map((order, i) => (
                  <div key={i} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{order.productName || order.product}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-mono bg-slate-100 px-1 rounded">{order.order_id}</span>
                        <span>{order.qty} {order.unit || 'KG'}</span>
                      </div>
                    </div>
                    {/* Semantic Badge: Blue for Info/InProgress */}
                    <Badge variant="outline" className={order.status === 'IN_PROGRESS' ? "bg-blue-50 text-blue-700 border-blue-200 rounded-sm" : "bg-slate-50 text-slate-600 border-slate-200 rounded-sm"}>
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