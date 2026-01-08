import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { 
  Package, FlaskConical, Factory, ShoppingCart, 
  AlertTriangle, Truck, ListChecks, Search
} from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import PageContainer from '../../../components/PageContainer'

// TOPICS TO LISTEN TO
const TOPIC_INVENTORY = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"
const TOPIC_QC = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Inspection_Queue"
const TOPIC_ORDERS = "Henkelv2/Shanghai/Logistics/Production/State/Order_List"
const TOPIC_TASKS = "Henkelv2/Shanghai/Logistics/Production/State/Picking_Tasks"

export default function InternalDashboard() {
  const { data } = useGlobalUNS()
  const navigate = useNavigate()

  // --- 1. AGGREGATE REAL-TIME DATA ---
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

  // --- 2. WIDGET COMPONENTS ---
  const StatCard = ({ title, value, subtext, icon: Icon, colorClass, onClick }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${colorClass}`}
      onClick={onClick}
    >
      <CardContent className="p-6 flex justify-between items-start">
        <div>
          <div className={`p-2 rounded-lg w-fit mb-3 ${colorClass.replace('border-l-', 'bg-').replace('500', '100')}`}>
            <Icon className={`h-6 w-6 ${colorClass.replace('border-l-', 'text-')}`} />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
          {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  )

  const QuickAction = ({ label, icon: Icon, path }) => (
    <Button 
      variant="outline" 
      className="h-24 flex flex-col items-center justify-center gap-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all rounded-lg bg-white shadow-sm"
      onClick={() => navigate(path)}
    >
      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-indigo-600" />
      </div>
      <span className="font-medium text-slate-700">{label}</span>
    </Button>
  )

  return (
    <PageContainer title="Internal Operations" subtitle="Factory floor overview">
      <div className="space-y-8">
        
        {/* ROW 1: KEY METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Batches" value={inventory.length} subtext={`${totalStock.toLocaleString()} kg On Hand`} icon={Package} colorClass="border-l-blue-500" onClick={() => navigate('/inventory/list')} />
          <StatCard title="Awaiting QC" value={qcQueue.length} subtext="Urgent Inspections" icon={FlaskConical} colorClass="border-l-amber-500" onClick={() => navigate('/quality/worklist')} />
          <StatCard title="Active Inventory" value={inventory.filter(i => i.status === 'AVAILABLE').length} subtext="Released for Use" icon={ListChecks} colorClass="border-l-green-500" onClick={() => navigate('/inventory/list')} />
          <StatCard title="Active Orders" value={activeOrders.length} subtext="Production Schedule" icon={Factory} colorClass="border-l-purple-500" onClick={() => navigate('/production/orders')} />
          <StatCard title="Pending Picks" value={pendingPicks} subtext="Move Tasks" icon={ShoppingCart} colorClass="border-l-indigo-500" onClick={() => navigate('/production/picking')} />
        </div>

        {/* ROW 2: ALERTS */}
        {(expiredItems.length > 0 || qcQueue.length > 5) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h4 className="font-bold text-red-900">Operational Alerts</h4>
                <p className="text-sm text-red-700">
                  {expiredItems.length > 0 ? `${expiredItems.length} items are Expired/Blocked. ` : ""}
                  {qcQueue.length > 5 ? "QC Queue is backing up." : ""}
                </p>
              </div>
            </div>
            <Button size="sm" variant="destructive" className="h-9 px-4" onClick={() => navigate('/inventory/list')}>Review Issues</Button>
          </div>
        )}

        {/* ROW 3: QUICK ACTIONS */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <QuickAction label="Receive Goods" icon={Truck} path="/inventory/receipt" />
            <QuickAction label="QA Decisions" icon={FlaskConical} path="/qc/worklist" />
            <QuickAction label="Create Order" icon={Factory} path="/production/orders" />
            <QuickAction label="Picking" icon={ShoppingCart} path="/production/picking" />
            <QuickAction label="Trace Batch" icon={Search} path="/traceability" />
          </div>
        </div>

        {/* ROW 4: LISTS (QC & ORDERS) - ADDED THIS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT: PENDING QC */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-amber-500" /> QC Pending Items
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/quality/worklist')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {qcQueue.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-medium text-sm text-slate-900">{item.desc}</p>
                      <p className="text-xs text-slate-500">{item.batch_id}</p>
                    </div>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">QUARANTINE</Badge>
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
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="h-4 w-4 text-purple-500" /> Active Production Orders
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/production/orders')}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeOrders.slice(0, 4).map((order, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-medium text-sm text-slate-900">{order.productName}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{order.order_id}</span>
                        <span>•</span>
                        <span>{order.qty} {order.unit}</span>
                      </div>
                    </div>
                    <Badge className={order.status === 'IN_PROGRESS' ? "bg-purple-100 text-purple-700 hover:bg-purple-100" : "bg-blue-100 text-blue-700 hover:bg-blue-100"}>
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