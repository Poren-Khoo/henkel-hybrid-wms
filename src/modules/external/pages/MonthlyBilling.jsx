import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Select } from '../../../components/ui/select'
import { Input } from '../../../components/ui/input'
import { Download, Archive } from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import PageContainer from '../../../components/PageContainer'

const headerClass = "text-xs uppercase text-slate-500 font-semibold"

// MQTT Topic
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB"

// Safe date formatting helper
const formatDateSafe = (dateString) => {
  if (!dateString) return 'Pending'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Pending'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (e) {
    return 'Pending'
  }
}

export default function MonthlyBilling() {
  // Get data from Global UNS Context
  const { data } = useGlobalUNS()
  const [monthFilter, setMonthFilter] = useState('2025-01')
  const [warehouseFilter, setWarehouseFilter] = useState('ALL')
  const [cityFilter, setCityFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')

  // Access data from dns bucket - ensure we always have an array
  const safeData = useMemo(() => {
    return Array.isArray(data.dns) ? data.dns : []
  }, [data.dns])

  // Filter: Only APPROVED DNs with safe status check
  const approvedDNs = useMemo(() => {
    return safeData.filter(dn => {
      if (!dn || typeof dn !== 'object') return false
      const status = (dn.status || dn.workflow_status || '').toString().toUpperCase()
      return status === 'APPROVED'
    })
  }, [safeData])

  // Filter billing data based on selected filters with safe property access
  const filteredData = useMemo(() => {
    return approvedDNs.filter(item => {
      if (!item || typeof item !== 'object') return false

      // Month filter - extract from approved_at or month field (safe)
      if (monthFilter) {
        let itemMonth = null;
        
        // 1. Try explicit 'month' field first
        if (item.month) {
            itemMonth = item.month;
        } 
        // 2. If not, derive it from 'approved_at' timestamp
        else if (item.approved_at) {
          try {
            // Convert timestamp (number) to Date Object
            const dateObj = new Date(item.approved_at);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                itemMonth = `${year}-${month}`; // Result: "2025-01"
            }
          } catch (e) {
            console.error("Date parsing error", e);
          }
        }

        // Compare: "2025-01" === "2025-01"
        if (itemMonth && itemMonth !== monthFilter) return false;
      }
      
      // Warehouse filter
      if (warehouseFilter !== 'ALL') {
        const itemWarehouse = String(item.warehouse || item.warehouse_name || '')
        if (itemWarehouse !== warehouseFilter) return false
      }
      
      // City filter
      if (cityFilter) {
        const itemCity = String(item.city || item.destination || '').toLowerCase()
        if (!itemCity.includes(cityFilter.toLowerCase())) return false
      }
      
      // Customer filter
      if (customerFilter) {
        const itemCustomer = String(item.customer || item.customer_name || '').toLowerCase()
        if (!itemCustomer.includes(customerFilter.toLowerCase())) return false
      }
      
      return true
    })
  }, [approvedDNs, monthFilter, warehouseFilter, cityFilter, customerFilter])

  // Calculate KPI values dynamically with safe Number conversion
  const totalDNs = filteredData.length
  const basicCostSum = filteredData.reduce((sum, item) => {
    const cost = Number(item.basic_cost || item.basicCost || 0)
    return sum + (isNaN(cost) ? 0 : cost)
  }, 0)
  const vasCostSum = filteredData.reduce((sum, item) => {
    const cost = Number(item.vas_cost || item.vasCost || 0)
    return sum + (isNaN(cost) ? 0 : cost)
  }, 0)
  const totalCostSum = filteredData.reduce((sum, item) => {
    const cost = Number(item.total_cost || item.totalCost || 0)
    return sum + (isNaN(cost) ? 0 : cost)
  }, 0)

  // Get unique warehouses for filter dropdown
  const uniqueWarehouses = useMemo(() => {
    const warehouses = approvedDNs
      .map(item => {
        if (!item || typeof item !== 'object') return null
        return String(item.warehouse || item.warehouse_name || '')
      })
      .filter(Boolean)
    return ['ALL', ...new Set(warehouses)]
  }, [approvedDNs])

  const getStatusBadge = (status) => {
    if (!status) return <Badge variant="gray" className="uppercase px-2">-</Badge>
    const statusUpper = String(status).toUpperCase()
    if (statusUpper === 'APPROVED') {
      return <Badge variant="green" className="uppercase px-2">APPROVED</Badge>
    }
    if (statusUpper === 'ARCHIVED') {
      return <Badge variant="gray" className="uppercase px-2">ARCHIVED</Badge>
    }
    return <Badge variant="gray" className="uppercase px-2">{statusUpper}</Badge>
  }

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert('No data to export')
      return
    }

    // CSV export functionality with safe data access
    const csvContent = [
      ['DN No', 'City', 'Customer', 'Basic Cost', 'VAS Cost', 'Total Cost', 'Status', 'Approved By', 'Approved At'],
      ...filteredData.map(item => {
        const dnNo = String(item.dn_no || item.id || item.dnNumber || '-')
        const city = String(item.city || item.destination || '-')
        const customer = String(item.customer || item.customer_name || '-')
        const basicCost = Number(item.basic_cost || item.basicCost || 0)
        const vasCost = Number(item.vas_cost || item.vasCost || 0)
        const totalCost = Number(item.total_cost || item.totalCost || 0)
        const status = String(item.status || item.workflow_status || 'APPROVED')
        const approvedBy = String(item.approved_by || item.approvedBy || '-')
        const approvedAt = item.approved_at || item.approvedAt || null
        
        return [
          dnNo,
          city,
          customer,
          (isNaN(basicCost) ? 0 : basicCost).toFixed(2),
          (isNaN(vasCost) ? 0 : vasCost).toFixed(2),
          (isNaN(totalCost) ? 0 : totalCost).toFixed(2),
          status,
          approvedBy,
          formatDateSafe(approvedAt),
        ]
      }),
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `monthly-billing-${monthFilter}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleArchiveMonth = () => {
    // Mock archive functionality
    if (window.confirm(`Archive all records for ${monthFilter}? This action cannot be undone.`)) {
      alert(`Archived ${filteredData.length} records for ${monthFilter}`)
    }
  }

  return (
    <PageContainer 
      title="Monthly Billing Report" 
      subtitle="Export and archive approved delivery notes."
      variant="finance"
    >
      <div className="space-y-6">
        {/* Filter Section */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Month</label>
              <Input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Warehouse</label>
              <Select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="w-full"
              >
                {uniqueWarehouses.map(warehouse => (
                  <option key={warehouse} value={warehouse}>{warehouse}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Destination City</label>
              <Input
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="Filter by city..."
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Customer</label>
              <Input
                type="text"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                placeholder="Filter by customer..."
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total DNs Card */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Total DNs</p>
              <p className="text-3xl font-bold text-slate-900">{totalDNs}</p>
            </div>
          </CardContent>
        </Card>

        {/* Basic Cost Card */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Basic Cost</p>
              <p className="text-3xl font-bold text-emerald-600">
                ¥{basicCostSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* VAS Cost Card */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">VAS Cost</p>
              <p className="text-3xl font-bold text-purple-600">
                ¥{vasCostSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Cost Card */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Total Cost</p>
              <p className="text-3xl font-bold text-orange-600">
                ¥{totalCostSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex gap-3 mt-4">
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button
          onClick={handleArchiveMonth}
          variant="destructive"
          className="h-10 px-4 inline-flex items-center gap-2"
        >
          <Archive className="h-4 w-4" />
          Archive Month
        </Button>
      </div>

      {/* Billing Details Table */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Billing Details</CardTitle>
          <UNSConnectionInfo topic={TOPIC_STATE} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={headerClass}>DN No</TableHead>
                <TableHead className={headerClass}>City</TableHead>
                <TableHead className={headerClass}>Customer</TableHead>
                <TableHead className={headerClass}>Basic</TableHead>
                <TableHead className={headerClass}>VAS</TableHead>
                <TableHead className={headerClass}>Total</TableHead>
                <TableHead className={headerClass}>Status</TableHead>
                <TableHead className={headerClass}>Approved By</TableHead>
                <TableHead className={headerClass}>Approved At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item, index) => {
                  // Safe property extraction with fallbacks
                  if (!item || typeof item !== 'object') return null
                  
                  const dnNo = String(item.dn_no || item.id || item.dnNumber || `DN-${index}`)
                  const city = String(item.city || item.destination || '-')
                  const customer = String(item.customer || item.customer_name || '-')
                  
                  // Safe number conversion
                  const basicCost = Number(item.basic_cost || item.basicCost || 0)
                  const vasCost = Number(item.vas_cost || item.vasCost || 0)
                  const totalCost = Number(item.total_cost || item.totalCost || 0)
                  
                  const status = String(item.status || item.workflow_status || 'APPROVED')
                  const approvedBy = String(item.approved_by || item.approvedBy || '-')
                  const approvedAt = item.approved_at || item.approvedAt || null
                  
                  // Safe date rendering - NEVER render date directly
                  const formattedDate = formatDateSafe(approvedAt)
                  
                  return (
                    <TableRow key={dnNo} className="bg-white border-b hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900">{dnNo}</TableCell>
                      <TableCell className="text-slate-700">{city}</TableCell>
                      <TableCell className="text-slate-700">{customer}</TableCell>
                      <TableCell className="text-slate-900">
                        ¥{(isNaN(basicCost) ? 0 : basicCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-slate-900">
                        ¥{(isNaN(vasCost) ? 0 : vasCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-slate-900 font-semibold">
                        ¥{(isNaN(totalCost) ? 0 : totalCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getStatusBadge(status)}</TableCell>
                      <TableCell className="text-slate-700">{approvedBy}</TableCell>
                      <TableCell className="text-slate-700">{formattedDate}</TableCell>
                    </TableRow>
                  )
                }).filter(Boolean) // Remove any null entries
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </PageContainer>
  )
}
