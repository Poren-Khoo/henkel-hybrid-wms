import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom' // Import Navigation
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '../../../../components/ui/dialog'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '../../../../components/ui/select'
import { Plus, Search, Edit2, Trash2, Filter, Download } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

const TOPIC_MAT = "Henkelv2/Shanghai/Logistics/MasterData/State/Materials"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Material"

export default function Materials() {
  const { data, publish } = useGlobalUNS()
  const navigate = useNavigate() // Hook for navigation
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  // Filter state
  const [filters, setFilters] = useState({ hazard: '', storage: '', status: '', fefo: '' })

  // 1. GET LIVE DATA
  const materials = useMemo(() => {
    const packet = data.raw[TOPIC_MAT]
    if (!packet) return []
    return Array.isArray(packet) ? packet : packet.items || []
  }, [data.raw])

  // 2. FILTER LOGIC (Kept same as before)
  const filteredMaterials = useMemo(() => {
    let filtered = materials
    if (searchTerm) {
      filtered = filtered.filter(m => 
        (m.code && m.code.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (m.desc && m.desc.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    // ... (Your existing advanced filters here) ...
    return filtered
  }, [materials, searchTerm, filters])

  // ACTIONS
  const handleEdit = (material) => {
    // Navigate to Detail Page with the Code
    navigate(`/master/material/${material.code}`)
  }

  const handleAdd = () => {
    // Navigate to Detail Page with 'new'
    navigate(`/master/material/new`)
  }

  const handleDeleteMaterial = (code) => {
    if(!window.confirm(`Delete material ${code}?`)) return
    publish(TOPIC_ACTION, { type: 'DELETE', data: { code } })
  }

  // Helper (Kept same)
  const getHazardBadge = (hazard) => {
    switch (hazard) {
      case 'Flammable': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Flammable</Badge>
      case 'Corrosive': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Corrosive</Badge>
      case 'Toxic': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Toxic</Badge>
      default: return <span className="text-slate-400 text-xs">-</span>
    }
  }

  return (
    <PageContainer title="Material Master" subtitle="Manage raw materials and finished goods">
      <div className="space-y-4">
        {/* CONNECTION STATUS */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <UNSConnectionInfo topic={TOPIC_MAT} />
        </div>

        {/* ACTION BAR */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search materials..." 
                className="pl-9 h-9 text-sm bg-slate-50" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Filter Button... */}
          </div>

          <div className="flex items-center gap-2">
            <Button className="bg-[#a3e635] text-slate-900 font-bold h-9 text-xs" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" /> Add Material
            </Button>
          </div>
        </div>

        {/* DATA TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Material Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((item) => (
                <TableRow key={item.code} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleEdit(item)}>
                  <TableCell className="font-mono font-bold text-slate-900">{item.code}</TableCell>
                  <TableCell>{item.desc}</TableCell>
                  <TableCell><Badge variant="secondary">{item.type || 'RM'}</Badge></TableCell>
                  <TableCell>{item.uom}</TableCell>
                  <TableCell>{item.storage}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(item.code); }}>
                      <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                    </Button>
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