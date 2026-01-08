import React from 'react'
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'

const MOCK_LOCATIONS = [
  { code: 'RECV-01', wh: 'WH01', zone: 'RECV', type: 'Receiving', temp: 'Ambient', capacity: '10000 KG', status: 'Active' },
  { code: 'QA-01', wh: 'WH01', zone: 'QA', type: 'QA Hold', temp: 'Ambient', capacity: '5000 KG', status: 'Active' },
  { code: 'QA-02', wh: 'WH01', zone: 'QA', type: 'QA Hold', temp: 'Cool', capacity: '5000 KG', status: 'Active' },
  { code: 'ZONE-A-RAW', wh: 'WH01', zone: 'A', type: 'Storage', temp: 'Ambient', capacity: '20000 KG', status: 'Active' },
  { code: 'LINE-SIDE-A', wh: 'WH01', zone: 'PROD', type: 'Production', temp: 'Ambient', capacity: '2000 KG', status: 'Active' },
]

export default function Locations() {
  return (
    <PageContainer title="Locations" subtitle="Manage warehouse bins and zones">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button className="bg-slate-900 text-white"><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
        </div>
        <Card className="border-slate-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Bin Code</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_LOCATIONS.map((loc) => (
                <TableRow key={loc.code}>
                  <TableCell className="font-mono font-medium text-blue-600 flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> {loc.code}
                  </TableCell>
                  <TableCell>{loc.wh}</TableCell>
                  <TableCell>{loc.zone}</TableCell>
                  <TableCell><Badge variant="outline" className="bg-slate-100">{loc.type}</Badge></TableCell>
                  <TableCell className="flex items-center gap-1">
                    {loc.temp === 'Cool' ? '🌡️' : '☀️'} {loc.temp}
                  </TableCell>
                  <TableCell>{loc.capacity}</TableCell>
                  <TableCell><Badge className="bg-green-100 text-green-700">{loc.status}</Badge></TableCell>
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