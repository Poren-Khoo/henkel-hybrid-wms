import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Plus, Search, MapPin, Factory } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

const TOPIC_WH = "Henkelv2/Shanghai/Logistics/MasterData/State/Warehouses"

export default function WarehouseList() {
  const { data } = useGlobalUNS()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  // 1. GET DATA
  const warehouses = useMemo(() => {
    const packet = data.raw[TOPIC_WH]
    if (!packet) return []
    const list = Array.isArray(packet) ? packet : (packet.items ?? [])
    return Array.isArray(list) ? list : []
  }, [data.raw])

  // 2. FILTER
  const filtered = warehouses.filter(w => 
    w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <PageContainer title="Network Topology" subtitle="Manage physical warehouses and plants">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <UNSConnectionInfo topic={TOPIC_WH} />
        </div>

        {/* ACTION BAR */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search warehouses..." 
              className="pl-9 h-9 text-sm bg-slate-50" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="bg-[#b2ed1d] text-slate-900 font-bold h-9 text-xs" onClick={() => navigate('/master/warehouse/new')}>
            <Plus className="h-4 w-4 mr-2" /> Add Warehouse
          </Button>
        </div>

        {/* DATA TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Warehouse Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500 text-sm">
                    {searchTerm ? "No matching warehouses found." : "Waiting for Master Data..."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((wh) => (
                <TableRow 
                    key={wh.code} 
                    className="hover:bg-slate-50 cursor-pointer" 
                    onClick={() => navigate(`/master/warehouse/${wh.code}`)}
                >
                  <TableCell className="font-mono font-bold text-slate-900 flex items-center gap-2">
                    <Factory className="h-4 w-4 text-slate-400" /> {wh.code}
                  </TableCell>
                  <TableCell>{wh.name}</TableCell>
                  <TableCell><Badge variant="secondary">{wh.type}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="outline" className={wh.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}>
                        {wh.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Manage</Button>
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