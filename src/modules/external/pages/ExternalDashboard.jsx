import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { useGlobalUNS } from '../../../context/UNSContext'
import { useAuth } from '../../../context/AuthContext'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Package, ClipboardList, ArrowDownLeft, ArrowUpRight, AlertTriangle, Upload, Calculator, BarChart3, Calendar, MapPin, Signal } from 'lucide-react'
import { Link } from 'react-router-dom'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import PageContainer from '../../../components/PageContainer'

// Topic constants
const TOPIC_TASK_QUEUE = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue"
const TOPIC_INVENTORY = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"
const TOPIC_SYNC_STATUS = "Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status"
const TOPIC_FINANCE = "Henkelv2/Shanghai/Logistics/Costing/State/Financial_Trends"

// Helper for dynamic badge colors
const getStatusBadgeVariant = (status) => {
  const s = (status || '').toUpperCase()
  if (['COMPLETED', 'RECEIVED', 'SHIPPED', 'CLOSED'].includes(s)) return 'bg-green-100 text-green-700'
  if (['PENDING', 'NEW', 'OPEN', 'PICKING'].includes(s)) return 'bg-amber-100 text-amber-700'
  if (['IN_PROGRESS', 'RECEIVING', 'PACKING'].includes(s)) return 'bg-blue-100 text-blue-700'
  if (['ERROR', 'FAILED'].includes(s)) return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-700'
}

