import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import PageContainer from '../../../components/PageContainer'
import { Send, RefreshCw, Activity } from 'lucide-react'

const headerClass = "text-xs uppercase text-slate-500 font-semibold"

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
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 uppercase px-3">Processing...</Badge>
      }
      if (optimisticStatus === 'SYNCED') {
        return <Badge variant="green" className="uppercase px-3">Synced</Badge>
      }
      if (optimisticStatus === 'ERROR') {
        return <Badge variant="red" className="uppercase px-3">Error</Badge>
      }
    }

    // Otherwise use actual status from data
    const syncStatus = (dn.sync_status || '').toString().toUpperCase()
    
    if (syncStatus === 'SYNCED') {
      return <Badge variant="green" className="uppercase px-3">Synced</Badge>
    } else if (syncStatus === 'SYNCING') {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 uppercase px-3">Processing...</Badge>
    } else if (syncStatus === 'ERROR') {
      return <Badge variant="red" className="uppercase px-3">Error</Badge>
    } else {
      return <Badge variant="secondary" className="uppercase px-3">Pending Upload</Badge>
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
        <Card className="border border-blue-300 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800">{toastMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Sync Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Pending Sync */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Pending Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {syncMetrics.pendingSync}
            </div>
            <p className="text-xs text-slate-500 mt-2">Orders awaiting upload</p>
          </CardContent>
        </Card>

        {/* Synced */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {syncMetrics.synced}
            </div>
            <p className="text-xs text-slate-500 mt-2">Successfully synchronized</p>
          </CardContent>
        </Card>

        {/* API Health */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">API Health</CardTitle>
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
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Delivery Notes Queue</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Approved orders ready for carrier synchronization</p>
          <UNSConnectionInfo topic={TOPIC_STATE} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={headerClass}>DN No</TableHead>
                <TableHead className={headerClass}>Destination</TableHead>
                <TableHead className={headerClass}>Carrier</TableHead>
                <TableHead className={headerClass}>Status</TableHead>
                <TableHead className={headerClass}>External ID</TableHead>
                <TableHead className={headerClass}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedDNs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    No approved delivery notes found
                  </TableCell>
                </TableRow>
              ) : (
                approvedDNs.map((dn) => {
                  const dnNo = dn.dn_no || dn.dn_number || dn.id || 'N/A'
                  const destination = dn.destination || dn.city || 'N/A'
                  const externalId = dn.external_id || dn.carrier_tracking_id || '-'
                  const currentCarrier = carrierSelections[dnNo] || dn.carrier || 'DHL'

                  return (
                    <TableRow key={dnNo} className="bg-white border-b hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900">{dnNo}</TableCell>
                      <TableCell className="text-slate-700">{destination}</TableCell>
                      <TableCell>
                        <Select
                          value={currentCarrier}
                          onValueChange={(carrier) => handleCarrierChange(dnNo, carrier)}
                        >
                          <SelectTrigger className="w-32">
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
                      <TableCell className="text-slate-700 font-mono text-xs">{externalId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isPending(dn) && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-9 px-4 inline-flex items-center gap-2"
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
                              className="border-slate-300"
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
