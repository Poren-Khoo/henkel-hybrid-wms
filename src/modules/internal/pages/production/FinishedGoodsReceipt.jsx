import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { PackageCheck, Factory, ArrowRight, Printer } from 'lucide-react'
import PageContainer from '../../../../components/PageContainer'
import { useGlobalUNS } from '../../../../context/UNSContext'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

// TOPICS
const TOPIC_ORDER_LIST = "Henkelv2/Shanghai/Logistics/Production/State/Order_List"
const TOPIC_ACTION_FG_RECEIPT = "Henkelv2/Shanghai/Logistics/Production/Action/Post_FG_Receipt"

export default function FinishedGoodsReceipt() {
  const { data, publish } = useGlobalUNS()
  
  // Form State
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [fgBatch, setFgBatch] = useState('')
  const [producedQty, setProducedQty] = useState('')
  const [targetLocation, setTargetLocation] = useState('FG-ZONE-01')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Get Active Orders (IN_PROGRESS)
  const orders = useMemo(() => {
    const rawData = data.raw[TOPIC_ORDER_LIST]
    const list = rawData?.items || []
    // Only show orders that are currently being made
    return list.filter(o => o.status === 'IN_PROGRESS')
  }, [data.raw])

  // Derived state from selection
  const selectedOrder = orders.find(o => o.order_id === selectedOrderId)

  // Auto-generate Batch ID when order selected
  useEffect(() => {
    if (selectedOrder) {
        setFgBatch(`BATCH-FG-${Math.floor(Math.random() * 10000)}`)
        // Default to remaining qty (simplified logic)
        const qtyNum = parseFloat(selectedOrder.qty) || 0
        setProducedQty(qtyNum)
    }
  }, [selectedOrder])

  // SUBMIT HANDLER
  const handlePostReceipt = () => {
    if (!selectedOrder || !producedQty) return;
    setIsSubmitting(true)

    // Payload: The "Birth Certificate" of the Finished Good
    const payload = {
        order_id: selectedOrder.order_id,
        product_code: selectedOrder.productCode,
        product_name: selectedOrder.productName || selectedOrder.product,
        batch_id: fgBatch,
        hu_id: `HU-FG-${Date.now()}`, // New Pallet ID
        qty: parseFloat(producedQty),
        uom: "KG", // Simplified
        location: targetLocation,
        status: "AVAILABLE", // Or "QC_HOLD" if you want another QC step
        timestamp: Date.now(),
        operator: "Line_Supervisor"
    }

    console.log("🚀 Posting FG Receipt:", payload)
    publish(TOPIC_ACTION_FG_RECEIPT, payload)

    // Reset Form
    setTimeout(() => {
        setIsSubmitting(false)
        setSelectedOrderId('')
        setFgBatch('')
        setProducedQty('')
        alert("Finished Goods Posted Successfully!")
    }, 800)
  }

  return (
    <PageContainer 
      title="Finished Goods Receipt" 
      subtitle="Record production output and create FG inventory"
      variant="standard"
    >
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_ORDER_LIST} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT: RECEIPT FORM */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Factory className="h-5 w-5 text-slate-500" />
                        Production Declaration
                    </h3>
                </div>
                <CardContent className="p-6 space-y-6">
                    
                    {/* 1. Select Order */}
                    <div className="space-y-2">
                        <Label>Select Production Order (In Progress)</Label>
                        <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                            <SelectTrigger className="h-12 text-lg">
                                <SelectValue placeholder="Select Active Order..." />
                            </SelectTrigger>
                            <SelectContent>
                                {orders.length === 0 ? (
                                    <SelectItem value="none" disabled>No Active Orders</SelectItem>
                                ) : (
                                    orders.map(order => (
                                        <SelectItem key={order.order_id} value={order.order_id}>
                                            {order.order_id} | {order.productCode}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedOrder && (
                        <div className="p-4 bg-blue-50 rounded-md border border-blue-200 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Target Product:</span>
                                <span className="font-bold text-blue-700">{selectedOrder.productCode}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Target Qty:</span>
                                <span className="font-bold text-slate-900">{selectedOrder.qty}</span>
                            </div>
                        </div>
                    )}

                    {/* 2. Receipt Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>FG Batch ID</Label>
                            <Input value={fgBatch} onChange={e => setFgBatch(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Produced Qty</Label>
                            <Input 
                                type="number" 
                                value={producedQty} 
                                onChange={e => setProducedQty(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Target Location (Warehouse)</Label>
                        <Select value={targetLocation} onValueChange={setTargetLocation}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FG-ZONE-01">FG-ZONE-01 (General)</SelectItem>
                                <SelectItem value="FG-COOL-01">FG-COOL-01 (Cold Storage)</SelectItem>
                                <SelectItem value="SHIPPING-LANE">SHIPPING-LANE (Direct Ship)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button 
                        className="w-full h-12 bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm px-4 inline-flex items-center gap-2"
                        disabled={!selectedOrder || isSubmitting}
                        onClick={handlePostReceipt}
                    >
                        {isSubmitting ? "Posting..." : "Post Goods Receipt"}
                    </Button>

                </CardContent>
            </Card>

            {/* RIGHT: LIVE OUTPUT LOG (Simulated for Demo) */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <PackageCheck className="h-5 w-5 text-slate-500" />
                        Recent Receipts
                    </h3>
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 border-b border-slate-200">
                                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">HU ID</TableHead>
                                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Product</TableHead>
                                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Qty</TableHead>
                                <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="text-xs text-slate-400 text-center py-8" colSpan={4}>
                                    Receipt history will appear here
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </PageContainer>
  )
}