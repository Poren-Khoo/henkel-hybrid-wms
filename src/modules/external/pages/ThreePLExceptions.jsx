import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue } from '../../../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { Search, AlertCircle, CheckCircle2, AlertTriangle, Plus } from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import PageContainer from '../../../components/PageContainer'

const headerClass = "text-xs uppercase text-slate-500 font-semibold"

// MQTT Topics
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/Exceptions/State/Dispute_List"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/Exceptions/Action/Raise_Dispute"

// Mock Disputes Data (Fallback)
const MOCK_DISPUTES = [
  {
    id: 'EXT-ABC123XYZ',
    reference: 'GLUE-500',
    tpl_provider: 'DHL',
    type: 'Missing Inventory',
    severity: 'High',
    status: 'OPEN',
    created_date: '2025-01-15T10:30:00'
  },
  {
    id: 'EXT-DEF456UVW',
    reference: 'Storage Fees (Jan)',
    tpl_provider: 'SF Express',
    type: 'Overcharged VAS',
    severity: 'High',
    status: 'OPEN',
    created_date: '2025-01-14T14:20:00'
  },
  {
    id: 'EXT-GHI789RST',
    reference: 'SEALANT-X',
    tpl_provider: 'DHL',
    type: 'System Data Error',
    severity: 'Medium',
    status: 'PENDING_3PL',
    created_date: '2025-01-13T09:15:00'
  },
  {
    id: 'EXT-JKL012MNO',
    reference: 'DN-2025-001',
    tpl_provider: 'FedEx',
    type: 'Billing Discrepancy',
    severity: 'Low',
    status: 'RESOLVED',
    created_date: '2025-01-12T16:45:00'
  },
  {
    id: 'EXT-PQR345STU',
    reference: 'TAPE-PRO',
    tpl_provider: 'DHL',
    type: 'Damaged Goods',
    severity: 'Medium',
    status: 'RESOLVED',
    created_date: '2025-01-11T11:30:00'
  }
]

