import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'

const headerClass = "text-xs uppercase text-slate-500 font-semibold"

// MQTT Topic
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue"

export default function InternalOps() {
  // Get data from Global UNS Context
  const { data } = useGlobalUNS()
  
  // Extract task data from raw bucket
  const taskData = data.raw[TOPIC_STATE] || {}

  const getTypeBadge = (type) => {
    const typeUpper = type?.toUpperCase() || ''
    if (typeUpper === 'PICK') {
      return <Badge variant="blue" className="uppercase px-3 rounded-full">PICK</Badge>
    }
    if (typeUpper === 'PUTAWAY') {
      return <Badge className="bg-orange-500 text-white uppercase px-3 rounded-full">PUTAWAY</Badge>
    }
    return <Badge variant="gray" className="uppercase px-3 rounded-full">{type}</Badge>
  }

  const getStatusBadge = (status) => {
    const statusUpper = status?.toUpperCase() || ''
    if (statusUpper === 'NEW') {
      return <Badge variant="green" className="uppercase px-3 rounded-full">NEW</Badge>
    }
    if (statusUpper === 'IN_PROGRESS') {
      return <Badge variant="amber" className="uppercase px-3 rounded-full">IN_PROGRESS</Badge>
    }
    if (statusUpper === 'COMPLETED') {
      return <Badge variant="gray" className="uppercase px-3 rounded-full">COMPLETED</Badge>
    }
    return <Badge variant="gray" className="uppercase px-3 rounded-full">{status}</Badge>
  }

  // Get queue from taskData
  const queue = taskData?.queue || []

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Internal Ops - Task Queue</CardTitle>
        <UNSConnectionInfo topic={TOPIC_STATE} lastUpdated={taskData?.last_updated} />
      </CardHeader>
      <CardContent className="p-0">
        {!queue || queue.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No tasks available</p>
            <p className="text-xs mt-2">Waiting for tasks...</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={headerClass}>Task ID</TableHead>
                <TableHead className={headerClass}>DN Number</TableHead>
                <TableHead className={headerClass}>Type</TableHead>
                <TableHead className={headerClass}>Location</TableHead>
                <TableHead className={headerClass}>SKU</TableHead>
                <TableHead className={headerClass}>Status</TableHead>
                <TableHead className={headerClass}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((task) => (
                <TableRow key={task.id || task.task_id} className="bg-white border-b hover:bg-slate-50">
                  <TableCell className="font-medium text-slate-900">{task.id || task.task_id}</TableCell>
                  <TableCell className="text-slate-700">{task.dn_no || task.dn_number}</TableCell>
                  <TableCell>{getTypeBadge(task.type)}</TableCell>
                  <TableCell className="text-slate-700">{task.location}</TableCell>
                  <TableCell className="text-slate-700">{task.sku}</TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>
                    <Button 
                      disabled 
                      className="text-xs px-3 py-1 h-7"
                      variant="ghost"
                    >
                      Process
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
