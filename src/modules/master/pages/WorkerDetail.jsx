import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import { WorkerValidator, WorkerValidationError } from '../../../domain/worker/WorkerValidator'

// TOPICS
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Worker"
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/MasterData/State/Workers"

export default function WorkerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, publish } = useGlobalUNS()
  const isNew = id === 'new'

  // FORM STATE
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    role: 'Operator',
    authRole: 'OPERATOR',
    department: '',
    email: '',
    phone: '',
    status: 'Active'
  })

  // LOAD DATA (If Editing)
  useEffect(() => {
    if (!isNew && data.raw[TOPIC_STATE]) {
      const packet = data.raw[TOPIC_STATE]
      
      // Handle UNS envelope
      let workers = []
      if (packet.topics && packet.topics[0] && Array.isArray(packet.topics[0].value)) {
        workers = packet.topics[0].value
      } else {
        workers = Array.isArray(packet) ? packet : packet.items || []
      }
      
      const found = workers.find(worker => worker.code === id)
      if (found) {
        setFormData({
          code: found.code || '',
          name: found.name || '',
          role: found.role || 'Operator',
          authRole: found.authRole || 'OPERATOR',
          department: found.department || '',
          email: found.email || '',
          phone: found.phone || '',
          status: found.status || 'Active'
        })
      }
    } else if (isNew) {
      // Reset form for new worker
      setFormData({
        code: '',
        name: '',
        role: 'Operator',
        authRole: 'OPERATOR',
        department: '',
        email: '',
        phone: '',
        status: 'Active'
      })
    }
  }, [id, isNew, data.raw])

  // SAVE HANDLER
  const handleSave = () => {
    try {
      // STEP 1: VALIDATION
      WorkerValidator.validateAll(formData)
      
      // STEP 2: BUILD PAYLOAD (Directly in component - no service layer)
      const payload = {
        type: isNew ? 'ADD' : 'UPDATE',
        data: {
          code: formData.code,
          name: formData.name,
          role: formData.role,
          authRole: formData.authRole || null,
          department: formData.department || '',
          email: formData.email || '',
          phone: formData.phone || '',
          status: formData.status
        }
      }
      
      // Ensure code matches URL for updates
      if (!isNew) {
        payload.data.code = id
      }
      
      // STEP 3: PUBLISH
      publish(TOPIC_ACTION, payload)
      
      // STEP 4: NAVIGATE
      navigate(`/master/worker`)
      
    } catch (error) {
      // STEP 5: ERROR HANDLING
      if (error instanceof WorkerValidationError) {
        alert(`Validation Error: ${error.message}`)
      } else {
        console.error("System Error:", error)
        alert("An unexpected system error occurred.")
      }
    }
  }

  return (
    <PageContainer 
      title={isNew ? `New Worker` : `${formData.name} (${formData.code})`} 
      subtitle="Manage worker information"
    >
      {/* HEADER ACTIONS */}
      <div className="mb-6 flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
        <Button variant="ghost" onClick={() => navigate(`/master/worker`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
        </Button>
        <Button className="bg-[#b2ed1d] text-slate-900 font-bold" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Save Worker
        </Button>
      </div>

      {/* FORM */}
      <Card>
        <CardHeader>
          <CardTitle>Worker Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 max-w-2xl">
          {/* Row 1: Code & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Worker Code *</Label>
              <Input 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value})} 
                disabled={!isNew}
                placeholder="e.g. WKR-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Worker Name *</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. John Doe"
              />
            </div>
          </div>

          {/* Row 2: Role & Auth Role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Job Role *</Label>
              <Select 
                value={formData.role} 
                onValueChange={val => setFormData({...formData, role: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operator">Operator</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>System Permission</Label>
              <Select 
                value={formData.authRole || ''} 
                onValueChange={val => setFormData({...formData, authRole: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select permission..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATOR">OPERATOR</SelectItem>
                  <SelectItem value="APPROVER">APPROVER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="FINANCE">FINANCE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Department */}
          <div className="space-y-2">
            <Label>Department</Label>
            <Input 
              value={formData.department} 
              onChange={e => setFormData({...formData, department: e.target.value})}
              placeholder="e.g. Warehouse, Production"
            />
          </div>

          {/* Row 4: Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="e.g. john.doe@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="e.g. +86 138 0000 0000"
              />
            </div>
          </div>

          {/* Row 5: Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={val => setFormData({...formData, status: val})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
