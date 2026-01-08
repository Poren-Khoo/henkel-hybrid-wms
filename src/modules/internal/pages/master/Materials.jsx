import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Database, Plus, Search, Edit2, Trash2 } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'

// MOCK DATA (No Backend Needed)
const MOCK_MATERIALS = [
  { code: 'ADH-001', desc: 'Epoxy Adhesive Base Resin', uom: 'KG', shelf: '365 days', hazard: 'Irritant', storage: 'Ambient', fefo: 'Active', status: 'Active' },
  { code: 'ADH-002', desc: 'Polyurethane Adhesive', uom: 'KG', shelf: '270 days', hazard: 'Flammable', storage: 'Cool', fefo: 'Active', status: 'Active' },
  { code: 'CAT-001', desc: 'Curing Agent Type A', uom: 'KG', shelf: '180 days', hazard: 'Corrosive', storage: 'Cool', fefo: 'Active', status: 'Active' },
  { code: 'SOL-001', desc: 'Industrial Solvent MEK', uom: 'L', shelf: '730 days', hazard: 'Flammable', storage: 'Cool', fefo: 'Inactive', status: 'Active' },
  { code: 'FIL-001', desc: 'Silica Filler Fine Grade', uom: 'KG', shelf: '1095 days', hazard: 'None', storage: 'Ambient', fefo: 'Inactive', status: 'Active' },
  { code: 'PIG-001', desc: 'Titanium Dioxide White', uom: 'KG', shelf: '730 days', hazard: 'None', storage: 'Ambient', fefo: 'Inactive', status: 'Active' },
  { code: 'RES-001', desc: 'Phenolic Resin', uom: 'KG', shelf: '180 days', hazard: 'Toxic', storage: 'Cold', fefo: 'Active', status: 'WLAN' }
]

export default function Materials() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredMaterials = MOCK_MATERIALS.filter(m => 
    m.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.desc.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getHazardBadge = (hazard) => {
    if (hazard === 'Flammable') return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">{hazard}</Badge>
    if (hazard === 'Corrosive') return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">{hazard}</Badge>
    if (hazard === 'Toxic') return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">{hazard}</Badge>
    if (hazard === 'Irritant') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">{hazard}</Badge>
    return <Badge variant="outline" className="text-slate-500">{hazard}</Badge>
  }

  return (
    <PageContainer title="Materials" subtitle="Manage material master data">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search materials..." 
              className="pl-8" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="bg-slate-900 text-white"><Plus className="h-4 w-4 mr-2" /> Add Material</Button>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Material Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead>Shelf Life</TableHead>
                <TableHead>Hazard</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>FEFO</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((item) => (
                <TableRow key={item.code}>
                  <TableCell className="font-mono font-medium text-indigo-600">{item.code}</TableCell>
                  <TableCell className="font-medium text-slate-700">{item.desc}</TableCell>
                  <TableCell>{item.uom}</TableCell>
                  <TableCell>{item.shelf}</TableCell>
                  <TableCell>{getHazardBadge(item.hazard)}</TableCell>
                  <TableCell><Badge variant="outline">{item.storage}</Badge></TableCell>
                  <TableCell>
                    <span className={`inline-flex h-2 w-2 rounded-full mr-2 ${item.fefo === 'Active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                    {item.fefo}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">{item.status}</Badge>
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