import React, { useState, useMemo } from 'react'
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
import { Box, Plus, Edit2, Trash2, Droplets, Search, Filter, Download } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_CONT = "Henkelv2/Shanghai/Logistics/MasterData/State/Containers"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Container"

export default function Containers() {
  const { data, publish } = useGlobalUNS()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    id: '',
    type: 'IBC',
    capacity: '1000',
    capacityUom: 'L',
    tare: '60',
    tareUom: 'KG',
    cleaning: 'Clean',
    status: 'Available'
  })

  // 1. GET LIVE DATA
  const containers = useMemo(() => {
    const packet = data.raw[TOPIC_CONT]
    if (!packet) return []

    // Unwrap UNS Envelope
    if (packet.topics && packet.topics[0] && Array.isArray(packet.topics[0].value)) {
      return packet.topics[0].value
    }

    return Array.isArray(packet) ? packet : packet.items || []
  }, [data.raw])

  // 2. FILTER LOGIC
  const filtered = useMemo(() => {
    if (!searchTerm) return containers
    return containers.filter(c => 
      (c.id && c.id.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (c.type && c.type.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [containers, searchTerm])

  // 3. ACTIONS
  const handleSave = () => {
    if (!formData.id) return alert("Container ID is required")

    const payload = {
      type: 'ADD',
      data: { 
        id: formData.id, 
        type: formData.type, 
        capacity: `${formData.capacity} ${formData.capacityUom}`, 
        tare: `${formData.tare} ${formData.tareUom}`, 
        cleaning: formData.cleaning, 
        status: formData.status 
      }
    }
    publish(TOPIC_ACTION, payload)
    setIsModalOpen(false)
    
    // Reset minimal
    setFormData(prev => ({ ...prev, id: '' }))
  }

  const handleDeleteContainer = (id) => {
    if(!window.confirm(`Delete container ${id}?`)) return
    publish(TOPIC_ACTION, { type: 'DELETE', data: { id } })
  }

  return (
    <PageContainer title="Containers" subtitle="Manage IBCs, drums, and pallets">
      <div className="space-y-4">
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <UNSConnectionInfo topic={TOPIC_CONT} />
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search containers..." 
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors h-9 text-sm" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="px-3 border-slate-200 text-slate-600 hover:bg-slate-50 h-9">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
             <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 hidden sm:flex h-9 text-xs">
               <Download className="h-4 w-4 mr-2" /> Export
             </Button>
             
             {/* Primary Action */}
             <Button 
                className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-semibold w-full sm:w-auto h-9 text-xs"
                onClick={() => setIsModalOpen(true)}
             >
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500 text-sm">
                    {searchTerm ? "No matching containers found." : "Waiting for Master Data..."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((cont) => (
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteContainer(cont.id)}
                          >
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* --- ADD CONTAINER MODAL --- */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-lg font-bold text-slate-900">Create Container</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Register new reusable packaging assets.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
                {/* Row 1: ID & Type */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Container ID *</Label>
                        <Input 
                            placeholder="e.g. IBC-2026-01" 
                            className="h-9"
                            value={formData.id}
                            onChange={e => setFormData({...formData, id: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Type *</Label>
                        <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="IBC">IBC Tank</SelectItem>
                                <SelectItem value="Drum">Steel Drum</SelectItem>
                                <SelectItem value="Pallet">Wooden Pallet</SelectItem>
                                <SelectItem value="Box">Plastic Tote</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Row 2: Capacity & UoM */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Max Capacity</Label>
                        <Input 
                            type="number"
                            className="h-9"
                            value={formData.capacity}
                            onChange={e => setFormData({...formData, capacity: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Unit</Label>
                        <Select value={formData.capacityUom} onValueChange={v => setFormData({...formData, capacityUom: v})}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="L">Liters</SelectItem>
                                <SelectItem value="KG">Kilograms</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Row 3: Tare & Status */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Tare Weight (KG)</Label>
                        <Input 
                            type="number"
                            className="h-9"
                            value={formData.tare}
                            onChange={e => setFormData({...formData, tare: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Cleaning Status</Label>
                        <Select value={formData.cleaning} onValueChange={v => setFormData({...formData, cleaning: v})}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Clean">Clean</SelectItem>
                                <SelectItem value="Dirty">Dirty</SelectItem>
                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold" onClick={handleSave}>Save Container</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}