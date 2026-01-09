import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'

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
      return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm uppercase text-[10px] px-2">INT</Badge>
    }
    return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 border rounded-sm uppercase text-[10px] px-2">EXT</Badge>
  }

  const getStatusBadge = (status) => {
    if (status === 'Active') {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 border rounded-sm uppercase text-[10px] px-2">ACTIVE</Badge>
    }
    return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm uppercase text-[10px] px-2">INACTIVE</Badge>
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-lg font-bold text-slate-900">Warehouses (Admin)</CardTitle>
        <p className="text-xs text-slate-500 mt-1">Manage warehouse configurations and API endpoints</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200">
              <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">ID</TableHead>
              <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Name</TableHead>
              <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Type</TableHead>
              <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">API Endpoint</TableHead>
              <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.map((warehouse) => (
              <TableRow key={warehouse.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 last:border-0 transition-colors">
                <TableCell className="font-mono text-xs font-bold text-slate-700">{warehouse.id}</TableCell>
                <TableCell className="text-slate-900 font-medium">{warehouse.name}</TableCell>
                <TableCell>{getTypeBadge(warehouse.type)}</TableCell>
                <TableCell className="text-slate-600 text-xs font-mono">{warehouse.apiEndpoint}</TableCell>
                <TableCell>{getStatusBadge(warehouse.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
