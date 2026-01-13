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
import { Plus, Search, Edit2, Trash2, Filter, Download, AlertCircle } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_MAT = "Henkelv2/Shanghai/Logistics/MasterData/State/Materials"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Material"

export default function Materials() {
  const { data, publish } = useGlobalUNS()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    code: '',
    desc: '',
    uom: 'KG',
    shelf: '365',
    hazard: 'None',
    storage: 'Ambient',
    fefo: true,
    status: 'Active'
  })
// 1. GET LIVE DATA (Simplified - Context already unwraps envelope)
const materials = useMemo(() => {
  const packet = data.raw[TOPIC_MAT]
  if (!packet) return []

  // Node-RED sends Object -> Context unwraps -> We get the inner Array or Object
  // If it's an array, use it. If it's an object with 'items', use that.
  return Array.isArray(packet) ? packet : packet.items || []
}, [data.raw])

  // 2. FILTER LOGIC
  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials
    return materials.filter(m => 
      (m.code && m.code.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (m.desc && m.desc.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [materials, searchTerm])

  // 3. ACTIONS
  const handleSave = () => {
    if (!formData.code || !formData.desc) return alert("Code and Description are required")

    const payload = {
      type: 'ADD',
      data: { 
        ...formData,
        shelf: formData.shelf + " days", // Format for display
        fefo: formData.fefo ? 'Active' : 'Inactive'
      }
    }
    
    console.log("📤 Creating Material:", payload)
    publish(TOPIC_ACTION, payload)
    setIsModalOpen(false)
    
    // Reset Form
    setFormData({
        code: '', desc: '', uom: 'KG', shelf: '365', hazard: 'None', storage: 'Ambient', fefo: true, status: 'Active'
    })
  }

  const handleDeleteMaterial = (code) => {
    if(!window.confirm(`Delete material ${code}?`)) return
    publish(TOPIC_ACTION, { type: 'DELETE', data: { code } })
  }

  // HELPERS
  const getHazardBadge = (hazard) => {
    switch (hazard) {
      case 'Flammable': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Flammable</Badge>
      case 'Corrosive': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Corrosive</Badge>
      case 'Toxic': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Toxic</Badge>
      case 'Irritant': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Irritant</Badge>
      default: return <span className="text-slate-400 text-xs">-</span>
    }
  }

  return (
    <PageContainer title="Materials" subtitle="Manage material master data">
      <div className="space-y-4">
        
        {/* CONNECTION STATUS */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <UNSConnectionInfo topic={TOPIC_MAT} />
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search materials..." 
                className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Button 
            className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-semibold h-9 text-xs"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Material
          </Button>
        </div>

        {/* DATA TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material Code</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Description</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">UoM</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Shelf Life</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Hazard Class</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Storage</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">FEFO</TableHead>
                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500 text-sm">
                    {searchTerm ? "No matching materials found." : "Waiting for Master Data..."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaterials.map((item) => (
                  <TableRow key={item.code} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <TableCell className="font-mono font-bold text-slate-900 text-xs">{item.code}</TableCell>
                    <TableCell className="text-sm text-slate-700">{item.desc}</TableCell>
                    <TableCell className="text-xs text-slate-500">{item.uom}</TableCell>
                    <TableCell className="text-xs text-slate-500">{item.shelf}</TableCell>
                    <TableCell>{getHazardBadge(item.hazard)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <div className={`h-1.5 w-1.5 rounded-full ${item.storage === 'Cold' ? 'bg-blue-400' : 'bg-slate-300'}`} />
                        {item.storage}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.fefo === 'Active' && <Badge variant="outline" className="text-[10px] border-green-200 text-green-700 bg-green-50">Active</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteMaterial(item.code)}>
                          <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* --- ADD MATERIAL MODAL --- */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-lg font-bold text-slate-900">Create Material</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Define master data parameters. This controls putaway and safety logic.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
                {/* Row 1: Code & UoM */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Material Code *</Label>
                        <Input 
                            placeholder="e.g. ADH-001" 
                            className="h-9"
                            value={formData.code}
                            onChange={e => setFormData({...formData, code: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Unit of Measure *</Label>
                        <Select value={formData.uom} onValueChange={v => setFormData({...formData, uom: v})}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="KG">KG - Kilogram</SelectItem>
                                <SelectItem value="L">L - Liter</SelectItem>
                                <SelectItem value="PCS">PCS - Pieces</SelectItem>
                                <SelectItem value="DRUM">DR - Drum</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Row 2: Description */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Description *</Label>
                    <Input 
                        placeholder="Material description..." 
                        className="h-9"
                        value={formData.desc}
                        onChange={e => setFormData({...formData, desc: e.target.value})}
                    />
                </div>

                {/* Row 3: Shelf Life & Hazard */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Shelf Life (Days)</Label>
                        <Input 
                            type="number" 
                            className="h-9"
                            value={formData.shelf}
                            onChange={e => setFormData({...formData, shelf: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Hazard Class</Label>
                        <Select value={formData.hazard} onValueChange={v => setFormData({...formData, hazard: v})}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="None">None</SelectItem>
                                <SelectItem value="Flammable">Flammable</SelectItem>
                                <SelectItem value="Corrosive">Corrosive</SelectItem>
                                <SelectItem value="Toxic">Toxic</SelectItem>
                                <SelectItem value="Irritant">Irritant</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Row 4: Storage & FEFO */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Storage Condition</Label>
                        <Select value={formData.storage} onValueChange={v => setFormData({...formData, storage: v})}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ambient">Ambient</SelectItem>
                                <SelectItem value="Cool">Cool (15-25°C)</SelectItem>
                                <SelectItem value="Cold">Cold (2-8°C)</SelectItem>
                                <SelectItem value="Frozen">Frozen (-18°C)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between border border-slate-200 rounded-md p-3">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-semibold text-slate-900">Enable FEFO</Label>
                            <p className="text-[10px] text-slate-500">Force expiry-first picking</p>
                        </div>
                        {/* Simple Checkbox Fallback if Switch component missing */}
                        <input 
                            type="checkbox" 
                            className="accent-[#a3e635] h-5 w-5"
                            checked={formData.fefo}
                            onChange={e => setFormData({...formData, fefo: e.target.checked})}
                        />
                    </div>
                </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold" onClick={handleSave}>Save Material</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}