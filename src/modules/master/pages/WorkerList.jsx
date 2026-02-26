import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Plus, Search, Trash2 } from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/MasterData/State/Workers"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Worker"

export default function WorkerList() {
  const { data, publish } = useGlobalUNS()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({ role: '', status: '' })

  // 1. GET LIVE DATA
  const workers = useMemo(() => {
    const packet = data.raw[TOPIC_STATE]
    if (!packet) return []
    
    // Handle UNS envelope
    if (packet.topics?.[0] && Array.isArray(packet.topics[0].value)) {
      return packet.topics[0].value
    }
    const list = Array.isArray(packet) ? packet : (packet.items ?? [])
    return Array.isArray(list) ? list : []
  }, [data.raw])

  // 2. FILTER LOGIC
  const filtered = useMemo(() => {
    let filtered = workers
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(worker => 
        (worker.code && worker.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (worker.name && worker.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (worker.email && worker.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Advanced filters
    if (filters.role) {
      filtered = filtered.filter(worker => worker.role === filters.role)
    }
    if (filters.status) {
      filtered = filtered.filter(worker => worker.status === filters.status)
    }
    
    return filtered
  }, [workers, searchTerm, filters])

  // 3. ACTIONS
  const handleEdit = (worker) => {
    navigate(`/master/worker/${worker.code}`)
  }

  const handleAdd = () => {
    navigate(`/master/worker/new`)
  }

  const handleDelete = (code) => {
    if (!window.confirm(`Delete worker ${code}?`)) return
    publish(TOPIC_ACTION, { type: 'DELETE', data: { code } })
  }

  const getRoleBadge = (role) => {
    const colors = {
      'Operator': 'bg-blue-50 text-blue-700 border-blue-200',
      'Supervisor': 'bg-purple-50 text-purple-700 border-purple-200',
      'Manager': 'bg-green-50 text-green-700 border-green-200',
      'Admin': 'bg-red-50 text-red-700 border-red-200'
    }
    return (
      <Badge variant="outline" className={colors[role] || 'bg-slate-50 text-slate-700'}>
        {role}
      </Badge>
    )
  }

  return (
    <PageContainer title="Worker Master" subtitle="Manage warehouse workers and operators">
      <div className="space-y-4">
        {/* CONNECTION STATUS */}
        <UNSConnectionInfo topic={TOPIC_STATE} />

        {/* ACTION BAR */}
        <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search workers..." 
                className="pl-9 h-9 text-sm bg-slate-50" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button className="bg-[#b2ed1d] text-slate-900 font-bold h-9 text-xs" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" /> Add Worker
            </Button>
          </div>
        </div>

        {/* DATA TABLE */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Worker Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Job Role</TableHead>
                <TableHead>System Permission</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                    No workers found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((worker) => (
                  <TableRow 
                    key={worker.code} 
                    className="hover:bg-slate-50 cursor-pointer" 
                    onClick={() => handleEdit(worker)}
                  >
                    <TableCell className="font-mono font-bold text-slate-900">{worker.code}</TableCell>
                    <TableCell>{worker.name}</TableCell>
                    <TableCell>{getRoleBadge(worker.role)}</TableCell>
                    <TableCell>
                      {worker.authRole ? (
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                          {worker.authRole}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{worker.email || '-'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{worker.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={worker.status === 'Active' ? 'default' : 'secondary'}>
                        {worker.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDelete(worker.code); 
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                      </Button>
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
