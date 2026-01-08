import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'

const headerClass = "text-xs uppercase text-slate-500 font-semibold"

// Mock warehouse data
const warehouses = [
  { id: 'WH-001', name: 'Shanghai Internal WH', type: 'Internal', apiEndpoint: 'N/A', status: 'Active' },
  { id: 'WH-002', name: 'DHL Shanghai Hub', type: 'External', apiEndpoint: 'https://api.dhl.com/v1', status: 'Active' },
  { id: 'WH-003', name: 'Kuehne+Nagel WH', type: 'External', apiEndpoint: 'https://api.kuehne-nagel.com/v2', status: 'Active' },
  { id: 'WH-004', name: 'Beijing Internal WH', type: 'Internal', apiEndpoint: 'N/A', status: 'Inactive' },
]

export default function Warehouses() {
  const getTypeBadge = (type) => {
    if (type === 'Internal') {
      return <Badge variant="gray" className="uppercase px-2">INT</Badge>
    }
    return <Badge variant="blue" className="uppercase px-2">EXT</Badge>
  }

  const getStatusBadge = (status) => {
    if (status === 'Active') {
      return <Badge variant="green" className="uppercase px-2">ACTIVE</Badge>
    }
    return <Badge variant="gray" className="uppercase px-2">INACTIVE</Badge>
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>Warehouses (Admin)</CardTitle>
        <p className="text-sm text-slate-500">Manage warehouse configurations and API endpoints</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={headerClass}>ID</TableHead>
              <TableHead className={headerClass}>Name</TableHead>
              <TableHead className={headerClass}>Type</TableHead>
              <TableHead className={headerClass}>API Endpoint</TableHead>
              <TableHead className={headerClass}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.map((warehouse) => (
              <TableRow key={warehouse.id} className="bg-white border-b hover:bg-slate-50">
                <TableCell className="font-medium text-slate-900">{warehouse.id}</TableCell>
                <TableCell className="text-slate-700">{warehouse.name}</TableCell>
                <TableCell>{getTypeBadge(warehouse.type)}</TableCell>
                <TableCell className="text-slate-700 text-sm font-mono">{warehouse.apiEndpoint}</TableCell>
                <TableCell>{getStatusBadge(warehouse.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
