import React, { useState, useMemo, useEffect } from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../../../../components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { 
  Search, Filter, MapPin, Calendar, Package, Box 
} from 'lucide-react'
import { useGlobalUNS } from '../../../../context/UNSContext'
import PageContainer from '../../../../components/PageContainer'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

const TOPIC_INVENTORY = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"

export default function InventoryList() {
  const { data } = useGlobalUNS()
  const [searchTerm, setSearchTerm] = useState("")
  
  // DEBUG: Track when MQTT data arrives
  useEffect(() => {
    const rawData = data.raw[TOPIC_INVENTORY]
    console.log('🔍 [InventoryList] useEffect - Data changed:', {
      hasData: !!rawData,
      dataType: typeof rawData,
      isArray: Array.isArray(rawData),
      keys: rawData ? Object.keys(rawData) : [],
      topic: TOPIC_INVENTORY,
      allTopics: Object.keys(data.raw)
    })
  }, [data.raw])

  // 1. Get Live Data from MQTT and map backend fields
  const stockItems = useMemo(() => {
    const rawData = data.raw[TOPIC_INVENTORY]
    
    // Debug logging
    console.log('📊 [InventoryList] Raw MQTT Data:', rawData)
    console.log('📊 [InventoryList] Stock Raw Data:', rawData)
    
    // Handle different data structures
    // Backend sends: array of objects with keys: hu, batch_id, sku, desc, qty, status, location
    const rawItems = Array.isArray(rawData) 
      ? rawData 
      : rawData?.stock_items || rawData?.items || rawData?.inventory || []
    
    // Map backend fields to frontend structure
    // Backend: hu, batch_id, sku, desc, qty, status, location
    const mappedItems = Array.isArray(rawItems) ? rawItems.map((item, index) => ({
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
    
    return mappedItems
  }, [data.raw])

  // 2. Filter Logic
  const filteredItems = useMemo(() => {
    if (!searchTerm) return stockItems
    
    return stockItems.filter(item => 
      (item.hu && item.hu.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.desc && item.desc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.batch_id && item.batch_id.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [stockItems, searchTerm])

  // Helper for Status Badge
  const getStatusBadge = (status) => {
    const styles = {
      'AVAILABLE': 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200',
      'QUARANTINE': 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200',
      'QC_FAILED': 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200',
      'ALLOCATED': 'bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200',
      'RELEASED_TO_PRODUCTION': 'bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200'
    }
    return (
      <Badge variant="secondary" className={styles[status] || 'bg-slate-100 text-slate-700'}>
        {status.replace(/_/g, " ")}
      </Badge>
    )
  }

  return (
    <PageContainer title="Inventory List" subtitle="View and manage inventory units">
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_INVENTORY} />

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search Inv ID, Material, Supplier..." 
              className="pl-9 bg-slate-50 border-slate-200"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
             <Button variant="outline" className="gap-2">
               <Filter className="h-4 w-4" /> All Statuses
             </Button>
             <Button variant="outline" className="gap-2">
               <Package className="h-4 w-4" /> All Materials
             </Button>
          </div>
        </div>

        {/* MAIN TABLE */}
        <Card className="shadow-sm border-slate-200">
          <div className="rounded-md">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Inv ID</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Supplier Lot</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Allocated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data.raw[TOPIC_INVENTORY] ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3 py-8">
                        <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                        <div className="space-y-1">
                          <p className="font-medium text-slate-700">Loading Inventory...</p>
                          <p className="text-xs text-slate-400">Waiting for MQTT data from backend</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2 py-8">
                        <Box className="h-8 w-8 text-slate-300" />
                        <p className="font-medium text-slate-600">No inventory found</p>
                        <p className="text-xs text-slate-400">
                          {searchTerm ? 'No items match your search' : 'No inventory items available'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.hu} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono font-medium text-slate-700">
                        {item.hu}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{item.desc}</span>
                          <span className="text-xs text-slate-500">{item.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {item.supplier || "N/A"}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {item.qty} kg
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-600">
                          <MapPin className="h-3 w-3" /> {item.location}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                         {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell>
                        {/* Simulation: If allocated, show badge */}
                        {item.status === 'ALLOCATED' && (
                           <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                             Allocated
                           </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}