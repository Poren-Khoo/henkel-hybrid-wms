import React, { useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { 
  Search, Package, Truck, ClipboardList, ArrowRight, AlertCircle, Box 
} from 'lucide-react'
import PageContainer from '../../components/PageContainer'
import { useGlobalUNS } from '../../context/UNSContext'

// TOPICS TO SCAN
const TOPIC_INVENTORY = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"
const TOPIC_INBOUND = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inbound_Plan"
const TOPIC_TASKS = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue"

export default function GlobalSearchResults() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const navigate = useNavigate()
  const { data } = useGlobalUNS()

  // --- OMNI-SEARCH LOGIC ---
  const results = useMemo(() => {
    if (!query) return { inventory: [], inbound: [], tasks: [] }
    const lowerQ = query.toLowerCase()

    // 1. SCAN INVENTORY
    const rawInv = data.raw[TOPIC_INVENTORY]
    const invList = Array.isArray(rawInv) ? rawInv : rawInv?.stock_items || []
    const inventoryMatches = invList.filter(item => 
      (item.hu || '').toLowerCase().includes(lowerQ) ||
      (item.sku || '').toLowerCase().includes(lowerQ) ||
      (item.desc || '').toLowerCase().includes(lowerQ) ||
      (item.batch_id || '').toLowerCase().includes(lowerQ)
    ).map(item => ({
      ...item,
      // Normalize fields
      id: item.hu || item.handling_unit,
      title: item.desc,
      subtitle: item.sku,
      detail: item.location || 'Unknown Loc',
      status: item.status || 'AVAILABLE',
      type: 'INVENTORY'
    }))

    // 2. SCAN INBOUND (ASNs)
    const rawInbound = data.raw[TOPIC_INBOUND]
    const inboundList = Array.isArray(rawInbound) ? rawInbound : rawInbound?.asns || []
    const inboundMatches = inboundList.filter(doc => 
      (doc.id || '').toLowerCase().includes(lowerQ) ||
      (doc.supplier || '').toLowerCase().includes(lowerQ) ||
      (doc.sku || '').toLowerCase().includes(lowerQ)
    ).map(doc => ({
      ...doc,
      id: doc.id,
      title: doc.supplier,
      subtitle: `${doc.qty_expected || 0} Expected`,
      detail: doc.eta || 'No Date',
      status: doc.status || 'PENDING',
      type: 'INBOUND'
    }))

    // 3. SCAN TASKS
    const rawTasks = data.raw[TOPIC_TASKS]
    const taskList = Array.isArray(rawTasks) ? rawTasks : rawTasks?.queue || []
    const taskMatches = taskList.filter(task => 
      (task.task_id || '').toLowerCase().includes(lowerQ) ||
      (task.hu || '').toLowerCase().includes(lowerQ) ||
      (task.material || '').toLowerCase().includes(lowerQ)
    ).map(task => ({
      ...task,
      id: task.task_id,
      title: task.type || 'Movement',
      subtitle: task.material,
      detail: `To: ${task.target || '?' }`,
      status: task.status || 'OPEN',
      type: 'TASK'
    }))

    return {
      inventory: inventoryMatches,
      inbound: inboundMatches,
      tasks: taskMatches,
      total: inventoryMatches.length + inboundMatches.length + taskMatches.length
    }
  }, [query, data.raw])

  // --- HELPER: Status Badge ---
  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase()
    if (['AVAILABLE', 'COMPLETED', 'CLOSED'].includes(s)) return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{s}</Badge>
    if (['PENDING', 'OPEN', 'NEW'].includes(s)) return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{s}</Badge>
    if (['QUARANTINE', 'BLOCKED', 'EXCEPTION'].includes(s)) return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{s}</Badge>
    return <Badge variant="outline" className="text-slate-500 border-slate-200">{s}</Badge>
  }

  // --- HELPER: Navigation ---
  const handleNavigate = (type, id) => {
    if (type === 'INVENTORY') navigate('/inventory/list') // Ideally navigate to detail
    if (type === 'INBOUND') navigate('/inventory/receipt')
    if (type === 'TASK') navigate('/inventory/putaway') // Or task list
  }

  return (
    <PageContainer title={`Search Results: "${query}"`} subtitle={`Found ${results.total} matches across the system`}>
      <div className="space-y-8">
        
        {/* EMPTY STATE */}
        {results.total === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Search className="h-16 w-16 mb-4 text-slate-200" />
            <h3 className="text-lg font-medium text-slate-600">No results found</h3>
            <p className="text-sm">Try searching for a different ID, Material, or Document Number.</p>
          </div>
        )}

        {/* 1. INVENTORY RESULTS */}
        {results.inventory.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Package className="h-4 w-4" /> Inventory Matches ({results.inventory.length})
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">HU / ID</TableHead>
                  <TableHead>Material / Desc</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.inventory.map((item, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleNavigate('INVENTORY', item.id)}>
                    <TableCell className="font-mono text-xs font-bold text-blue-600">{item.id}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.subtitle}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{item.detail}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowRight className="h-4 w-4 text-slate-400" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* 2. INBOUND RESULTS */}
        {results.inbound.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Truck className="h-4 w-4" /> Inbound / ASN Matches ({results.inbound.length})
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Document ID</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.inbound.map((item, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleNavigate('INBOUND', item.id)}>
                    <TableCell className="font-mono text-xs font-bold text-slate-900">{item.id}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.subtitle}</div>
                    </TableCell>
                    <TableCell className="text-xs">{item.detail}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowRight className="h-4 w-4 text-slate-400" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* 3. TASK RESULTS */}
        {results.tasks.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Task Queue ({results.tasks.length})
              </CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Task ID</TableHead>
                  <TableHead>Type / Material</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.tasks.map((item, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleNavigate('TASK', item.id)}>
                    <TableCell className="font-mono text-xs font-bold text-purple-600">{item.id}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.subtitle}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{item.detail}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><ArrowRight className="h-4 w-4 text-slate-400" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

      </div>
    </PageContainer>
  )
}