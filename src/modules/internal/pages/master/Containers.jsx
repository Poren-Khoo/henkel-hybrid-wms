import React from 'react'
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Box, Plus, Edit2, Trash2, Droplets } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'

const MOCK_CONTAINERS = [
  { id: 'IBC-001', type: 'IBC', capacity: '1000 KG', tare: '75 KG', cleaning: 'Clean', status: 'Available' },
  { id: 'IBC-002', type: 'IBC', capacity: '1000 KG', tare: '75 KG', cleaning: 'Clean', status: 'Available' },
  { id: 'IBC-003', type: 'IBC', capacity: '1000 L', tare: '75 KG', cleaning: 'Clean', status: 'In Use' },
  { id: 'DRM-001', type: 'Drum', capacity: '200 KG', tare: '20 KG', cleaning: 'Clean', status: 'Available' },
  { id: 'DRM-002', type: 'Drum', capacity: '200 KG', tare: '20 KG', cleaning: 'Dirty', status: 'Available' },
]

export default function Containers() {
  return (
    <PageContainer title="Containers" subtitle="Manage IBCs, drums, and pallets">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button className="bg-slate-900 text-white"><Plus className="h-4 w-4 mr-2" /> Add Container</Button>
        </div>
        <Card className="border-slate-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Container ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Tare Weight</TableHead>
                <TableHead>Cleaning Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_CONTAINERS.map((cont) => (
                <TableRow key={cont.id}>
                  <TableCell className="font-mono font-medium text-purple-600 flex items-center gap-2">
                    <Box className="h-3 w-3" /> {cont.id}
                  </TableCell>
                  <TableCell><Badge variant="outline">{cont.type}</Badge></TableCell>
                  <TableCell>{cont.capacity}</TableCell>
                  <TableCell>{cont.tare}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Droplets className={`h-3 w-3 ${cont.cleaning === 'Clean' ? 'text-green-500' : 'text-amber-500'}`} />
                        {cont.cleaning}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cont.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                        {cont.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="h-4 w-4 text-slate-500" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PageContainer>
  )
}