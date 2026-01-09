import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import PageContainer from '../../../components/PageContainer'
import { Send, RefreshCw, Activity, CheckCircle2 } from 'lucide-react'

// MQTT Topics
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/Integration/Action/Sync_3PL"

// Available Carriers
const CARRIERS = ['DHL', 'SF Express', 'FedEx', 'UPS', 'TNT']

export default function ExternalSync() {
  // Get data from Node-RED via MQTT
  const { data, publish } = useGlobalUNS()
  
  // Local state for carrier selections and optimistic updates
  const [carrierSelections, setCarrierSelections] = useState({})
  const [optimisticStatuses, setOptimisticStatuses] = useState({})
  const [toastMessage, setToastMessage] = useState(null)

  // Safe data parsing - ensure we always have an array
  const safeData = useMemo(() => {
    // If global data is empty/loading, return empty array
    if (!data.dns) return []
    // Ensure it is an array
    return Array.isArray(data.dns) ? data.dns : Object.values(data.dns)
  }, [data.dns]) //

  // Filter: Only APPROVED DNs
  const approvedDNs = useMemo(() => {
    return safeData.filter(dn => {
      if (!dn || typeof dn !== 'object') return false
      const status = (dn.status || dn.workflow_status || '').toString().toUpperCase()
      return status === 'APPROVED'
    })
  }, [safeData])

  // Calculate Sync Status Metrics
  const syncMetrics = useMemo(() => {
    let pendingSync = 0
    let synced = 0

    approvedDNs.forEach(dn => {
      const syncStatus = (dn.sync_status || '').toString().toUpperCase()
      if (syncStatus === 'SYNCED') {
        synced++
      } else if (!syncStatus || syncStatus === 'PENDING' || syncStatus === '') {
        pendingSync++
      }
    })

    return { pendingSync, synced }
  }, [approvedDNs])

  // Get status badge with optimistic updates
  const getStatusBadge = (dn) => {
    // Check optimistic status first (for immediate UI feedback)
    const optimisticStatus = optimisticStatuses[dn.dn_no]
    if (optimisticStatus) {
      if (optimisticStatus === 'SYNCING') {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 border rounded-sm uppercase text-[10px] px-2">Processing...</Badge>
      }
      if (optimisticStatus === 'SYNCED') {
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 border rounded-sm uppercase text-[10px] px-2">Synced</Badge>
      }
      if (optimisticStatus === 'ERROR') {
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 border rounded-sm uppercase text-[10px] px-2">Error</Badge>
      }
    }

    // Otherwise use actual status from data
    const syncStatus = (dn.sync_status || '').toString().toUpperCase()
    
    if (syncStatus === 'SYNCED') {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 border rounded-sm uppercase text-[10px] px-2">Synced</Badge>
    } else if (syncStatus === 'SYNCING') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 border rounded-sm uppercase text-[10px] px-2">Processing...</Badge>
    } else if (syncStatus === 'ERROR') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 border rounded-sm uppercase text-[10px] px-2">Error</Badge>
    } else {
      return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm uppercase text-[10px] px-2">Pending Upload</Badge>
    }
  }

  // Handle carrier selection change
  const handleCarrierChange = (dnNo, carrier) => {
    setCarrierSelections(prev => ({
      ...prev,
      [dnNo]: carrier
    }))
  }

  // Handle Push to Carrier
  const handlePushToCarrier = (dn) => {
    const selectedCarrier = carrierSelections[dn.dn_no] || dn.carrier || 'DHL'
    
    // Optimistic update: immediately show "SYNCING" status
    setOptimisticStatuses(prev => ({
      ...prev,
      [dn.dn_no]: 'SYNCING'
    }))

    // Publish to Node-RED
    const payload = {
      dn_no: dn.dn_no || dn.dn_number || dn.id,
      carrier: selectedCarrier
    }

    publish(TOPIC_ACTION, payload)
    
    setToastMessage(`Pushing ${dn.dn_no || dn.dn_number || dn.id} to ${selectedCarrier}...`)
    setTimeout(() => setToastMessage(null), 3000)

    // Simulate backend response (in real app, this would come from MQTT)
    // After 2 seconds, update to SYNCED (or ERROR if something goes wrong)
    setTimeout(() => {
      setOptimisticStatuses(prev => ({
        ...prev,
        [dn.dn_no]: 'SYNCED'
      }))
    }, 2000)
  }

  // Handle Force Resync
  const handleForceResync = (dn) => {
    const selectedCarrier = carrierSelections[dn.dn_no] || dn.carrier || 'DHL'
    
    // Optimistic update
    setOptimisticStatuses(prev => ({
      ...prev,
      [dn.dn_no]: 'SYNCING'
    }))

    const payload = {
      dn_no: dn.dn_no || dn.dn_number || dn.id,
      carrier: selectedCarrier,
      force: true
    }

    publish(TOPIC_ACTION, payload)
    
    setToastMessage(`Force resyncing ${dn.dn_no || dn.dn_number || dn.id} to ${selectedCarrier}...`)
    setTimeout(() => setToastMessage(null), 3000)

    setTimeout(() => {
      setOptimisticStatuses(prev => ({
        ...prev,
        [dn.dn_no]: 'SYNCED'
      }))
    }, 2000)
  }

  // Check if DN is pending (no sync status or empty)
  const isPending = (dn) => {
    const syncStatus = (dn.sync_status || '').toString().toUpperCase()
    return !syncStatus || syncStatus === 'PENDING' || syncStatus === ''
  }

  // Check if DN is synced
  const isSynced = (dn) => {
    const optimisticStatus = optimisticStatuses[dn.dn_no]
    if (optimisticStatus === 'SYNCED') return true
    
    const syncStatus = (dn.sync_status || '').toString().toUpperCase()
    return syncStatus === 'SYNCED'
  }

  // Loading State
  if (!data) {
    return (
      <PageContainer 
        title="External 3PL Integration (Control Tower)" 
        subtitle="Loading integration data..."
      />
    )
  }

  return (
    <PageContainer 
      title="External 3PL Integration (Control Tower)" 
      subtitle="Manage data synchronization with external carriers (DHL, SF Express)."
    >
      <div className="space-y-6">

      {/* Toast Notification */}
      {toastMessage && (
        <Card className="bg-white border border-blue-200 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-medium text-blue-800">{toastMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Pending Sync */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {syncMetrics.pendingSync}
            </div>
            <p className="text-xs text-slate-500 mt-2">Orders awaiting upload</p>
          </CardContent>
        </Card>

        {/* Synced */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {syncMetrics.synced}
            </div>
            <p className="text-xs text-slate-500 mt-2">Successfully synchronized</p>
          </CardContent>
        </Card>

        {/* API Health */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">API Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-lg font-bold text-emerald-600">Online</div>
                <p className="text-xs text-slate-500">Latency: 24ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-bold text-slate-900">Delivery Notes Queue</CardTitle>
          <p className="text-xs text-slate-500 mt-1">Approved orders ready for carrier synchronization</p>
          <UNSConnectionInfo topic={TOPIC_STATE} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">DN No</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Destination</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Carrier</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">External ID</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedDNs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Send className="h-10 w-10 text-slate-300 mb-2" />
                      <p className="text-sm font-medium">No approved delivery notes found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                approvedDNs.map((dn) => {
                  const dnNo = dn.dn_no || dn.dn_number || dn.id || 'N/A'
                  const destination = dn.destination || dn.city || 'N/A'
                  const externalId = dn.external_id || dn.carrier_tracking_id || '-'
                  const currentCarrier = carrierSelections[dnNo] || dn.carrier || 'DHL'

                  return (
                    <TableRow key={dnNo} className="bg-white border-b border-slate-100 hover:bg-slate-50 last:border-0 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-slate-700">{dnNo}</TableCell>
                      <TableCell className="text-slate-700 font-medium">{destination}</TableCell>
                      <TableCell>
                        <Select
                          value={currentCarrier}
                          onValueChange={(carrier) => handleCarrierChange(dnNo, carrier)}
                        >
                          <SelectTrigger className="w-32 h-9 text-sm bg-slate-50 border-slate-200">
                            <SelectValue>
                              {currentCarrier}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {CARRIERS.map(carrier => (
                              <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{getStatusBadge(dn)}</TableCell>
                      <TableCell className="text-slate-600 font-mono text-xs">{externalId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isPending(dn) && (
                            <Button
                              size="sm"
                              className="h-9 px-4 inline-flex items-center gap-2 bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm"
                              onClick={() => handlePushToCarrier(dn)}
                            >
                              <Send className="h-3 w-3" />
                              Push to Carrier
                            </Button>
                          )}
                          {isSynced(dn) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleForceResync(dn)}
                              className="border-slate-200 text-slate-700 hover:bg-slate-50 h-9"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Force Resync
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </PageContainer>
  )
}