export default function Dashboard() {
  const { data, status } = useGlobalUNS()
  const { user } = useAuth()
  const [costView, setCostView] = useState('daily') // 'daily' or 'monthly'

  // Extract data with robust structure handling
  const taskData = data.raw[TOPIC_TASK_QUEUE]
  const inventoryData = data.raw[TOPIC_INVENTORY]
  const externalData = data.raw[TOPIC_SYNC_STATUS]

  // Handle different data structures for tasks
  const tasks = Array.isArray(taskData) 
    ? taskData 
    : taskData?.queue || taskData?.items || taskData?.tasks || []

  // Handle different data structures for inventory
  const inventoryItems = Array.isArray(inventoryData)
    ? inventoryData
    : inventoryData?.stock_items || inventoryData?.items || inventoryData?.inventory || []

  // Handle different data structures for sync records
  const syncRecords = Array.isArray(externalData)
    ? externalData
    : externalData?.sync_records || externalData?.records || externalData?.items || []

  // --- METRICS CALCULATIONS ---
  const activeTasks = Array.isArray(tasks) 
    ? tasks.filter(t => (t.status || '').toUpperCase() !== 'COMPLETED').length 
    : 0
  
  const totalStock = Array.isArray(inventoryItems)
    ? inventoryItems.reduce((sum, item) => {
        const qty = item.qty || item.quantity || item.qty_available || 0
        return sum + (typeof qty === 'string' ? parseFloat(qty.replace(/[^0-9.]/g, '')) || 0 : qty)
      }, 0)
    : 0

  // --- FILTERING LISTS FOR UI ---
  
  // 1. REAL INBOUND LIST (ASN/Inbound)
  const realInbound = Array.isArray(syncRecords)
    ? syncRecords.filter(record => {
        const type = (record.type || record.doc_type || record.document_type || '').toUpperCase()
        return type.includes('INBOUND') || type.includes('ASN') || type.includes('RECEIPT')
      }).slice(0, 5) // Show top 5 recent
    : []

  // 2. REAL OUTBOUND LIST (DN/Outbound)
  const realOutbound = Array.isArray(syncRecords)
    ? syncRecords.filter(record => {
        const type = (record.type || record.doc_type || record.document_type || '').toUpperCase()
        return type.includes('OUTBOUND') || type.includes('DN') || type.includes('DELIVERY')
      }).slice(0, 5) // Show top 5 recent
    : []
  
  // Calculate Active Work Counts (Everything not finished)
  const pendingInboundCount = realInbound.filter(r => {
    const s = (r.status || r.sync_status || '').toUpperCase()
    return s !== 'CLOSED' && s !== 'COMPLETED' // Count NEW, PENDING, ARRIVED, RECEIVING
  }).length

  const pendingOutboundCount = realOutbound.filter(r => {
    const s = (r.status || r.sync_status || '').toUpperCase()
    return s !== 'SHIPPED' && s !== 'CLOSED' // Count NEW, PENDING, PICKING, PACKING, READY_TO_SHIP
  }).length

  // Live Feed (Mixed)
  const recentTasks = Array.isArray(tasks) ? tasks.slice(0, 3) : []
  const recentSyncRecords = Array.isArray(syncRecords) ? syncRecords.slice(0, 3) : []

  // Get Real Financial Data
  const financeRaw = data.raw[TOPIC_FINANCE] || {}
  const financeData = financeRaw.daily ? financeRaw : { daily: [], monthly: [] }

  // Choose data based on Toggle
  const chartData = costView === 'daily' ? financeData.daily : financeData.monthly
  const chartXKey = costView === 'daily' ? 'date' : 'month'

  return (
    <PageContainer variant="standard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-6">
          {/* Left Side: Greeting */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Good Morning, {user.name}.</h2>
            <p className="text-sm text-slate-500 mt-1">Here is what's happening in your Shanghai Hub today.</p>
          </div>

          {/* Right Side: Live Context Metadata */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Date */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span>Shanghai Hub (CN-SHA)</span>
            </div>

            {/* System Status */}
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
              <Signal className="h-4 w-4 text-slate-500" />
              <span>System Online</span>
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        <UNSConnectionInfo topic="Henkelv2/Shanghai/Logistics/..." />

        {/* --- TOP ROW: METRICS --- */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white border-slate-200 shadow-sm relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">Total Stock</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#e60000]">{totalStock.toLocaleString()}</div>
              <p className="text-sm text-slate-500 mt-2">Units On Hand</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">Active Tasks</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#e60000]">{activeTasks}</div>
              <p className="text-sm text-slate-500 mt-2">Pending Operations</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">Active Inbound</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{pendingInboundCount}</div>
              <p className="text-sm text-slate-500 mt-2">ASN / Inbound</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">Active Outbound</CardTitle>
                <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{pendingOutboundCount}</div>
              <p className="text-sm text-slate-500 mt-2">DN / Outbound</p>
            </CardContent>
          </Card>
        </div>

        {/* --- MIDDLE ROW: COMMAND CENTER --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Chart with Toggle */}
          <Card className="bg-white border-slate-200 shadow-sm lg:col-span-7">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg">Cost Trends ({costView === 'daily' ? 'Daily' : 'Monthly'})</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Real-time financial impact of operations</p>
                </div>
                {/* The Toggle Switch */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setCostView('daily')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${costView === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Daily
                    </button>
                    <button 
                        onClick={() => setCostView('monthly')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${costView === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Monthly
                    </button>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[250px] w-full mt-4 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorExternal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInternal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    
                    {/* Dynamic X-Axis Key (date or month) */}
                    <XAxis 
                        dataKey={chartXKey} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12 }} 
                        dy={10} 
                        tickFormatter={(val) => {
                            if (costView === 'daily') return val.slice(5); // Show "12-30" instead of "2025-12-30"
                            return val; 
                        }}
                    />
                    
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `¥${value}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Area type="monotone" dataKey="Internal" name="Internal Ops" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorInternal)" />
                    <Area type="monotone" dataKey="External" name="External (3PL)" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExternal)" activeDot={{ r: 6, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-white border-slate-200 shadow-sm lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <p className="text-sm text-slate-500">Tasks & Sync (Top 5)</p>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[320px] overflow-y-auto">
              {(() => {
                // Combine tasks and sync records, limit to top 5
                const combined = [
                  ...recentTasks.slice(0, 3).map(t => ({ ...t, _type: 'task' })),
                  ...recentSyncRecords.slice(0, 2).map(r => ({ ...r, _type: 'sync' }))
                ].slice(0, 5)

                if (combined.length === 0) {
                  return (
                    <div className="text-center py-4 text-slate-500">
                      <p>No activity available</p>
                    </div>
                  )
                }

                return combined.map((item, idx) => {
                  if (item._type === 'task') {
                    const status = item.status?.toUpperCase() || ''
                    const getStatusBadge = () => {
                      if (status === 'NEW') return <Badge variant="green" className="uppercase text-xs">NEW</Badge>
                      if (status === 'IN_PROGRESS') return <Badge variant="amber" className="uppercase text-xs">IN_PROGRESS</Badge>
                      if (status === 'COMPLETED') return <Badge variant="gray" className="uppercase text-xs">COMPLETED</Badge>
                      return <Badge variant="gray" className="uppercase text-xs">{item.status}</Badge>
                    }

                    return (
                      <div key={item.id || item.task_id || idx} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                        <div className="text-sm text-slate-700 flex-1 min-w-0">
                          <div className="font-medium truncate">{item.id || item.task_id}</div>
                        </div>
                        {getStatusBadge()}
                      </div>
                    )
                  } else {
                    const syncStatus = item.sync_status?.toUpperCase() || item.status?.toUpperCase() || ''
                    const getSyncBadge = () => {
                      if (syncStatus === 'PENDING') return <Badge variant="amber" className="uppercase text-xs">PENDING</Badge>
                      if (syncStatus === 'SENT') return <Badge variant="blue" className="uppercase text-xs">SENT</Badge>
                      return <Badge variant="gray" className="uppercase text-xs">{item.sync_status || item.status}</Badge>
                    }

                    return (
                      <div key={item.ref_no || item.id || idx} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                        <div className="text-sm text-slate-700 flex-1 min-w-0">
                          <div className="font-medium truncate">{item.ref_no || item.id}</div>
                        </div>
                        {getSyncBadge()}
                      </div>
                    )
                  }
                })
              })()}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Quick Actions</CardTitle></CardHeader>
            <CardContent className="p-2">
              <div className="flex flex-col space-y-1">
                <Button asChild variant="ghost" className="justify-start h-auto py-3 px-2 w-full">
                  <Link to="/reconciliation" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium">Raise Dispute</span>
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start h-auto py-3 px-2 w-full">
                  <Link to="/inbound" className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium">Upload DN</span>
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start h-auto py-3 px-2 w-full">
                  <Link to="/costing" className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium">Run Costing</span>
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="justify-start h-auto py-3 px-2 w-full">
                  <Link to="/reports" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium">View Reports</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- BOTTOM ROW: REAL OPERATIONS (THE NEW PART) --- */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Recent Inbound List */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-md">
                     <ArrowDownLeft className="h-4 w-4 text-emerald-700" />
                  </div>
                  Recent Inbound (ASN)
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-slate-500" asChild>
                  <Link to="/inbound">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {realInbound.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No inbound records found.</p>
                ) : (
                  realInbound.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <div className="font-medium text-sm text-slate-900">{item.ref_no || item.id || 'Unknown ID'}</div>
                        <div className="text-xs text-slate-500">{item['3pl_provider'] || item.provider || 'Provider'}</div>
                      </div>
                      <Badge className={`${getStatusBadgeVariant(item.sync_status || item.status)} border-0`}>
                        {item.sync_status || item.status || 'UNKNOWN'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Outbound List */}
          <Card className="bg-white border-slate-200 shadow-sm">
             <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-md">
                     <ArrowUpRight className="h-4 w-4 text-blue-700" />
                  </div>
                  Recent Outbound (DN)
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-slate-500" asChild>
                  <Link to="/outbound">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {realOutbound.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No outbound records found.</p>
                ) : (
                  realOutbound.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <div className="font-medium text-sm text-slate-900">{item.ref_no || item.id || 'Unknown ID'}</div>
                        <div className="text-xs text-slate-500">{item['3pl_provider'] || item.provider || 'Provider'}</div>
                      </div>
                      <Badge className={`${getStatusBadgeVariant(item.sync_status || item.status)} border-0`}>
                        {item.sync_status || item.status || 'UNKNOWN'}
                      </Badge>
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