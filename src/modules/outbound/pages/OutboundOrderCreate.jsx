import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageContainer from '../../../components/PageContainer'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../../components/ui/table'
import { Trash2, Plus } from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import { WarehouseSelect } from '../../../components/selectors/WarehouseSelect'
import { MaterialSelect } from '../../../components/selectors/Material'
import { WorkerSelect } from '../../../components/selectors/WorkerSelect'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { OutboundOrderService } from '../../../domain/outbound/OutboundOrderService'
import { OutboundOrderValidator, OutboundOrderValidationError } from '../../../domain/outbound/OutboundOrderValidator'
import { useAuth } from '../../../context/AuthContext'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs'

const TOPIC_CREATE_ACTION = 'Henkelv2/Shanghai/Logistics/Outbound/Action/Create_Order'
const TOPIC_COST_DB = 'Henkelv2/Shanghai/Logistics/Costing/State/DN_Workflow_DB'
const TOPIC_SYNC_STATUS = 'Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status'
const TOPIC_SHIPMENT_LIST = 'Henkelv2/Shanghai/Logistics/Outbound/State/Shipment_List'

const INITIAL_FORM_STATE = {
  type: 'SALES_ORDER',
  warehouse: 'WH01',
  requestedDate: new Date().toLocaleDateString('en-CA'),
  priority: 'NORMAL',
  customer: '',
  shipToAddress: '',
  destination: '',
  // Operator is selected from Worker master data; start empty so user must choose
  operator: '',
  lines: [{ code: '', qty: '100' }]
}

