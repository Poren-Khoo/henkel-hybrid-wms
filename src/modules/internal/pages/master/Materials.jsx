import React, { useState } from 'react'
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Plus, Search, Edit2, Trash2, Filter, Download } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'

// MOCK DATA
const MOCK_MATERIALS = [
  { code: 'ADH-001', desc: 'Epoxy Adhesive Base Resin', uom: 'KG', shelf: '365 days', hazard: 'Irritant', storage: 'Ambient', fefo: 'Active', status: 'Active' },
  { code: 'ADH-002', desc: 'Polyurethane Adhesive', uom: 'KG', shelf: '270 days', hazard: 'Flammable', storage: 'Cool', fefo: 'Active', status: 'Active' },
  { code: 'CAT-001', desc: 'Curing Agent Type A', uom: 'KG', shelf: '180 days', hazard: 'Corrosive', storage: 'Cool', fefo: 'Active', status: 'Active' },
  { code: 'SOL-001', desc: 'Industrial Solvent MEK', uom: 'L', shelf: '730 days', hazard: 'Flammable', storage: 'Cool', fefo: 'Inactive', status: 'Active' },
  { code: 'FIL-001', desc: 'Silica Filler Fine Grade', uom: 'KG', shelf: '1095 days', hazard: 'None', storage: 'Ambient', fefo: 'Inactive', status: 'Active' },
  { code: 'PIG-001', desc: 'Titanium Dioxide White', uom: 'KG', shelf: '730 days', hazard: 'None', storage: 'Ambient', fefo: 'Inactive', status: 'Active' },
  { code: 'RES-001', desc: 'Phenolic Resin', uom: 'KG', shelf: '180 days', hazard: 'Toxic', storage: 'Cold', fefo: 'Active', status: 'Review' }
]

export default function Materials() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredMaterials = MOCK_MATERIALS.filter(m => 
    m.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.desc.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getHazardBadge = (hazard) => {
    switch (hazard) {
      case 'Flammable': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-sm">Flammable</Badge>
      case 'Corrosive': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 rounded-sm">Corrosive</Badge>
      case 'Toxic': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 rounded-sm">Toxic</Badge>
      case 'Irritant': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-sm">Irritant</Badge>
      default: return <span className="text-slate-400 text-xs font-medium">-</span>
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Active': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-sm">Active</Badge>
      case 'Review': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-sm">Review</Badge>
      default: return <Badge variant="outline" className="text-slate-500 border-slate-200 rounded-sm">{status}</Badge>
    }
  }

  return (
    <PageContainer title="Materials" subtitle="Master data management">
      <div className="space-y-4">
        
        {/* ACTION BAR: Fixed Alignment & Heights */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          {/* Left: Search & Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search materials..." 
                className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-10 px-3 border-slate-200 text-slate-600 hover:bg-slate-50">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" className="h-10 border-slate-200 text-slate-600 hover:bg-slate-50 hidden sm:flex items-center gap-2">
              <Download className="h-4 w-4" /> 
              <span>Export</span>
            </Button>
            {/* PRIMARY BUTTON: h-10 ensures it's not squashed. whitespace-nowrap prevents text wrapping. */}
            <Button className="h-10 bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm px-4 inline-flex items-center gap-2 w-full sm:w-auto whitespace-nowrap">
              <Plus className="h-4 w-4" /> 
              <span>Add Material</span>
            </Button>
          </div>
        </div>

        {/* DATA TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                <TableHead className="h-10 uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material Code</TableHead>
                <TableHead className="h-10 uppercase text-[11px] font-bold text-slate-500 tracking-wider">Description</TableHead>
                <TableHead className="h-10 uppercase text-[11px] font-bold text-slate-500 tracking-wider">UoM</TableHead>
                <TableHead className="h-10 uppercase text-[11px] font-bold text-slate-500 tracking-wider">Shelf Life</TableHead>
                <TableHead className="h-10 uppercase text-[11px] font-bold text-slate-500 tracking-wider">Hazard Class</TableHead>
                <TableHead className="h-10 uppercase text-[11px] font-bold text-slate-500 tracking-wider">Storage</TableHead>
                <TableHead className="h-10 uppercase text-[11px] font-bold text-slate-500 tracking-wider">FEFO</TableHead>
                <TableHead className="h-10 uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="h-10 text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((item) => (
                <TableRow key={item.code} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                  <TableCell className="py-3 font-mono font-bold text-slate-900 text-xs">{item.code}</TableCell>
                  <TableCell className="py-3 font-medium text-slate-700 text-sm">{item.desc}</TableCell>
                  <TableCell className="py-3 text-slate-500 text-sm">{item.uom}</TableCell>
                  <TableCell className="py-3 text-slate-500 text-sm">{item.shelf}</TableCell>
                  <TableCell className="py-3">{getHazardBadge(item.hazard)}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                      <span className={`h-1.5 w-1.5 rounded-full ${item.storage === 'Cold' ? 'bg-blue-400' : 'bg-slate-300'}`}></span>
                      {item.storage}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${item.fefo === 'Active' ? 'bg-[#a3e635]' : 'bg-slate-200'}`} />
                        <span className={`text-xs ${item.fefo === 'Active' ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                            {item.fefo}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    {getStatusBadge(item.status)}
                  </TableCell>
                  
                  {/* FIXED: Action Column Container */}
                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md">
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md">
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