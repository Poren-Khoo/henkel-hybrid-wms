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
import { MapPin, Plus, Edit2, Trash2, Search, Filter, Download, Snowflake, Sun } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_LOC = "Henkelv2/Shanghai/Logistics/MasterData/State/Locations"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Location"

export default function Locations() {
  const { data, publish } = useGlobalUNS()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  
  // Filter state
  const [filters, setFilters] = useState({
    wh: '',
    zone: '',
    type: '',
    temp: '',
    status: ''
  })

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    wh: 'WH01',
    zone: '',
    code: '',
    type: 'Storage',
    capacity: '1000',
    capacityUom: 'KG',
    temp: 'Ambient',
    utilization: '0',
    mixedMat: false,
    mixedBatch: false,
    status: true // true = Active
  })

  // 1. GET LIVE DATA
  const locations = useMemo(() => {
    const packet = data.raw[TOPIC_LOC]
    if (!packet) return []

    // Unwrap UNS Envelope
    if (packet.topics && packet.topics[0] && Array.isArray(packet.topics[0].value)) {
      return packet.topics[0].value
    }
    
    return Array.isArray(packet) ? packet : packet.items || []
  }, [data.raw])

  // 2. FILTER LOGIC
  const filtered = useMemo(() => {
    let filtered = locations
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(l => 
        (l.code && l.code.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (l.zone && l.zone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.type && l.type.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Advanced filters
    if (filters.wh) {
      filtered = filtered.filter(l => l.wh === filters.wh)
    }
    if (filters.zone) {
      filtered = filtered.filter(l => l.zone === filters.zone)
    }
    if (filters.type) {
      filtered = filtered.filter(l => l.type === filters.type)
    }
    if (filters.temp) {
      filtered = filtered.filter(l => l.temp === filters.temp)
    }
    if (filters.status) {
      filtered = filtered.filter(l => l.status === filters.status)
    }
    
    return filtered
  }, [locations, searchTerm, filters])

  // 3. ACTIONS
  const handleSave = () => {
    if (!formData.code || !formData.zone) return alert("Bin Code and Zone are required")

    // Format payload for Node-RED
    const payload = {
      type: editingLocation ? 'UPDATE' : 'ADD',
      data: { 
        code: editingLocation ? editingLocation.code : formData.code, 
        wh: formData.wh, 
        zone: formData.zone.toUpperCase(), 
        type: formData.type, 
        temp: formData.temp, 
        // Combine capacity number and unit for display (e.g., "1000 KG")
        capacity: `${formData.capacity} ${formData.capacityUom}`, 
        status: formData.status ? 'Active' : 'Maintenance',
        // Additional flags for logic
        allow_mixed_mat: formData.mixedMat,
        allow_mixed_batch: formData.mixedBatch
      }
    }
    
    publish(TOPIC_ACTION, payload)
    setIsModalOpen(false)
    setEditingLocation(null)
    
    // Reset Form (Optional: keep WH code for easier consecutive entry)
    if (!editingLocation) {
      setFormData(prev => ({
          ...prev, 
          code: '', 
          zone: '',
          utilization: '0'
      }))
    }
  }

  const handleEdit = (location) => {
    setEditingLocation(location)
    // Parse capacity (split "1000 KG" into number and unit)
    const capacityMatch = (location.capacity || '').match(/(\d+)\s*(.+)/)
    const capacityNum = capacityMatch ? capacityMatch[1] : '1000'
    const capacityUnit = capacityMatch ? capacityMatch[2] : 'KG'
    
    setFormData({
      wh: location.wh || 'WH01',
      zone: location.zone || '',
      code: location.code || '',
      type: location.type || 'Storage',
      capacity: capacityNum,
      capacityUom: capacityUnit,
      temp: location.temp || 'Ambient',
      utilization: '0',
      mixedMat: location.allow_mixed_mat || false,
      mixedBatch: location.allow_mixed_batch || false,
      status: location.status === 'Active'
    })
    setIsModalOpen(true)
  }

  const handleExport = () => {
    const headers = ['Bin Code', 'Warehouse', 'Zone', 'Type', 'Temp', 'Capacity', 'Status']
    const csvContent = [
      headers.join(','),
      ...filtered.map(l => [
        l.code || '',
        l.wh || '',
        l.zone || '',
        l.type || '',
        l.temp || '',
        l.capacity || '',
        l.status || ''
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `locations_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleClearFilters = () => {
    setFilters({ wh: '', zone: '', type: '', temp: '', status: '' })
    setSearchTerm('')
  }

  const handleDeleteLocation = (code) => {
    if(!window.confirm(`Delete location ${code}?`)) return
    publish(TOPIC_ACTION, { type: 'DELETE', data: { code } })
  }

  // HELPER: Temp Badge
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
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <UNSConnectionInfo topic={TOPIC_LOC} />
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search locations..." 
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors h-9 text-sm" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className="px-3 border-slate-200 text-slate-600 hover:bg-slate-50 h-9"
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
             <Button 
               variant="outline" 
               className="border-slate-200 text-slate-600 hover:bg-slate-50 hidden sm:flex h-9 text-xs"
               onClick={handleExport}
             >
               <Download className="h-4 w-4 mr-2" /> Export
             </Button>
             
             {/* Primary Action */}
             <Button 
                className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-semibold w-full sm:w-auto h-9 text-xs"
                onClick={() => {
                  setEditingLocation(null)
                  setIsModalOpen(true)
                }}
             >
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500 text-sm">
                    {searchTerm ? "No matching locations found." : "Waiting for Master Data..."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((loc) => (
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                            onClick={() => handleEdit(loc)}
                          >
                              <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteLocation(loc.code)}
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

        {/* --- ADD LOCATION MODAL --- */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-white">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-lg font-bold text-slate-900">{editingLocation ? 'Edit Location' : 'Create Location'}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Define warehouse topology. This controls inventory placement strategies.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
                {/* Row 1: WH & Zone */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Warehouse Code *</Label>
                        <Input 
                            className="h-9"
                            value={formData.wh}
                            onChange={e => setFormData({...formData, wh: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Zone *</Label>
                        <Input 
                            placeholder="e.g. A, B, COLD"
                            className="h-9"
                            value={formData.zone}
                            onChange={e => setFormData({...formData, zone: e.target.value})}
                        />
                    </div>
                </div>

                {/* Row 2: Bin Code & Type */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Bin Code *</Label>
                        <Input 
                            placeholder="e.g. A-01-01" 
                            className="h-9"
                            value={formData.code}
                            onChange={e => setFormData({...formData, code: e.target.value})}
                            disabled={!!editingLocation}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Bin Type *</Label>
                        <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Storage">Storage</SelectItem>
                                <SelectItem value="Receiving">Receiving</SelectItem>
                                <SelectItem value="Production">Production</SelectItem>
                                <SelectItem value="QA Hold">QA Hold</SelectItem>
                                <SelectItem value="Picking">Picking Face</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Row 3: Capacity & UoM */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Capacity</Label>
                        <Input 
                            type="number"
                            className="h-9"
                            value={formData.capacity}
                            onChange={e => setFormData({...formData, capacity: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Capacity UoM</Label>
                        <Select value={formData.capacityUom} onValueChange={v => setFormData({...formData, capacityUom: v})}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="KG">KG</SelectItem>
                                <SelectItem value="PALLET">Pallet Positions</SelectItem>
                                <SelectItem value="M3">Cubic Meters</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Row 4: Temp & Util */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Temperature Condition</Label>
                        <Select value={formData.temp} onValueChange={v => setFormData({...formData, temp: v})}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ambient">Ambient</SelectItem>
                                <SelectItem value="Cool">Cool</SelectItem>
                                <SelectItem value="Cold">Cold</SelectItem>
                                <SelectItem value="Frozen">Frozen</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Current Utilization</Label>
                        <Input 
                            disabled
                            className="h-9 bg-slate-50"
                            value={formData.utilization}
                        />
                    </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            className="accent-[#a3e635] h-4 w-4"
                            checked={formData.mixedMat}
                            onChange={e => setFormData({...formData, mixedMat: e.target.checked})}
                        />
                        <Label className="text-xs text-slate-600">Allow Mixed Materials</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            className="accent-[#a3e635] h-4 w-4"
                            checked={formData.mixedBatch}
                            onChange={e => setFormData({...formData, mixedBatch: e.target.checked})}
                        />
                        <Label className="text-xs text-slate-600">Allow Mixed Batches</Label>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <input 
                            type="checkbox" 
                            className="accent-[#a3e635] h-4 w-4"
                            checked={formData.status}
                            onChange={e => setFormData({...formData, status: e.target.checked})}
                        />
                        <Label className="text-xs font-bold text-slate-900">Active</Label>
                    </div>
                </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={() => {
                setIsModalOpen(false)
                setEditingLocation(null)
              }}>Cancel</Button>
              <Button className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold" onClick={handleSave}>
                {editingLocation ? 'Update Location' : 'Save Location'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- FILTER DIALOG --- */}
        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogContent className="sm:max-w-[400px] bg-white">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <DialogTitle className="text-lg font-bold text-slate-900">Filter Locations</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Filter locations by various criteria
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Warehouse</Label>
                <Select value={filters.wh} onValueChange={v => setFilters({...filters, wh: v})}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All warehouses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {Array.from(new Set(locations.map(l => l.wh))).map(wh => (
                      <SelectItem key={wh} value={wh}>{wh}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Zone</Label>
                <Select value={filters.zone} onValueChange={v => setFilters({...filters, zone: v})}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All zones" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {Array.from(new Set(locations.map(l => l.zone))).map(zone => (
                      <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Type</Label>
                <Select value={filters.type} onValueChange={v => setFilters({...filters, type: v})}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="Storage">Storage</SelectItem>
                    <SelectItem value="Receiving">Receiving</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="QA Hold">QA Hold</SelectItem>
                    <SelectItem value="Picking">Picking Face</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Temperature</Label>
                <Select value={filters.temp} onValueChange={v => setFilters({...filters, temp: v})}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All temperatures" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="Ambient">Ambient</SelectItem>
                    <SelectItem value="Cool">Cool</SelectItem>
                    <SelectItem value="Cold">Cold</SelectItem>
                    <SelectItem value="Frozen">Frozen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={handleClearFilters}>Clear All</Button>
              <Button variant="ghost" onClick={() => setIsFilterOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}