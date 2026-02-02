import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { Plus, Search, Building2, Filter } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

const TOPIC_PARTNER = "Henkelv2/Shanghai/Logistics/MasterData/State/BusinessPartners"

export default function PartnerList() {
  const { data } = useGlobalUNS()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  // 1. GET DATA
  const partners = useMemo(() => {
    const packet = data.raw[TOPIC_PARTNER]
    if (!packet) return []

    // Unwrap UNS Envelope
    if (packet.topics && packet.topics[0] && Array.isArray(packet.topics[0].value)) {
      return packet.topics[0].value
    }
    
    return Array.isArray(packet) ? packet : packet.items || []
  }, [data.raw])

  // 2. FILTER
  const filtered = useMemo(() => {
    let filtered = partners
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.city && p.city.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Role filter
    if (roleFilter) {
      filtered = filtered.filter(p => {
        const roles = Array.isArray(p.roles) ? p.roles : (p.roles ? [p.roles] : [])
        return roles.includes(roleFilter)
      })
    }
    
    return filtered
  }, [partners, searchTerm, roleFilter])

  // Helper: Get role badge color
  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'Supplier':
        return 'default'
      case 'Customer':
        return 'secondary'
      case 'Carrier':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <PageContainer title="Business Partners" subtitle="Manage suppliers, customers, and carriers">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <UNSConnectionInfo topic={TOPIC_PARTNER} />
        </div>

        {/* ACTION BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search partners..." 
                className="pl-9 h-9 text-sm bg-slate-50" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px] h-9 border-slate-200">
                <Filter className="h-4 w-4 mr-2 inline" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value="Supplier">Supplier</SelectItem>
                <SelectItem value="Customer">Customer</SelectItem>
                <SelectItem value="Carrier">Carrier</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-[#b2ed1d] text-slate-900 font-bold h-9 text-xs" onClick={() => navigate('/master/partner/new')}>
            <Plus className="h-4 w-4 mr-2" /> Add Partner
          </Button>
        </div>

        {/* DATA TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Code</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Name</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Roles</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">City</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Status</TableHead>
                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500 text-sm">
                    {searchTerm || roleFilter ? "No matching partners found." : "Waiting for Master Data..."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((partner) => {
                  const roles = Array.isArray(partner.roles) ? partner.roles : (partner.roles ? [partner.roles] : [])
                  return (
                    <TableRow 
                      key={partner.code} 
                      className="hover:bg-slate-50 cursor-pointer" 
                      onClick={() => navigate(`/master/partner/${partner.code}`)}
                    >
                      <TableCell className="font-mono font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" /> {partner.code}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">{partner.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.map((role, idx) => (
                            <Badge key={idx} variant={getRoleBadgeVariant(role)} className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">{partner.city || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={partner.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}>
                          {partner.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Manage</Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PageContainer>
  )
}
