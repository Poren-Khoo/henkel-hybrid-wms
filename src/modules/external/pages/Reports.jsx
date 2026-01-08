import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'

const headerClass = "text-xs uppercase text-slate-500 font-semibold"

// MQTT Topic
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB"

// Chart Colors
const CHART_COLORS = {
  inbound: '#94a3b8',      // Slate-400
  outbound: '#475569',     // Slate-600
  storage: '#1e293b',       // Slate-800
  vas: '#e60000'            // Henkel Red
}

export default function Reports() {
  // Get data from Node-RED via MQTT
  // Hook
  const { data } = useGlobalUNS()

  // Safe data parsing - ensure we always have an array
  const safeData = useMemo(() => {
    return Array.isArray(data.dns) ? data.dns : []
  }, [data.dns])

  // Filter: Only APPROVED DNs
  const approvedDNs = useMemo(() => {
    return safeData.filter(dn => {
      if (!dn || typeof dn !== 'object') return false
      const status = (dn.status || dn.workflow_status || '').toString().toUpperCase()
      return status === 'APPROVED'
    })
  }, [safeData])

  // Calculate KPI Metrics
  const kpiMetrics = useMemo(() => {
    const totalSpend = approvedDNs.reduce((sum, dn) => {
      return sum + (Number(dn.total_cost) || 0)
    }, 0)

    const totalOrders = approvedDNs.length

    const storageSpend = approvedDNs.reduce((sum, dn) => {
      const storage = dn.breakdown?.storage || 0
      return sum + (Number(storage) || 0)
    }, 0)

    const vasSpend = approvedDNs.reduce((sum, dn) => {
      return sum + (Number(dn.vas_cost) || 0)
    }, 0)

    return {
      totalSpend,
      totalOrders,
      storageSpend,
      vasSpend
    }
  }, [approvedDNs])

  // Hardcoded Trend Data (until historical data is available)
  const trendData = {
    totalSpend: { value: 12.5, direction: 'up', isGood: false }, // Red - Spending went up (bad)
    totalOrders: { value: 8.2, direction: 'up', isGood: true },  // Emerald - Business growing (good)
    storageSpend: { value: 23.1, direction: 'up', isGood: false }, // Red - Inventory piling up (bad)
    vasSpend: { value: 2.4, direction: 'down', isGood: true }    // Emerald - Efficiency improving (good)
  }

  // Prepare Cost Structure Data for Pie Chart
  const costStructureData = useMemo(() => {
    let inboundTotal = 0
    let outboundTotal = 0
    let storageTotal = 0
    let vasTotal = 0

    approvedDNs.forEach(dn => {
      if (dn.breakdown) {
        inboundTotal += Number(dn.breakdown.inbound) || 0
        outboundTotal += Number(dn.breakdown.outbound) || 0
        storageTotal += Number(dn.breakdown.storage) || 0
      } else {
        // Fallback: if no breakdown, estimate from basic_cost
        const basicCost = Number(dn.basic_cost) || 0
        // Rough estimate: split basic_cost into thirds
        inboundTotal += basicCost / 3
        outboundTotal += basicCost / 3
        storageTotal += basicCost / 3
      }
      vasTotal += Number(dn.vas_cost) || 0
    })

    return [
      { name: 'Inbound', value: inboundTotal },
      { name: 'Outbound', value: outboundTotal },
      { name: 'Storage', value: storageTotal },
      { name: 'VAS', value: vasTotal }
    ].filter(item => item.value > 0) // Only show segments with value
  }, [approvedDNs])

  // Prepare Spend by Destination Data for Bar Chart
  const spendByDestinationData = useMemo(() => {
    const destinationMap = {}

    approvedDNs.forEach(dn => {
      const destination = dn.destination || dn.city || 'Unknown'
      const totalCost = Number(dn.total_cost) || 0

      if (destinationMap[destination]) {
        destinationMap[destination] += totalCost
      } else {
        destinationMap[destination] = totalCost
      }
    })

    // Convert to array and sort by value (descending)
    return Object.entries(destinationMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [approvedDNs])

  // Custom Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const total = costStructureData.reduce((sum, item) => sum + item.value, 0)
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-slate-900">{data.name}</p>
          <p className="text-sm text-slate-600">¥{data.value.toFixed(2)}</p>
          <p className="text-xs text-slate-500">{percentage}% of total</p>
        </div>
      )
    }
    return null
  }

  // Custom Tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-slate-900">{data.payload.name}</p>
          <p className="text-sm text-slate-600">Total: ¥{data.value.toFixed(2)}</p>
        </div>
      )
    }
    return null
  }

  // Loading State
  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Dashboard</h1>
          <p className="text-slate-600 mt-2">Loading financial data...</p>
        </div>
      </div>
    )
  }

  // Empty State
  if (approvedDNs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Financial Dashboard</h1>
          <p className="text-slate-600 mt-2">Real-time financial analytics from approved delivery notes.</p>
        </div>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">No approved delivery notes found</p>
              <p className="text-slate-400 text-sm mt-2">Approved DNs will appear here once they are processed.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Financial Dashboard</h1>
        <p className="text-slate-600 mt-2">Real-time financial analytics from approved delivery notes.</p>
      </div>

      {/* Connection Info */}
      <UNSConnectionInfo topic="Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB" />

      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total Spend */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#e60000]">
              ¥{kpiMetrics.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 mt-2 ${trendData.totalSpend.isGood ? 'text-emerald-600' : 'text-red-600'}`}>
              {trendData.totalSpend.direction === 'up' ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              <span className="text-xs font-medium">
                {trendData.totalSpend.value}% from last month
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">All approved orders</p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {kpiMetrics.totalOrders}
            </div>
            <div className={`flex items-center gap-1 mt-2 ${trendData.totalOrders.isGood ? 'text-emerald-600' : 'text-red-600'}`}>
              {trendData.totalOrders.direction === 'up' ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              <span className="text-xs font-medium">
                {trendData.totalOrders.value}% from last month
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Approved delivery notes</p>
          </CardContent>
        </Card>

        {/* Storage Spend */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Total Storage Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              ¥{kpiMetrics.storageSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 mt-2 ${trendData.storageSpend.isGood ? 'text-emerald-600' : 'text-red-600'}`}>
              {trendData.storageSpend.direction === 'up' ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              <span className="text-xs font-medium">
                {trendData.storageSpend.value}% from last month
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Storage costs only</p>
          </CardContent>
        </Card>

        {/* VAS Spend */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">VAS Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              ¥{kpiMetrics.vasSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 mt-2 ${trendData.vasSpend.isGood ? 'text-emerald-600' : 'text-red-600'}`}>
              {trendData.vasSpend.direction === 'up' ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              <span className="text-xs font-medium">
                {trendData.vasSpend.value}% from last month
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Value-added services</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Chart 1: Cost Structure Breakdown (Pie Chart) */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Cost Structure Breakdown</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Activity-Based Costing Analysis</p>
          </CardHeader>
          <CardContent>
            {costStructureData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No cost data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costStructureData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costStructureData.map((entry, index) => {
                      let color = CHART_COLORS.vas
                      if (entry.name === 'Inbound') color = CHART_COLORS.inbound
                      else if (entry.name === 'Outbound') color = CHART_COLORS.outbound
                      else if (entry.name === 'Storage') color = CHART_COLORS.storage
                      return <Cell key={`cell-${index}`} fill={color} />
                    })}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Spend by Destination (Bar Chart) */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Spend by Destination</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Total cost per destination city</p>
          </CardHeader>
          <CardContent>
            {spendByDestinationData.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No destination data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={spendByDestinationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `¥${value.toLocaleString()}`}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="value" fill={CHART_COLORS.storage} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
