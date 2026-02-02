import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import { WarehouseValidator, WarehouseValidationError } from '../../../../domain/warehouse/WarehouseValidator'
import LocationsTable from './components/LocationsTable' 

const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Warehouse"
const TOPIC_WH = "Henkelv2/Shanghai/Logistics/MasterData/State/Warehouses"

export default function WarehouseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, publish } = useGlobalUNS()
  const isNew = id === 'new'

  const [formData, setFormData] = useState({
    code: '', name: '', type: 'Plant', address: '', status: 'Active'
  })

  // Load Warehouse Data
  useEffect(() => {
    if (!isNew && data.raw[TOPIC_WH]) {
      const list = Array.isArray(data.raw[TOPIC_WH]) ? data.raw[TOPIC_WH] : data.raw[TOPIC_WH].items || []
      const found = list.find(w => w.code === id)
      if (found) setFormData(found)
    }
  }, [id, isNew, data.raw])

  const handleSave = () => {
    try {
      // Use the validator
      WarehouseValidator.validateAll(formData);
      
      const payload = { type: isNew ? 'ADD' : 'UPDATE', data: formData }
      publish(TOPIC_ACTION, payload)
      navigate('/master/warehouses')
    } catch (error) {
      if (error instanceof WarehouseValidationError) {
        alert(`Validation Error: ${error.message}`);
      } else {
        console.error("System Error:", error);
        alert("An unexpected system error occurred.");
      }
    }
  }

  return (
    <PageContainer title={isNew ? "New Warehouse" : `${formData.name} (${formData.code})`} subtitle="Configure facility rules">
      
      <div className="mb-6 flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
        <Button variant="ghost" onClick={() => navigate('/master/warehouses')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Network
        </Button>
        <Button className="bg-[#b2ed1d] text-slate-900 font-bold" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save Configuration
        </Button>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="zones">Zones & Areas</TabsTrigger>
          <TabsTrigger value="locations">Bin Locations</TabsTrigger>
        </TabsList>

        {/* TAB 1: BASIC INFO */}
        <TabsContent value="basic">
          <Card>
            <CardHeader><CardTitle>Facility Details</CardTitle></CardHeader>
            <CardContent className="grid gap-6 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Warehouse Code</Label>
                        <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} disabled={!isNew} />
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Plant">Manufacturing Plant</SelectItem>
                                <SelectItem value="Distribution Center">Distribution Center</SelectItem>
                                <SelectItem value="Returns">Returns Center</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Warehouse Name</Label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ZONES & AREAS (Placeholder) */}
        <TabsContent value="zones">
          <Card>
            <CardHeader><CardTitle>Zones & Areas</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Zone management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: LOCATIONS (The integration of your old page) */}
        <TabsContent value="locations">
            {/* We pass the warehouse code to this table component 
                so it ONLY shows locations for THIS warehouse.
                For new warehouses, use formData.code if available, otherwise null.
            */}
            <LocationsTable warehouseCode={isNew ? (formData.code || null) : id} /> 
        </TabsContent>

      </Tabs>
    </PageContainer>
  )
}