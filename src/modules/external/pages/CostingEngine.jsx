import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Select } from '../../../components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs'
import { useGlobalUNS } from '../../../context/UNSContext'
import { CheckCircle2, Calculator } from 'lucide-react'

// MQTT Topics for Costing Engine
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/Costing/Action/Run_Calculation"
const TOPIC_RESULT = "Henkelv2/Shanghai/Logistics/Costing/State/Bill_Generated"

export default function CostingEngine() {
  // Change Hook
  const { data, publish, status } = useGlobalUNS()

  // Extract Data from "Raw" Bucket
  // We look inside data.raw for the specific billing result topic
  const resultData = data.raw[TOPIC_RESULT]
  
  // Internal Allocation State
  const [monthlyOpex, setMonthlyOpex] = useState(150000)
  const [costDriver, setCostDriver] = useState('total_orders')
  const [costPerOrder, setCostPerOrder] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // Listen for Node-RED response and update the "Cost Per Order" display
  useEffect(() => {
    if (resultData && resultData.cost_per_unit) {
      console.log("📥 Received Costing Result:", resultData);
      setCostPerOrder(Number(resultData.cost_per_unit));
    }
  }, [resultData]);

  // Calculate Internal Allocation (Send to UNS)
  const calculateInternalCost = () => {
    // 1. Create the Payload with user inputs
    const payload = {
      id: "INT-" + Math.floor(Math.random() * 10000),
      timestamp: Date.now(),
      type: "INTERNAL_ALLOCATION",
      monthly_opex: monthlyOpex,
      driver: costDriver
    };

    // 2. Publish to Node-RED
    console.log("📤 Sending Calculation Request:", payload);
    publish(TOPIC_ACTION, payload);

    // 3. User Feedback
    setToastMessage("Sent to Node-RED... Waiting for Cost Engine...");
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Handle Calculate for External Billing - Send to UNS
  const handleCalculateExternal = () => {
    const payload = {
      id: "COST-" + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
      warehouse: "Shanghai_Int_WH",
      trigger: "USER_MANUAL"
    }
    
    publish(TOPIC_ACTION, payload)
    setToastMessage("Request sent to UNS Costing Engine...")
    
    // Clear toast after 3 seconds
    setTimeout(() => setToastMessage(null), 3000)
  }

  // External Billing Calculations from UNS result or fallback
  const calculatedTotal = resultData?.total_cost || 
    (resultData?.breakdown ? resultData.breakdown.reduce((sum, item) => sum + (item.total || 0), 0) : 0)
  
  const hasDiscrepancy = resultData?.official_invoice_total && 
    Math.abs(calculatedTotal - resultData.official_invoice_total) > 0.01

  // Get breakdown from result data
  const invoiceItems = resultData?.breakdown || []

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <Card className="bg-white border border-emerald-200 shadow-sm mb-4">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">{toastMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-bold text-slate-900">Costing Engine</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Hybrid Cost Control - Internal Allocation & External Billing</p>
          <p className="text-xs text-slate-400 mt-1">
            Status: <span className={status === 'CONNECTED' ? 'text-emerald-600' : status === 'ERROR' ? 'text-red-500' : 'text-amber-500'}>{status}</span>
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="internal" className="w-full">
            <TabsList>
              <TabsTrigger value="internal">Internal Allocation</TabsTrigger>
              <TabsTrigger value="external">External Billing</TabsTrigger>
            </TabsList>

            {/* Tab 1: Internal Allocation */}
            <TabsContent value="internal" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input Section */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cost Allocation Input</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Total Monthly Opex (RMB)
                      </label>
                      <input
                        type="number"
                        value={monthlyOpex}
                        onChange={(e) => setMonthlyOpex(Number(e.target.value))}
                        className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                        placeholder="150000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Cost Driver
                      </label>
                      <Select
                        value={costDriver}
                        onChange={(e) => setCostDriver(e.target.value)}
                      >
                        <option value="total_orders">Total Orders</option>
                        <option value="pallet_days">Pallet-Days</option>
                      </Select>
                    </div>
                    <Button
                      onClick={calculateInternalCost}
                      className="w-full h-10 bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm px-4 inline-flex items-center gap-2"
                    >
                      Calculate
                    </Button>
                  </CardContent>
                </Card>

                {/* Output Section */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cost Per Order</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {costPerOrder !== null ? (
                      <div className="text-center py-8">
                        <div className="text-4xl font-bold text-slate-900 mb-2">
                          ¥{costPerOrder.toFixed(2)}
                        </div>
                        <p className="text-sm text-slate-500">
                          per {costDriver === 'total_orders' ? 'Order' : 'Pallet-Day'}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-400 text-sm">Click Calculate to see results</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent DNs Table */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent Internal DNs - Allocated Cost</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">DN Number</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Order Date</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Pallet Days</TableHead>
                        <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Allocated Cost (RMB)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costPerOrder !== null ? (
                        // Show sample DNs with calculated cost
                        <TableRow className="bg-white border-b border-slate-100 hover:bg-slate-50 last:border-0 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-slate-700">Sample DN</TableCell>
                          <TableCell className="text-slate-600 text-sm">{new Date().toLocaleDateString()}</TableCell>
                          <TableCell className="text-slate-600 text-sm">-</TableCell>
                          <TableCell className="text-slate-900 font-bold">
                            ¥{costPerOrder.toFixed(2)} per {costDriver === 'total_orders' ? 'order' : 'pallet-day'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                            <div className="flex flex-col items-center justify-center">
                              <Calculator className="h-8 w-8 text-slate-300 mb-2" />
                              <p className="text-sm font-medium">Calculate cost per order to see allocation</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: External Billing */}
            <TabsContent value="external" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rate Card Section */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Rate Card</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {resultData?.rate_card ? (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-600">Storage</span>
                          <span className="text-sm font-semibold text-slate-900">
                            ¥{(resultData.rate_card.storage_per_day || 0).toFixed(2)}/day
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-600">Inbound Handling</span>
                          <span className="text-sm font-semibold text-slate-900">
                            ¥{(resultData.rate_card.inbound_per_pallet || 0).toFixed(2)}/pallet
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-600">Outbound Handling</span>
                          <span className="text-sm font-semibold text-slate-900">
                            ¥{(resultData.rate_card.outbound_per_pallet || 0).toFixed(2)}/pallet
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-600">VAS (Labeling)</span>
                          <span className="text-sm font-semibold text-slate-900">
                            ¥{(resultData.rate_card.vas_per_item || 0).toFixed(2)}/item
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">Rate card will appear after calculation</p>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Summary */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Activity Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {resultData?.activity_summary ? (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-600">Inbound Pallets</span>
                          <span className="text-sm font-semibold text-slate-900">
                            {resultData.activity_summary.inbound_pallets || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-200">
                          <span className="text-sm text-slate-600">Storage Days</span>
                          <span className="text-sm font-semibold text-slate-900">
                            {resultData.activity_summary.storage_days || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-slate-600">VAS Items</span>
                          <span className="text-sm font-semibold text-slate-900">
                            {resultData.activity_summary.vas_items || 0}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">Activity summary will appear after calculation</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Discrepancy Alert */}
              {hasDiscrepancy && resultData?.official_invoice_total && (
                <Card className="bg-white border border-amber-200 shadow-sm">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 border rounded-sm uppercase text-[10px] px-3">
                        Invoice Discrepancy Detected
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">
                          Calculated Total: <span className="font-semibold">¥{calculatedTotal.toFixed(2)}</span>
                        </p>
                        <p className="text-sm text-slate-700">
                          3PL Official Invoice: <span className="font-semibold">¥{resultData.official_invoice_total.toFixed(2)}</span>
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Difference: ¥{Math.abs(calculatedTotal - resultData.official_invoice_total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Calculate Button */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="pt-6">
                  <Button
                    onClick={handleCalculateExternal}
                    className="w-full h-10 bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm px-4 inline-flex items-center gap-2"
                    disabled={status !== 'CONNECTED'}
                  >
                    Calculate External Bill
                  </Button>
                  {status !== 'CONNECTED' && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Connect to MQTT to calculate
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Shadow Bill Table */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Shadow Bill - Invoice Calculation</CardTitle>
                  {resultData?.total_cost && (
                    <p className="text-xs text-slate-500 mt-1">
                      Generated: {new Date(resultData.timestamp || Date.now()).toLocaleString()}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {invoiceItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Calculator className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-medium">No calculation data available</p>
                      <p className="text-xs mt-2 text-slate-400">Click "Calculate External Bill" to generate</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 border-b border-slate-200">
                          <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Activity</TableHead>
                          <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Quantity</TableHead>
                          <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Unit</TableHead>
                          <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Rate (RMB)</TableHead>
                          <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Total (RMB)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item, index) => (
                          <TableRow key={index} className="bg-white border-b border-slate-100 hover:bg-slate-50 last:border-0 transition-colors">
                            <TableCell className="font-medium text-slate-900">{item.activity || item.name}</TableCell>
                            <TableCell className="text-slate-600 text-sm">{(item.qty || item.quantity || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-slate-600 text-sm">{item.unit || 'N/A'}</TableCell>
                            <TableCell className="text-slate-600 text-sm">¥{(item.rate || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-slate-900 font-bold">
                              ¥{(item.total || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-50 border-t-2 border-slate-200">
                          <TableCell colSpan={4} className="text-right font-bold text-slate-900">
                            Grand Total:
                          </TableCell>
                          <TableCell className="text-2xl font-bold text-[#a3e635]">
                            ¥{calculatedTotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Total Cost Summary Card */}
              {resultData?.total_cost && (
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <div className="text-5xl font-bold text-[#a3e635] mb-2">
                        ¥{resultData.total_cost.toFixed(2)}
                      </div>
                      <p className="text-sm text-slate-600">Calculated by UNS Costing Engine</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
