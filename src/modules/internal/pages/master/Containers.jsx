import React, { useState } from 'react'
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Box, Plus, Edit2, Trash2, Droplets, Search, Filter, Download } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'

const MOCK_CONTAINERS = [
  { id: 'IBC-001', type: 'IBC', capacity: '1000 KG', tare: '75 KG', cleaning: 'Clean', status: 'Available' },
  { id: 'IBC-002', type: 'IBC', capacity: '1000 KG', tare: '75 KG', cleaning: 'Clean', status: 'Available' },
  { id: 'IBC-003', type: 'IBC', capacity: '1000 L', tare: '75 KG', cleaning: 'Clean', status: 'In Use' },
  { id: 'DRM-001', type: 'Drum', capacity: '200 KG', tare: '20 KG', cleaning: 'Clean', status: 'Available' },
  { id: 'DRM-002', type: 'Drum', capacity: '200 KG', tare: '20 KG', cleaning: 'Dirty', status: 'Available' },
]

export default function Containers() {
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = MOCK_CONTAINERS.filter(c => 
    c.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <PageContainer title="Containers" subtitle="Manage IBCs, drums, and pallets">
      <div className="space-y-4">
        
        {/* ACTION BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search containers..." 
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="px-3 border-slate-200 text-slate-600 hover:bg-slate-50">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
             <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 hidden sm:flex">
               <Download className="h-4 w-4 mr-2" /> Export
             </Button>
             <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2 w-full sm:w-auto">
               <Plus className="h-4 w-4 mr-2" /> Add Container
             </Button>
          </div>
        </div>

        {/* TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Container ID</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Type</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Capacity</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Tare Weight</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Cleaning Status</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cont) => (
                <TableRow key={cont.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                  <TableCell className="font-mono font-bold text-slate-900 text-xs flex items-center gap-2">
                    <Box className="h-3.5 w-3.5 text-purple-500" /> {cont.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 rounded-sm font-normal">
                        {cont.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">{cont.capacity}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{cont.tare}</TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-sm w-fit ${cont.cleaning === 'Clean' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                        <Droplets className="h-3 w-3" />
                        {cont.cleaning}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cont.status === 'Available' ? "bg-emerald-50 text-emerald-700 border-emerald-200 rounded-sm" : "bg-blue-50 text-blue-700 border-blue-200 rounded-sm"}>
                        {cont.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100">
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
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