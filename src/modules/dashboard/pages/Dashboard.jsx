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

// HELPER: Semantic Status Colors (STRICT)
// - Green: Success / Finished
// - Amber: Pending / Warning / Action Needed
// - Blue: Info / In Progress
// - Red: Error / Critical
const getStatusBadgeVariant = (status) => {
  const s = (status || '').toUpperCase()
  if (['COMPLETED', 'RECEIVED', 'SHIPPED', 'CLOSED'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (['PENDING', 'NEW', 'OPEN', 'PICKING', 'QUARANTINE'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (['IN_PROGRESS', 'RECEIVING', 'PACKING', 'SENT'].includes(s)) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (['ERROR', 'FAILED', 'REJECTED'].includes(s)) return 'bg-red-100 text-red-700 border-red-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

export default function ExternalDashboard() {
  const { data } = useGlobalUNS()
  const { user } = useAuth()
  const [costView, setCostView] = useState('daily') 

  // --- DATA EXTRACTION (Robust Handling) ---
  const taskData = data.raw[TOPIC_TASK_QUEUE]
  const inventoryData = data.raw[TOPIC_INVENTORY]
  const externalData = data.raw[TOPIC_SYNC_STATUS]

  const tasks = Array.isArray(taskData) ? taskData : taskData?.queue || taskData?.items || []
  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : inventoryData?.stock_items || inventoryData?.items || []
  const syncRecords = Array.isArray(externalData) ? externalData : externalData?.sync_records || externalData?.items || []

  // Metrics
  const activeTasks = Array.isArray(tasks) ? tasks.filter(t => (t.status || '').toUpperCase() !== 'COMPLETED').length : 0
  const totalStock = Array.isArray(inventoryItems) ? inventoryItems.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0) : 0

  // Filter Lists
  const realInbound = Array.isArray(syncRecords) ? syncRecords.filter(r => (r.type || '').toUpperCase().includes('INBOUND')).slice(0, 5) : []
  const realOutbound = Array.isArray(syncRecords) ? syncRecords.filter(r => (r.type || '').toUpperCase().includes('OUTBOUND')).slice(0, 5) : []
  
  const pendingInboundCount = realInbound.filter(r => (r.status || '').toUpperCase() !== 'CLOSED').length
  const pendingOutboundCount = realOutbound.filter(r => (r.status || '').toUpperCase() !== 'SHIPPED').length

  // Financial Data
  const financeRaw = data.raw[TOPIC_FINANCE] || {}
  const financeData = financeRaw.daily ? financeRaw : { daily: [], monthly: [] }
  const chartData = costView === 'daily' ? financeData.daily : financeData.monthly
  const chartXKey = costView === 'daily' ? 'date' : 'month'

  return (
    <PageContainer variant="standard">
      <div className="space-y-6">
        
        {/* HEADER SECTION: Compact & Efficient */}
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-lg border border-slate-200 shadow-sm">
          {/* Left: Greeting & Context */}
          <div className="flex items-center gap-4">
             
             <div>
               <h2 className="text-lg font-bold text-slate-900 leading-tight">Good Morning, {user.name}</h2>
               <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                 <span>Shanghai Hub (CN-SHA)</span>
                 <span className="text-slate-300">•</span>
                 <span>Operational Overview</span>
               </div>
             </div>
          </div>

          {/* Right: System Metadata (Pills) */}
          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
               <Signal className="h-3.5 w-3.5 text-[#a3e635]" />
               <span>System Online</span>
             </div>
             <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
               <Calendar className="h-3.5 w-3.5 text-slate-400" />
               <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
             </div>
          </div>
        </div>

        <UNSConnectionInfo topic="Henkelv2/Shanghai/Logistics/..." />

        {/* --- KPI CARDS: NEUTRAL & SERIOUS --- */}
        {/* We use Slate-900 for numbers. No random colors. */}
        <div className="grid gap-4 md:grid-cols-4">
          
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Stock</CardTitle>
                <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center">
                  <Package className="h-4 w-4 text-slate-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{totalStock.toLocaleString()}</div>
              <p className="text-xs text-slate-500 mt-1">Units On Hand</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active Tasks</CardTitle>
                <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center">
                  <ClipboardList className="h-4 w-4 text-slate-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Highlight Active Tasks slightly if > 0, but keep it readable */}
              <div className="text-2xl font-bold text-slate-900">{activeTasks}</div>
              <p className="text-xs text-slate-500 mt-1">Pending Operations</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active Inbound</CardTitle>
                <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center">
                  <ArrowDownLeft className="h-4 w-4 text-slate-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{pendingInboundCount}</div>
              <p className="text-xs text-slate-500 mt-1">ASN / Inbound</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Active Outbound</CardTitle>
                <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4 text-slate-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{pendingOutboundCount}</div>
              <p className="text-xs text-slate-500 mt-1">DN / Outbound</p>
            </CardContent>
          </Card>
        </div>

        {/* --- COMMAND CENTER --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CHART: Cleaned up Colors */}
          <Card className="bg-white border-slate-200 shadow-sm lg:col-span-8">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-base font-semibold text-slate-900">Cost Trends</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Real-time impact vs 3PL Spending</p>
                </div>
                {/* Clean Toggle */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
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
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      {/* Brand Green Gradient for External */}
                      <linearGradient id="colorExternal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
                      </linearGradient>
                      {/* Neutral Gradient for Internal */}
                      <linearGradient id="colorInternal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    
                    <XAxis 
                        dataKey={chartXKey} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11 }} 
                        dy={10} 
                        tickFormatter={(val) => costView === 'daily' ? val.slice(5) : val}
                    />
                    
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748b', fontSize: 11 }} 
                        tickFormatter={(value) => `¥${value}`} 
                    />
                    
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px' }} 
                        itemStyle={{ color: '#1e293b' }}
                    />
                    
                    <Area 
                        type="monotone" 
                        dataKey="Internal" 
                        name="Internal Ops" 
                        stroke="#64748b" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorInternal)" 
                    />
                    <Area 
                        type="monotone" 
                        dataKey="External" 
                        name="3PL / External" 
                        stroke="#65a30d" // Darker green for line visibility
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorExternal)" 
                        activeDot={{ r: 4, fill: '#a3e635', stroke: '#fff', strokeWidth: 2 }} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Panel */}
          <Card className="bg-white border-slate-200 shadow-sm lg:col-span-4">
            <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    <Link to="/inbound" className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group">
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <Upload className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-900">Upload ASN / DN</div>
                            <div className="text-xs text-slate-500">Import bulk documents</div>
                        </div>
                    </Link>
                    <Link to="/reconciliation" className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group">
                        <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-900">Raise Dispute</div>
                            <div className="text-xs text-slate-500">Flag inventory discrepancies</div>
                        </div>
                    </Link>
                    <Link to="/costing" className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors group">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                            <Calculator className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-900">Run Costing</div>
                            <div className="text-xs text-slate-500">Calculate daily operational spend</div>
                        </div>
                    </Link>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* --- BOTTOM TABLES --- */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Recent Inbound */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-slate-400" />
                  Recent Inbound
                </CardTitle>
                <Link to="/inbound" className="text-xs text-slate-500 hover:text-slate-900 font-medium">View All</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-3">
                {realInbound.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No records found.</p>
                ) : (
                  realInbound.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                          <div>
                            <div className="font-medium text-slate-900">{item.ref_no || item.id}</div>
                            <div className="text-xs text-slate-500">{item['3pl_provider'] || item.provider || 'Provider'}</div>
                          </div>
                      </div>
                      <Badge className={`${getStatusBadgeVariant(item.sync_status || item.status)} border rounded-sm px-2`}>
                        {item.sync_status || item.status || 'UNKNOWN'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Outbound */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  Recent Outbound
                </CardTitle>
                <Link to="/outbound" className="text-xs text-slate-500 hover:text-slate-900 font-medium">View All</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-3">
                {realOutbound.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No records found.</p>
                ) : (
                  realOutbound.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          <div>
                            <div className="font-medium text-slate-900">{item.ref_no || item.id}</div>
                            <div className="text-xs text-slate-500">{item['3pl_provider'] || item.provider || 'Provider'}</div>
                          </div>
                      </div>
                      <Badge className={`${getStatusBadgeVariant(item.sync_status || item.status)} border rounded-sm px-2`}>
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