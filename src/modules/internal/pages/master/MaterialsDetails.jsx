import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { ArrowLeft, Save, AlertTriangle, Box, ShieldCheck, Package } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import { MaterialValidator, MaterialValidationError } from '../../../../domain/material/MaterialValidator'

// MQTT TOPICS
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Material"
const TOPIC_MAT = "Henkelv2/Shanghai/Logistics/MasterData/State/Materials"

export default function MaterialDetail() {
  const { id } = useParams() // Capture the Code from URL (e.g. "ADH-001" or "new")
  const navigate = useNavigate()
  const { data, publish } = useGlobalUNS()
  const isNew = id === 'new'

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    code: '', 
    desc: '', 
    type: 'RM', 
    uom: 'KG', 
    shelf: '365', 
    hazard: 'None', 
    storage: 'Ambient', 
    fefo: true, 
    status: 'Active',
    batchManaged: true
  })

  // --- 1. LOAD DATA (If Editing) ---
  useEffect(() => {
    if (!isNew && data.raw[TOPIC_MAT]) {
      // Handle both array and object wrapper formats from UNS
      const materials = Array.isArray(data.raw[TOPIC_MAT]) 
        ? data.raw[TOPIC_MAT] 
        : data.raw[TOPIC_MAT].items || []
      
      const found = materials.find(m => m.code === id)
      
      if (found) {
        setFormData({
            ...found,
            // Data Cleaning: Convert "365 days" back to "365" for the input field
            shelf: found.shelf ? found.shelf.replace(/\D/g, '') : '365', 
            fefo: found.fefo === 'Active' // Convert string 'Active' to boolean true
        })
      }
    } else if (isNew) {
      // Reset if new
      setFormData({
        code: '', desc: '', type: 'RM', uom: 'KG', shelf: '365', 
        hazard: 'None', storage: 'Ambient', fefo: true, status: 'Active',
        batchManaged: true
      })
    }
  }, [id, isNew, data.raw])

  // --- 2. DDD HANDLER (The "Boss" Logic) ---
  const handleSave = () => {
    try {
      // STEP 1: VALIDATION (The Guard)
      // This throws an error if rules are violated
      MaterialValidator.validateAll(formData)
      
      // STEP 2: DTO CREATION (Data Transfer Object)
      // Transform clean domain data into the format the backend/MQTT expects
      const payload = {
        type: isNew ? 'ADD' : 'UPDATE',
        data: {
            ...formData,
            // Re-format for the legacy backend standard
            shelf: `${formData.shelf} days`, 
            fefo: formData.fefo ? 'Active' : 'Inactive'
        }
      }
      
      // Handle "Edit" specifics (Usually code is immutable in edits)
      if (!isNew) {
        payload.data.code = id
      }
      
      console.log("✅ DDD Validation Passed. Publishing:", payload)
      publish(TOPIC_ACTION, payload)
      
      // STEP 3: NAVIGATION
      navigate('/master/material') 
      
    } catch (error) {
      // STEP 4: EXCEPTION HANDLING
      if (error instanceof MaterialValidationError) {
        alert(`Validation Error: ${error.message}`) // Replace with Toast in future
      } else {
        console.error("System Error:", error)
        alert("An unexpected system error occurred.")
      }
    }
  }

  return (
    <PageContainer 
      title={isNew ? "New Material" : `Material: ${formData.code}`} 
      subtitle="Define material properties, safety rules, and storage logic"
    >
      
      {/* HEADER ACTIONS */}
      <div className="mb-6 flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
        <Button variant="ghost" onClick={() => navigate('/master/material')} className="text-slate-500">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
        </Button>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/master/material')}>Cancel</Button>
            <Button className="bg-[#a3e635] text-slate-900 font-bold hover:bg-[#8cd121]" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" /> Save Material
            </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-3xl bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="general">General Info</TabsTrigger>
          <TabsTrigger value="uom">UoM & Packaging</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Control</TabsTrigger>
          <TabsTrigger value="storage">Storage & Safety</TabsTrigger>
        </TabsList>

        {/* --- TAB 1: GENERAL INFO --- */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
                <CardDescription>Core identification for the material.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 max-w-4xl">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Material Code <span className="text-red-500">*</span></Label>
                        <Input 
                            placeholder="e.g. RESIN-001" 
                            value={formData.code} 
                            onChange={e => setFormData({...formData, code: e.target.value})} 
                            disabled={!isNew} // Lock code if editing
                            className="font-mono bg-slate-50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Material Type</Label>
                        <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RM">Raw Material (RM)</SelectItem>
                                <SelectItem value="SFG">Semi-Finished (Premix)</SelectItem>
                                <SelectItem value="FG">Finished Good (FG)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Description <span className="text-red-500">*</span></Label>
                    <Input 
                        placeholder="Official material name..." 
                        value={formData.desc} 
                        onChange={e => setFormData({...formData, desc: e.target.value})} 
                    />
                </div>
                <div className="space-y-2 w-1/2 pr-3">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Obsolete">Obsolete (Do Not Use)</SelectItem>
                            <SelectItem value="Review">Under Review</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: UoM --- */}
        <TabsContent value="uom">
          <Card>
            <CardHeader>
                <CardTitle className="text-base">Units of Measure</CardTitle>
            </CardHeader>
            <CardContent className="max-w-2xl">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Base Unit (Inventory)</Label>
                        <Select value={formData.uom} onValueChange={v => setFormData({...formData, uom: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="KG">KG - Kilogram</SelectItem>
                                <SelectItem value="L">L - Liter</SelectItem>
                                <SelectItem value="PCS">PCS - Pieces</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-500">All inventory calculations will use this unit.</p>
                    </div>
                    
                    <div className="space-y-2 opacity-60">
                        <Label>Order Unit (Purchase)</Label>
                        <Input disabled value="DR (Drum)" />
                        <p className="text-[10px] text-slate-500">Conversion logic coming in v2.0</p>
                    </div>
                </div>
            </CardContent>
          </Card>
          {/* 2. 包装规格 (新加的 - 代替 Option B) */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-indigo-500" />
          Packaging Specification
        </CardTitle>
        <CardDescription>Define how this material is packed for shipping.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-6">
        
        {/* 包装层级 */}
        <div className="space-y-2">
          <Label>Pack Level 1 (Inner)</Label>
          <Select defaultValue="Drum">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Drum">Steel Drum (200L)</SelectItem>
              <SelectItem value="JerryCan">Plastic Jerry Can (20L)</SelectItem>
              <SelectItem value="Bottle">Glass Bottle (1L)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 标签模板 (直接在这里选，不做复杂配置页) */}
        <div className="space-y-2">
          <Label>Label Template</Label>
          <Select defaultValue="GHS_Standard">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GHS_Standard">GHS Standard (Hazmat)</SelectItem>
              <SelectItem value="Generic_Shipping">Generic Shipping Label</SelectItem>
              <SelectItem value="Customer_Specific">Customer Compliance</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-500">
            Selected template will be used for auto-printing at end of production.
          </p>
        </div>

        {/* 码垛规则 */}
        <div className="space-y-2">
           <Label>Palletization (Ti-Hi)</Label>
           <div className="flex items-center gap-2">
             <Input placeholder="Ti (Layer)" className="w-20" />
             <span>x</span>
             <Input placeholder="Hi (Height)" className="w-20" />
           </div>
        </div>

      </CardContent>
    </Card>
</TabsContent>
    

        {/* --- TAB 3: INVENTORY --- */}
        <TabsContent value="inventory">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Box className="h-4 w-4 text-blue-500" /> Batch & Expiry Control
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 max-w-2xl">
                    <div className="flex items-center justify-between border p-4 rounded-lg bg-slate-50">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold text-slate-700">Batch Management Active</Label>
                            <p className="text-xs text-slate-500">Require Batch ID for all inbound/outbound moves</p>
                        </div>
                        <input 
                            type="checkbox" 
                            className="h-5 w-5 accent-blue-600 cursor-pointer" 
                            checked={formData.batchManaged} 
                            onChange={e => setFormData({...formData, batchManaged: e.target.checked})} 
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Shelf Life (Days)</Label>
                            <Input 
                                type="number" 
                                value={formData.shelf} 
                                onChange={e => setFormData({...formData, shelf: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Picking Strategy</Label>
                             <Select value={formData.fefo ? 'FEFO' : 'FIFO'} onValueChange={v => setFormData({...formData, fefo: v === 'FEFO'})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FEFO">FEFO (First Expired, First Out)</SelectItem>
                                    <SelectItem value="FIFO">FIFO (First In, First Out)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* --- TAB 4: STORAGE & SAFETY --- */}
        <TabsContent value="storage">
            <Card className="border-l-4 border-l-orange-400">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-orange-800">
                        <ShieldCheck className="h-5 w-5 text-orange-500" /> Safety & Compatibility
                    </CardTitle>
                    <CardDescription>
                        Critical safety data. Mismatches here will block putaway tasks.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-6 max-w-3xl">
                    <div className="space-y-2">
                        <Label>Hazard Classification</Label>
                        <Select value={formData.hazard} onValueChange={v => setFormData({...formData, hazard: v})}>
                            <SelectTrigger className="bg-orange-50/50 border-orange-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="None">None</SelectItem>
                                <SelectItem value="Flammable">Flammable (Class 3)</SelectItem>
                                <SelectItem value="Corrosive">Corrosive (Class 8)</SelectItem>
                                <SelectItem value="Toxic">Toxic (Class 6.1)</SelectItem>
                                <SelectItem value="Irritant">Irritant (Xi)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Storage Condition</Label>
                        <Select value={formData.storage} onValueChange={v => setFormData({...formData, storage: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ambient">Ambient (Room Temp)</SelectItem>
                                <SelectItem value="Cool">Cool (15-25°C)</SelectItem>
                                <SelectItem value="Cold">Cold (2-8°C)</SelectItem>
                                <SelectItem value="Frozen">Frozen (-18°C)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="col-span-2 bg-blue-50 p-3 rounded text-xs text-blue-700 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                            <strong>Note:</strong> Changing Hazard Class for an existing material with stock on hand 
                            may trigger a "Quarantine Block" on existing inventory until re-verified.
                        </span>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </PageContainer>
  )
}