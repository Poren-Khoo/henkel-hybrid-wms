import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import { PartnerValidator, PartnerValidationError } from '../../../../domain/partner/PartnerValidator'

const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_BusinessPartner"
const TOPIC_PARTNER = "Henkelv2/Shanghai/Logistics/MasterData/State/BusinessPartners"

export default function PartnerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, publish } = useGlobalUNS()
  const isNew = id === 'new'

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    roles: [],
    contactPerson: '',
    email: '',
    phone: '',
    city: '',
    status: 'Active'
  })

  // Load Partner Data
  useEffect(() => {
    if (!isNew && data.raw[TOPIC_PARTNER]) {
      const packet = data.raw[TOPIC_PARTNER]
      let partners = []
      
      // Unwrap UNS Envelope
      if (packet.topics && packet.topics[0] && Array.isArray(packet.topics[0].value)) {
        partners = packet.topics[0].value
      } else {
        partners = Array.isArray(packet) ? packet : packet.items || []
      }
      
      const found = partners.find(p => p.code === id)
      if (found) {
        setFormData({
          code: found.code || '',
          name: found.name || '',
          roles: Array.isArray(found.roles) ? found.roles : (found.roles ? [found.roles] : []),
          contactPerson: found.contactPerson || '',
          email: found.email || '',
          phone: found.phone || '',
          city: found.city || '',
          status: found.status || 'Active'
        })
      }
    }
  }, [id, isNew, data.raw])

  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const currentRoles = prev.roles || []
      const newRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role]
      return { ...prev, roles: newRoles }
    })
  }

  const handleSave = () => {
    try {
      // Use the validator
      PartnerValidator.validateAll(formData);
      
      const payload = { 
        type: isNew ? 'ADD' : 'UPDATE', 
        data: {
          code: formData.code,
          name: formData.name,
          roles: formData.roles,
          contactPerson: formData.contactPerson || '',
          email: formData.email || '',
          phone: formData.phone || '',
          city: formData.city || '',
          status: formData.status
        }
      }
      
      publish(TOPIC_ACTION, payload)
      navigate('/master/partners')
    } catch (error) {
      if (error instanceof PartnerValidationError) {
        alert(`Validation Error: ${error.message}`);
      } else {
        console.error("System Error:", error);
        alert("An unexpected system error occurred.");
      }
    }
  }

  return (
    <PageContainer title={isNew ? "New Business Partner" : `${formData.name} (${formData.code})`} subtitle="Manage partner information">
      
      <div className="mb-6 flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
        <Button variant="ghost" onClick={() => navigate('/master/partners')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Partners
        </Button>
        <Button className="bg-[#a3e635] text-slate-900 font-bold" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save Partner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 max-w-2xl">
          {/* Row 1: Code & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Partner Code *</Label>
              <Input 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value})} 
                disabled={!isNew}
                placeholder="e.g. SUP-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Partner Name *</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. ABC Manufacturing Co."
              />
            </div>
          </div>

          {/* Row 2: Roles */}
          <div className="space-y-2">
            <Label>Roles * (Select at least one)</Label>
            <div className="flex gap-4 pt-2">
              {['Supplier', 'Customer', 'Carrier'].map(role => (
                <div key={role} className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    className="accent-[#a3e635] h-4 w-4"
                    checked={formData.roles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                  />
                  <Label className="text-sm font-normal cursor-pointer">{role}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Contact Person & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input 
                value={formData.contactPerson} 
                onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="contact@example.com"
              />
            </div>
          </div>

          {/* Row 4: Phone & City */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+86 123 4567 8900"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input 
                value={formData.city} 
                onChange={e => setFormData({...formData, city: e.target.value})}
                placeholder="e.g. Shanghai"
              />
            </div>
          </div>

          {/* Row 5: Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                className="accent-[#a3e635] h-4 w-4"
                checked={formData.status === 'Active'}
                onChange={e => setFormData({...formData, status: e.target.checked ? 'Active' : 'Blocked'})}
              />
              <Label className="text-sm font-bold text-slate-900">Active</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
