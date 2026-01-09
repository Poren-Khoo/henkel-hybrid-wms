import React, { useState, useMemo, useEffect } from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../../../../components/ui/table'
import { Card } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { 
  Search, Filter, MapPin, Package, Box, X 
} from 'lucide-react'
// Added Select components for filtering
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { useGlobalUNS } from '../../../../context/UNSContext'
import PageContainer from '../../../../components/PageContainer'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// CRITICAL: DO NOT CHANGE
const TOPIC_INVENTORY = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"

export default function InventoryList() {
  const { data } = useGlobalUNS()
  
  // --- STATE FOR FILTERS ---
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [materialFilter, setMaterialFilter] = useState("ALL")
  
  // CRITICAL: DATA ACCESS PATTERN (DO NOT CHANGE)
  useEffect(() => {
    const rawData = data.raw[TOPIC_INVENTORY]
    // Debug logic preserved
    // console.log('🔍 [InventoryList] Data Update:', !!rawData) 
  }, [data.raw])

  // CRITICAL: DATA MAPPING LOGIC (DO NOT CHANGE)
  const stockItems = useMemo(() => {
    const rawData = data.raw[TOPIC_INVENTORY]
    const rawItems = Array.isArray(rawData) ? rawData : rawData?.stock_items || rawData?.items || rawData?.inventory || []
    
    return Array.isArray(rawItems) ? rawItems.map((item, index) => ({
      hu: item.hu || item.handling_unit || item.handlingUnit || item.hu_id || item.inv_id || `INV-${Date.now()}-${index}`,
      batch_id: item.batch_id || item.batch || item.batchId || 'N/A',
      sku: item.sku || item.material || item.material_code || item.materialCode || 'N/A',
      desc: item.desc || item.description || item.material_name || item.materialName || '',
      qty: item.qty || item.quantity || item.qty_available || item.qtyAvailable || '0',
      status: item.status || item.inventory_status || item.inventoryStatus || 'AVAILABLE',
      location: item.location || item.bin || item.bin_location || item.binLocation || 'N/A',
      supplier: item.supplier || item.supplier_lot || item.supplierLot || 'N/A',
      expiry_date: item.expiry_date || item.expiry || item.expiryDate || null
    })) : []
  }, [data.raw])

  // --- DERIVED DATA FOR FILTERS ---
  // Get unique list of materials for the dropdown
  const uniqueMaterials = useMemo(() => {
    const mats = stockItems.map(i => i.sku).filter(m => m && m !== 'N/A');
    return [...new Set(mats)];
  }, [stockItems]);

  // --- FILTERING LOGIC (UPDATED) ---
  const filteredItems = useMemo(() => {
    return stockItems.filter(item => {
      // 1. Search Term Logic
      const matchesSearch = !searchTerm || (
        (item.hu && item.hu.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.desc && item.desc.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.batch_id && item.batch_id.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      // 2. Status Filter Logic
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

      // 3. Material Filter Logic
      const matchesMaterial = materialFilter === "ALL" || item.sku === materialFilter;

      return matchesSearch && matchesStatus && matchesMaterial;
    })
  }, [stockItems, searchTerm, statusFilter, materialFilter])

  // Reset function
  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("ALL")
    setMaterialFilter("ALL")
  }

  // HELPER: Semantic Status Badges
  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase()
    switch (s) {
      case 'AVAILABLE': 
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-sm">Available</Badge>
      case 'QUARANTINE': 
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-sm">Quarantine</Badge>
      case 'QC_FAILED': 
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-sm">QC Failed</Badge>
      case 'ALLOCATED': 
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-sm">Allocated</Badge>
      case 'RELEASED_TO_PRODUCTION': 
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 rounded-sm">In Prod</Badge>
      default: 
        return <Badge variant="outline" className="text-slate-500 border-slate-200 rounded-sm">{s.replace(/_/g, " ")}</Badge>
    }
  }

  return (
    <PageContainer title="Inventory List" subtitle="View and manage inventory units">
      <div className="space-y-4">
        
        {/* CONNECTION STATUS */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <UNSConnectionInfo topic={TOPIC_INVENTORY} />
        </div>

        {/* ACTION BAR (FILTERS) */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search Inv ID, Material, Supplier..." 
              className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
             
             {/* Status Filter */}
             <Select value={statusFilter} onValueChange={setStatusFilter}>
               <SelectTrigger className="w-[160px] h-9 text-xs border-slate-200 text-slate-600 bg-white">
                 <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" /> 
                 <SelectValue placeholder="Status" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="ALL">All Statuses</SelectItem>
                 <SelectItem value="AVAILABLE">Available</SelectItem>
                 <SelectItem value="QUARANTINE">Quarantine</SelectItem>
                 <SelectItem value="QC_FAILED">QC Failed</SelectItem>
                 <SelectItem value="ALLOCATED">Allocated</SelectItem>
               </SelectContent>
             </Select>

             {/* Material Filter */}
             <Select value={materialFilter} onValueChange={setMaterialFilter}>
               <SelectTrigger className="w-[160px] h-9 text-xs border-slate-200 text-slate-600 bg-white">
                 <Package className="h-3.5 w-3.5 mr-2 text-slate-400" />
                 <SelectValue placeholder="Material" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="ALL">All Materials</SelectItem>
                 {uniqueMaterials.map(mat => (
                   <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                 ))}
               </SelectContent>
             </Select>

             {/* Clear Filters Button (Shows only if filters active) */}
             {(searchTerm || statusFilter !== "ALL" || materialFilter !== "ALL") && (
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={clearFilters}
                 className="h-9 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
               >
                 <X className="h-4 w-4 mr-1" /> Clear
               </Button>
             )}
          </div>
        </div>

        {/* DATA TABLE */}
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Inv ID / HU</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material Info</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Supplier Lot</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Quantity</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Location</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Expiry</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data.raw[TOPIC_INVENTORY] ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-700">Connecting to Live Stream...</p>
                        <p className="text-xs text-slate-400">Waiting for MQTT payload</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3 py-8">
                      <Box className="h-10 w-10 text-slate-200" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">No inventory found</p>
                        <p className="text-xs text-slate-400">
                          {(searchTerm || statusFilter !== "ALL" || materialFilter !== "ALL") 
                            ? 'No items match current filters' 
                            : 'Your warehouse appears to be empty'}
                        </p>
                        {(searchTerm || statusFilter !== "ALL" || materialFilter !== "ALL") && (
                          <Button variant="link" onClick={clearFilters} className="text-[#a3e635] text-xs h-auto p-0">Clear Filters</Button>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.hu} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                    <TableCell className="align-top py-3">
                      <div className="font-mono font-bold text-slate-700 text-xs">{item.hu}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.batch_id}</div>
                    </TableCell>
                    <TableCell className="align-top py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-sm">{item.desc}</span>
                        <span className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-3 text-slate-500 text-xs font-mono">
                      {item.supplier || "N/A"}
                    </TableCell>
                    <TableCell className="align-top py-3 font-bold text-slate-900 text-sm">
                      {item.qty} <span className="text-[10px] font-normal text-slate-500 ml-0.5">KG</span>
                    </TableCell>
                    <TableCell className="align-top py-3">
                      <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100">
                        <MapPin className="h-3 w-3 text-slate-400" /> {item.location}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-3 text-slate-500 text-xs">
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="align-top py-3">
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell className="align-top py-3 text-right">
                      {item.status === 'ALLOCATED' && (
                         <Badge variant="outline" className="text-[9px] text-blue-600 border-blue-200 bg-blue-50 px-1.5 py-0 rounded-sm">
                           ALLOCATED
                         </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PageContainer>
  )
}