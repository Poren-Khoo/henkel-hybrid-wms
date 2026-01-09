import React, { useState } from 'react'
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { MapPin, Plus, Edit2, Trash2, Search, Filter, Download, Thermometer, Snowflake, Sun } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'

const MOCK_LOCATIONS = [
  { code: 'RECV-01', wh: 'WH01', zone: 'RECV', type: 'Receiving', temp: 'Ambient', capacity: '10,000 KG', status: 'Active' },
  { code: 'QA-01', wh: 'WH01', zone: 'QA', type: 'QA Hold', temp: 'Ambient', capacity: '5,000 KG', status: 'Active' },
  { code: 'QA-02', wh: 'WH01', zone: 'QA', type: 'QA Hold', temp: 'Cool', capacity: '5,000 KG', status: 'Active' },
  { code: 'ZONE-A-RAW', wh: 'WH01', zone: 'A', type: 'Storage', temp: 'Ambient', capacity: '20,000 KG', status: 'Active' },
  { code: 'LINE-SIDE-A', wh: 'WH01', zone: 'PROD', type: 'Production', temp: 'Ambient', capacity: '2,000 KG', status: 'Maintenance' },
]

export default function Locations() {
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = MOCK_LOCATIONS.filter(l => 
    l.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTempBadge = (temp) => {
    if (temp === 'Cool' || temp === 'Cold') {
        return (
            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-sm border border-blue-100 w-fit text-xs font-medium">
                <Snowflake className="h-3 w-3" /> {temp}
            </div>
        )
    }
    return (
        <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-1 rounded-sm border border-orange-100 w-fit text-xs font-medium">
            <Sun className="h-3 w-3" /> {temp}
        </div>
    )
  }

  return (
    <PageContainer title="Locations" subtitle="Manage warehouse bins and zones">
      <div className="space-y-4">
        
        {/* ACTION BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search locations..." 
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
             {/* Primary Action: Tier0 Green */}
             <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-10 px-4 inline-flex items-center gap-2 w-full sm:w-auto">
               <Plus className="h-4 w-4 mr-2" /> Add Location
             </Button>
          </div>
        </div>

        {/* TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Bin Code</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Warehouse</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Zone</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Type</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Temp</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Capacity</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((loc) => (
                <TableRow key={loc.code} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                  <TableCell className="font-mono font-bold text-slate-900 text-xs flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" /> {loc.code}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">{loc.wh}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{loc.zone}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 rounded-sm font-normal">
                        {loc.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getTempBadge(loc.temp)}</TableCell>
                  <TableCell className="text-slate-600 text-sm font-medium">{loc.capacity}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={loc.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-200 rounded-sm" : "bg-amber-50 text-amber-700 border-amber-200 rounded-sm"}>
                        {loc.status}
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