export default function ThreePLExceptions() {
  const { data, publish } = useGlobalUNS()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [providerFilter, setProviderFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  
  // Exception Dialog State (reused from Reconciliation)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedException, setSelectedException] = useState(null)
  const [reason, setReason] = useState('')
  const [priority, setPriority] = useState('')
  const [notes, setNotes] = useState('')
  const [toastMessage, setToastMessage] = useState(null)
  
  // Local state to track newly created exceptions (for demo continuity)
  const [localNewExceptions, setLocalNewExceptions] = useState([])

  // Get disputes from MQTT or use mock data, and combine with local new exceptions
  const disputesData = useMemo(() => {
    const topicData = data.raw[TOPIC_STATE]
    let mqttDisputes = []
    
    if (topicData && Array.isArray(topicData)) {
      mqttDisputes = topicData
    } else if (topicData && Array.isArray(topicData.disputes)) {
      mqttDisputes = topicData.disputes
    }
    
    // Combine MQTT data + Mock data + Local new exceptions
    return [...mqttDisputes, ...MOCK_DISPUTES, ...localNewExceptions]
  }, [data.raw, localNewExceptions])

  // Filter disputes
  const filteredDisputes = useMemo(() => {
    return disputesData.filter(dispute => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          dispute.id?.toLowerCase().includes(query) ||
          dispute.reference?.toLowerCase().includes(query) ||
          dispute.type?.toLowerCase().includes(query) ||
          dispute.tpl_provider?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        const disputeStatus = (dispute.status || '').toUpperCase()
        const filterStatus = statusFilter.toUpperCase()
        if (disputeStatus !== filterStatus) return false
      }

      // Severity filter
      if (severityFilter !== 'ALL') {
        const disputeSeverity = (dispute.severity || '').toUpperCase()
        const filterSeverity = severityFilter.toUpperCase()
        if (disputeSeverity !== filterSeverity) return false
      }

      // Provider filter
      if (providerFilter !== 'ALL') {
        const disputeProvider = (dispute.tpl_provider || dispute.provider || '').toUpperCase()
        const filterProvider = providerFilter.toUpperCase()
        if (disputeProvider !== filterProvider) return false
      }

      // Type filter
      if (typeFilter !== 'ALL') {
        const disputeType = (dispute.type || dispute.reason_code || '').toUpperCase()
        const filterType = typeFilter.toUpperCase()
        // Handle partial matches (e.g., "Missing Inventory" matches "Missing Inventory")
        if (!disputeType.includes(filterType) && filterType !== disputeType) return false
      }

      return true
    })
  }, [disputesData, searchQuery, statusFilter, severityFilter, providerFilter, typeFilter])

  // Get severity badge
  const getSeverityBadge = (severity) => {
    const severityUpper = (severity || '').toUpperCase()
    if (severityUpper === 'HIGH') {
      return <Badge variant="red" className="uppercase px-3 rounded-full">High</Badge>
    }
    if (severityUpper === 'MEDIUM') {
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 uppercase px-3 rounded-full">Medium</Badge>
    }
    if (severityUpper === 'LOW') {
      return <Badge variant="secondary" className="uppercase px-3 rounded-full">Low</Badge>
    }
    return <Badge variant="gray" className="uppercase px-3 rounded-full">{severity}</Badge>
  }

  // Get status badge
  const getStatusBadge = (status) => {
    const statusUpper = (status || '').toUpperCase()
    if (statusUpper === 'OPEN') {
      return <Badge variant="blue" className="uppercase px-3 rounded-full">Open</Badge>
    }
    if (statusUpper === 'RESOLVED') {
      return <Badge variant="green" className="uppercase px-3 rounded-full">Resolved</Badge>
    }
    if (statusUpper === 'PENDING_3PL' || statusUpper === 'PENDING') {
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 uppercase px-3 rounded-full">Pending 3PL</Badge>
    }
    return <Badge variant="gray" className="uppercase px-3 rounded-full">{status}</Badge>
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return '-'
    }
  }

  // Handle resolve action (optimistic update)
  const handleResolve = (disputeId) => {
    // Optimistic update - in real app, this would publish to MQTT
    console.log(`📤 Resolving dispute: ${disputeId}`)
    alert(`Dispute ${disputeId} marked as resolved. (This would publish to MQTT in production)`)
  }

  // Handle create exception (manual/general exception)
  const handleCreateException = () => {
    setSelectedException({
      sku: 'MANUAL',
      intQty: 0,
      extQty: 0,
      diff: 0
    })
    setReason('')
    setPriority('')
    setNotes('')
    setIsDialogOpen(true)
  }

  // Handle submit exception from dialog
  const handleSubmitException = () => {
    if (!reason || !priority) {
      alert('Please select both Reason Code and Priority')
      return
    }

    // Generate random exception ID
    const exceptionId = 'EXT-' + Math.random().toString(36).substr(2, 9).toUpperCase()
    
    // Create dispute payload
    const disputePayload = {
      exception_id: exceptionId,
      sku: selectedException?.sku || 'MANUAL',
      henkel_qty: selectedException?.intQty || 0,
      tpl_qty: selectedException?.extQty || 0,
      discrepancy: selectedException?.diff || 0,
      reason_code: reason,
      priority: priority,
      notes: notes,
      timestamp: Date.now(),
      status: "OPEN"
    }
    
    // Publish to UNS
    publish(TOPIC_ACTION, disputePayload)

    console.log('📤 Exception Payload Sent:', disputePayload)

    // Add to local state for immediate display (demo continuity)
    const newException = {
      id: exceptionId,
      reference: notes.substring(0, 30) || 'Manual Exception',
      tpl_provider: 'Manual',
      type: reason,
      severity: priority,
      status: 'OPEN',
      created_date: new Date().toISOString()
    }
    setLocalNewExceptions(prev => [...prev, newException])

    // Show toast notification
    setToastMessage(`Exception ${exceptionId} sent to Control Tower`)
    setTimeout(() => setToastMessage(null), 3000)

    // Close dialog and reset form
    setIsDialogOpen(false)
    setSelectedException(null)
    setReason('')
    setPriority('')
    setNotes('')
  }

  // Get unique providers and types from data for filter options
  const uniqueProviders = useMemo(() => {
    const providers = new Set()
    disputesData.forEach(d => {
      const provider = d.tpl_provider || d.provider
      if (provider) providers.add(provider)
    })
    return Array.from(providers).sort()
  }, [disputesData])

  const uniqueTypes = useMemo(() => {
    const types = new Set()
    disputesData.forEach(d => {
      const type = d.type || d.reason_code
      if (type) types.add(type)
    })
    return Array.from(types).sort()
  }, [disputesData])

  return (
    <PageContainer 
      title="3PL Exceptions" 
      subtitle="Track and resolve operational disputes."
      variant="alert"
    >
      <div className="space-y-6">
        {/* Create Exception Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleCreateException}
            variant="destructive"
            className="h-10 px-4 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Exception
          </Button>
        </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Card className="border border-green-300 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800">{toastMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Connection Info */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <UNSConnectionInfo topic={TOPIC_STATE} />
        </CardHeader>
      </Card>

      {/* Filter Bar */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Search exceptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue>
                  {statusFilter === 'ALL' ? 'All Status' : 
                   statusFilter === 'OPEN' ? 'Open' :
                   statusFilter === 'PENDING_3PL' ? 'In Progress' :
                   statusFilter === 'RESOLVED' ? 'Resolved' : 'Closed'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="PENDING_3PL">In Progress</SelectItem> 
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>

            {/* Severity Filter */}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue>
                  {severityFilter === 'ALL' ? 'All Severity' : 
                   severityFilter === 'HIGH' ? 'High' :
                   severityFilter === 'MEDIUM' ? 'Medium' : 'Low'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Severity</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Exception Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue>
                  {typeFilter === 'ALL' ? 'All Types' : typeFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="DN">DN</SelectItem>
                <SelectItem value="ASN">ASN</SelectItem>
                <SelectItem value="Inventory">Inventory</SelectItem>
                <SelectItem value="Billing">Billing</SelectItem>
              </SelectContent>
            </Select>

            {/* 3PL Provider Filter */}
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger>
                <SelectValue>
                  {providerFilter === 'ALL' ? 'All 3PLs' : providerFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All 3PLs</SelectItem>
                {uniqueProviders.map(provider => (
                  <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Exception List</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            {filteredDisputes.length} exception{filteredDisputes.length !== 1 ? 's' : ''} found
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={headerClass}>Exception ID</TableHead>
                <TableHead className={headerClass}>Reference</TableHead>
                <TableHead className={headerClass}>3PL Provider</TableHead>
                <TableHead className={headerClass}>Type</TableHead>
                <TableHead className={headerClass}>Severity</TableHead>
                <TableHead className={headerClass}>Status</TableHead>
                <TableHead className={headerClass}>Created</TableHead>
                <TableHead className={headerClass}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDisputes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-12 w-12 text-slate-400" />
                      <p className="text-slate-500 text-lg">No exceptions found</p>
                      <p className="text-slate-400 text-sm">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDisputes.map((dispute) => (
                  <TableRow
                    key={dispute.id}
                    className="bg-white border-b hover:bg-slate-50"
                  >
                    <TableCell className="font-medium text-slate-900 font-mono text-sm">
                      {dispute.id}
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">
                      {dispute.reference}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {dispute.tpl_provider || dispute.provider || '-'}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {dispute.type || dispute.reason_code || '-'}
                    </TableCell>
                    <TableCell>
                      {getSeverityBadge(dispute.severity)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(dispute.status)}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {formatDate(dispute.created_date || dispute.created_at || dispute.timestamp)}
                    </TableCell>
                    <TableCell>
                      {dispute.status?.toUpperCase() !== 'RESOLVED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(dispute.id)}
                          className="text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Exception Dialog (Reused from Reconciliation) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedException?.sku === 'MANUAL' 
                ? 'Create Manual Exception' 
                : `Raise Dispute for ${selectedException?.sku || 'Exception'}`}
            </DialogTitle>
          </DialogHeader>
          
          {selectedException && (
            <>
              {/* Summary Box (only show if not manual) */}
              {selectedException.sku !== 'MANUAL' && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Henkel Qty:</span>
                      <span className="font-semibold text-slate-900 ml-2">
                        {selectedException.intQty.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">3PL Qty:</span>
                      <span className="font-semibold text-slate-900 ml-2">
                        {selectedException.extQty.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">Discrepancy:</span>
                      <span className={`font-semibold ml-2 ${selectedException.diff !== 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {selectedException.diff > 0 ? `+${selectedException.diff}` : selectedException.diff}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reason">Reason Code</Label>
                  <Select
                    value={reason}
                    onValueChange={setReason}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Missing Inventory">Missing Inventory</SelectItem>
                      <SelectItem value="Damaged Goods">Damaged Goods</SelectItem>
                      <SelectItem value="System Data Error">System Data Error</SelectItem>
                      <SelectItem value="Wrong SKU">Wrong SKU</SelectItem>
                      <SelectItem value="Billing Discrepancy">Billing Discrepancy</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Late Truck">Late Truck</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={setPriority}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select priority..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={selectedException.sku === 'MANUAL' 
                      ? "Enter details about the exception (e.g., 'Late Truck', 'Missing Documentation', etc.)..."
                      : "Enter additional details about the discrepancy..."}
                    className="mt-1"
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setSelectedException(null)
                    setReason('')
                    setPriority('')
                    setNotes('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitException}
                  variant="destructive"
                  className="h-10 px-4"
                >
                  Submit Exception
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </PageContainer>
  )
}