export default function OutboundOrderCreate() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { data, publish } = useGlobalUNS()
  const { user } = useAuth()

  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [activeTab, setActiveTab] = useState('header')
  const [draftAvailable, setDraftAvailable] = useState(false)

  // --- PHASE 1 (optional): load existing order when editing ---
  useEffect(() => {
    if (isNew || !id) return

    // 1. Get costing orders
    const rawCostDNs = Array.isArray(data.dns) ? data.dns : []

    // 2. Unwrap sync status
    const syncRaw = data.raw?.[TOPIC_SYNC_STATUS]
    let syncPacket = syncRaw
    if (syncRaw?.topics && Array.isArray(syncRaw.topics) && syncRaw.topics.length > 0) {
      syncPacket = syncRaw.topics[0].value || syncRaw.topics[0]
    }
    const syncRecords = Array.isArray(syncPacket)
      ? syncPacket
      : syncPacket?.sync_records || syncPacket?.items || []

    // 3. Unwrap shipment list
    const shipmentRaw = data.raw?.[TOPIC_SHIPMENT_LIST]
    let shipmentPacket = shipmentRaw
    if (shipmentRaw?.topics && Array.isArray(shipmentRaw.topics) && shipmentRaw.topics.length > 0) {
      shipmentPacket = shipmentRaw.topics[0].value || shipmentRaw.topics[0]
    }
    const rawShipments = Array.isArray(shipmentPacket)
      ? shipmentPacket
      : shipmentPacket?.items || shipmentPacket?.shipments || []

    // 4. Normalize & merge (reuse service logic)
    const costingOrders = rawCostDNs
      .map(dn => OutboundOrderService.normalizeOrder(dn, 'costing'))
      .filter(o => o && o.id === id)

    const syncOrders = syncRecords
      .map(r => OutboundOrderService.normalizeOrder(r, 'sync'))
      .filter(o => o && o.id === id)

    const shipmentOrders = rawShipments
      .map(s => OutboundOrderService.normalizeOrder(s, 'shipment'))
      .filter(o => o && o.id === id)

    const merged = OutboundOrderService.mergeOrders(costingOrders, syncOrders, shipmentOrders)

    if (merged.length > 0) {
      const order = merged[0]
      setFormData(prev => ({
        ...prev,
        type: order.type || 'SALES_ORDER',
        warehouse: prev.warehouse, // not available from order yet
        requestedDate: prev.requestedDate,
        customer: order.customer || '',
        destination: order.destination || '',
        operator: prev.operator
        // lines: keep default for now; Phase 2/3 can hydrate from items
      }))
    }
  }, [isNew, id, data])

  // --- PHASE 2: local draft saving (frontend-only) ---
  useEffect(() => {
    if (!isNew || !user?.id) return

    const key = `outbound_order_draft_${user.id}`
    const stored = localStorage.getItem(key)
    if (stored) {
      setDraftAvailable(true)
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user?.id) return
    if (!isNew) return

    const key = `outbound_order_draft_${user.id}`
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(formData))
      } catch (e) {
        console.warn('Failed to save outbound order draft:', e)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData, user, isNew])

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error only for the field being edited
    setValidationErrors(prev => {
      if (!prev || !prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const updateLine = (idx, field, value) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) =>
        i === idx ? { ...line, [field]: value } : line
      )
    }))
    setValidationErrors({})
  }

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { code: '', qty: '100' }]
    }))
  }

  const removeLine = idx => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx)
    }))
  }

  const draftStorageKey = user?.id ? `outbound_order_draft_${user.id}` : null

  const handleCancel = () => {
    navigate('/outbound')
  }

  const handleRestoreDraft = () => {
    if (!draftStorageKey) return
    const stored = localStorage.getItem(draftStorageKey)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === 'object') {
        setFormData(parsed)
        setDraftAvailable(false)
        setValidationErrors({})
      }
    } catch {
      // ignore parse errors
    }
  }

  const handleSaveDraft = () => {
    if (!draftStorageKey) return
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(formData))
      setDraftAvailable(true)
      // lightweight feedback without introducing a toast dependency
      // eslint-disable-next-line no-alert
      alert('Draft saved locally for this user.')
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Failed to save draft. Please try again.')
      // keep console log for debugging
      // eslint-disable-next-line no-console
      console.warn('Failed to save outbound order draft:', e)
    }
  }

  const handleTabChange = (nextTab) => {
    if (nextTab === 'lines') {
      const errors = OutboundOrderValidator.collectCreateErrors(formData)
      const headerFields = ['type', 'warehouse', 'requestedDate']
      if (formData.type === 'SALES_ORDER') {
        headerFields.push('customer')
      } else if (formData.type === 'TRANSFER_OUT') {
        headerFields.push('destination')
      }

      const hasHeaderErrors = headerFields.some(field => !!errors[field])

      if (hasHeaderErrors) {
        setValidationErrors(errors)
        setActiveTab('header')
        return
      }
    }

    setActiveTab(nextTab)
  }

  const handleConfirmCreate = () => {
    const errors = OutboundOrderValidator.collectCreateErrors(formData)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      setActiveTab('header')
      return
    }

    try {
      setIsSubmitting(true)

      const payload = OutboundOrderService.buildCreateCommand(formData)

      publish(TOPIC_CREATE_ACTION, payload)

      // Clear any saved draft after successful publish
      if (draftStorageKey) {
        try {
          localStorage.removeItem(draftStorageKey)
        } catch (e) {
          // Non-blocking – log for debugging only
          // eslint-disable-next-line no-console
          console.warn('Failed to clear outbound order draft after submit:', e)
        }
        setDraftAvailable(false)
      }

      navigate('/outbound')
    } catch (error) {
      if (error instanceof OutboundOrderValidationError) {
        alert(error.message)
      } else {
        console.error('Unexpected error while creating outbound order:', error)
        alert('An unexpected error occurred while creating the order.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageContainer
      title={isNew ? 'Create Outbound Order' : `Edit Outbound Order ${id}`}
      subtitle="Define shipment header and line items before releasing to the warehouse"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <UNSConnectionInfo topic={TOPIC_CREATE_ACTION} />
          <div>
            Mode:{' '}
            <span className="font-mono font-semibold text-slate-700">
              {isNew ? 'NEW' : 'EDIT'}
            </span>
          </div>
        </div>

        {draftAvailable && isNew && (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="py-3 flex items-center justify-between gap-4">
              <div className="text-xs text-amber-800">
                A local draft exists for this user. You can restore it or start fresh.
              </div>
              <div className="flex gap-2">
                <Button size="xs" variant="outline" className="h-7 text-xs" onClick={handleRestoreDraft}>
                  Restore Draft
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  className="h-7 text-xs text-amber-700"
                  onClick={() => setDraftAvailable(false)}
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="header">Header</TabsTrigger>
            <TabsTrigger value="lines">Lines</TabsTrigger>
          </TabsList>

          <TabsContent value="header" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Header</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Business Type *</Label>
                    <select
                      className={`border rounded-md h-9 px-2 text-sm ${validationErrors.type ? 'border-red-500' : ''}`}
                      value={formData.type}
                      onChange={e => updateField('type', e.target.value)}
                    >
                      <option value="SALES_ORDER">Sales Shipment (DN)</option>
                      <option value="TRANSFER_OUT">Inter-WH Transfer</option>
                    </select>
                    {validationErrors.type && (
                      <p className="text-[11px] text-red-600 mt-0.5">{validationErrors.type}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Warehouse *</Label>
                    <WarehouseSelect
                      value={formData.warehouse}
                      onChange={val => updateField('warehouse', val)}
                    />
                    {validationErrors.warehouse && (
                      <p className="text-[11px] text-red-600 mt-0.5">{validationErrors.warehouse}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Requested Ship Date *</Label>
                    <Input
                      type="date"
                      className={`h-9 text-sm ${validationErrors.requestedDate ? 'border-red-500' : ''}`}
                      value={formData.requestedDate}
                      onChange={e => updateField('requestedDate', e.target.value)}
                    />
                    {validationErrors.requestedDate && (
                      <p className="text-[11px] text-red-600 mt-0.5">{validationErrors.requestedDate}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {formData.type === 'SALES_ORDER' ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Customer *</Label>
                        <Input
                          placeholder="Customer or Ship-to"
                          className={`h-9 text-sm ${validationErrors.customer ? 'border-red-500' : ''}`}
                          value={formData.customer}
                          onChange={e => updateField('customer', e.target.value)}
                        />
                        {validationErrors.customer && (
                          <p className="text-[11px] text-red-600 mt-0.5">{validationErrors.customer}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Operator (Worker)</Label>
                        <WorkerSelect
                          value={formData.operator}
                          onChange={val => updateField('operator', val)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Destination *</Label>
                        <Input
                          placeholder="Destination warehouse / site"
                          className={`h-9 text-sm ${validationErrors.destination ? 'border-red-500' : ''}`}
                          value={formData.destination}
                          onChange={e => updateField('destination', e.target.value)}
                        />
                        {validationErrors.destination && (
                          <p className="text-[11px] text-red-600 mt-0.5">{validationErrors.destination}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Operator (Worker)</Label>
                        <WorkerSelect
                          value={formData.operator}
                          onChange={val => updateField('operator', val)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lines">
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-sm">Line Items</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={addLine}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Line
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-64">Material</TableHead>
                      <TableHead className="w-24">Quantity</TableHead>
                      <TableHead className="w-10 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.lines.map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <MaterialSelect
                            value={line.code}
                            onChange={val => updateLine(idx, 'code', val)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-8 text-xs w-24"
                            value={line.qty}
                            onChange={e => updateLine(idx, 'qty', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-400"
                            onClick={() => removeLine(idx)}
                            disabled={formData.lines.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            className="bg-[#b2ed1d] text-slate-900 font-bold hover:bg-[#8cd121]"
            onClick={handleConfirmCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating…' : 'Confirm Create'}
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}

