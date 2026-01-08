import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { Select } from '../../../components/ui/select'
import { Search, AlertTriangle } from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import PageContainer from '../../../components/PageContainer'

// 1. The REAL Internal Topic
const INTERNAL_TOPIC = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Inventory_Level"

// 2. The MOCK External Data (Simulating a DHL API Snapshot)
// We purposely create some mismatches here to demo the "Sad Path"
const MOCK_EXTERNAL_SNAPSHOT = [
  { sku: 'GLUE-500', qty: 1200, timestamp: Date.now() }, // Real is 1250 -> Diff -50
  { sku: 'SEALANT-X', qty: 850, timestamp: Date.now() }, // Real is 850 -> Match
  { sku: 'TAPE-PRO', qty: 3000, timestamp: Date.now() }, // Real is 3200 -> Diff -200
  { sku: 'WRAP-50', qty: 180, timestamp: Date.now() },   // Real is 180 -> Match
]

// Billing Reconciliation - Mock Internal Bill (Fallback)
const MOCK_INTERNAL_BILL = {
  total_cost: 152000.00,
  breakdown: [
    { category: "Storage Fees (Jan)", amount: 75000.00 },
    { category: "Inbound Handling", amount: 40000.00 },
    { category: "Outbound Handling", amount: 38000.00 },
    { category: "VAS - Labeling", amount: 2000.00 }
  ]
}

// Billing Reconciliation - Mock Official Invoice
const MOCK_OFFICIAL_INVOICE = [
  { category: "Storage Fees (Jan)", amount: 75000.00 }, // Matches
  { category: "Inbound Handling", amount: 42000.00 },   // Mismatch +2000
  { category: "Outbound Handling", amount: 38000.00 },   // Matches
  { category: "VAS - Labeling", amount: 5500.00 }        // Big Mismatch +3500
]

const headerClass = "text-xs uppercase text-slate-500 font-semibold"

// Billing Topic
const BILLING_TOPIC = "Henkelv2/Shanghai/Logistics/Finance/State/Monthly_Billing"

export default function Reconciliation() {
  const { data, publish } = useGlobalUNS()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Exception Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedException, setSelectedException] = useState(null)
  const [reason, setReason] = useState('')
  const [priority, setPriority] = useState('')
  const [notes, setNotes] = useState('')
  const [toastMessage, setToastMessage] = useState(null)

  // 3. Get Real Internal Data correctly
  const internalInventory = useMemo(() => {
    // Look inside the raw bucket for the specific topic
    const topicData = data.raw[INTERNAL_TOPIC] || {}
    return Array.isArray(topicData.stock_items) ? topicData.stock_items : []
  }, [data.raw])

  // 4. Merge Logic: Combine Internal + External
  const reconciliationData = useMemo(() => {
    // Start with all External items
    const merged = MOCK_EXTERNAL_SNAPSHOT.map(extItem => {
      // Find matching Internal item
      const intItem = internalInventory.find(i => i.sku === extItem.sku)
      
      const intQty = intItem ? (intItem.qty || 0) : 0
      const extQty = extItem.qty
      const diff = intQty - extQty
      
      return {
        sku: extItem.sku,
        desc: intItem?.desc || 'Unknown Item', // Get desc from internal
        intQty,
        extQty,
        diff,
        status: diff === 0 ? 'MATCH' : 'MISMATCH'
      }
    })

    // (Optional) Add items that are Internal but missing from External? 
    // For simplicity, we just focus on the External list for now.
    
    return merged.filter(item => 
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [internalInventory, searchTerm])

  // Billing Reconciliation Logic
  const internalBill = useMemo(() => {
    const billData = data.raw[BILLING_TOPIC] || MOCK_INTERNAL_BILL
    return billData
  }, [data.raw])

  const billingReconciliation = useMemo(() => {
    const internalBreakdown = internalBill?.breakdown || MOCK_INTERNAL_BILL.breakdown
    
    // Match categories and calculate variance
    return MOCK_OFFICIAL_INVOICE.map(invoiceItem => {
      const internalItem = internalBreakdown.find(item => 
        item.category === invoiceItem.category || 
        item.activity === invoiceItem.category ||
        item.name === invoiceItem.category
      )
      
      const calculatedAmount = internalItem?.amount || internalItem?.total || 0
      const invoiceAmount = invoiceItem.amount
      const variance = invoiceAmount - calculatedAmount
      
      let status = 'MATCHED'
      if (variance > 0) status = 'OVERCHARGED'
      else if (variance < 0) status = 'UNDERCHARGED'
      
      return {
        category: invoiceItem.category,
        calculatedAmount,
        invoiceAmount,
        variance,
        status
      }
    })
  }, [internalBill])

  // Calculate billing summary metrics
  const billingSummary = useMemo(() => {
    const internalTotal = internalBill?.total_cost || 
      billingReconciliation.reduce((sum, item) => sum + item.calculatedAmount, 0)
    const invoiceTotal = MOCK_OFFICIAL_INVOICE.reduce((sum, item) => sum + item.amount, 0)
    const netDiscrepancy = invoiceTotal - internalTotal
    
    return {
      internalTotal,
      invoiceTotal,
      netDiscrepancy
    }
  }, [internalBill, billingReconciliation])

  return (
    <PageContainer 
      title="Reconciliation" 
      subtitle="Compare internal system stock vs. external 3PL reported stock."
      variant="analysis"
    >
      <div className="space-y-6">
        <Tabs defaultValue="inventory" className="w-full">
        <TabsList>
          <TabsTrigger value="inventory">Inventory Reconciliation</TabsTrigger>
          <TabsTrigger value="billing">Billing Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-6">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader>
               {/* 5. Professional Header */}
               <UNSConnectionInfo topic={INTERNAL_TOPIC} />
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="flex items-center gap-2 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Search by SKU or Description..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Main Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={headerClass}>SKU</TableHead>
                    <TableHead className={headerClass}>Description</TableHead>
                    <TableHead className={headerClass}>Henkel Qty (System)</TableHead>
                    <TableHead className={headerClass}>3PL Qty (Reported)</TableHead>
                    <TableHead className={headerClass}>Difference</TableHead>
                    <TableHead className={headerClass}>Status</TableHead>
                    <TableHead className={headerClass}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliationData.map((row) => (
                    <TableRow key={row.sku} className={row.status === 'MISMATCH' ? 'bg-red-50 hover:bg-red-100' : 'bg-white hover:bg-slate-50'}>
                      <TableCell className="font-bold text-slate-900">{row.sku}</TableCell>
                      <TableCell className="text-slate-700">{row.desc}</TableCell>
                      <TableCell className="font-mono">{row.intQty.toLocaleString()}</TableCell>
                      <TableCell className="font-mono">{row.extQty.toLocaleString()}</TableCell>
                      <TableCell className={`font-mono font-bold ${row.diff !== 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {row.diff > 0 ? `+${row.diff}` : row.diff}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'MATCH' ? 'green' : 'red'}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.status === 'MISMATCH' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-200 text-red-700 hover:bg-red-100"
                            onClick={() => {
                              setSelectedException(row)
                              setIsDialogOpen(true)
                              setReason('')
                              setPriority('')
                              setNotes('')
                            }}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Create Exception
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <div className="space-y-6">
            {/* Connection Info */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader>
                <UNSConnectionInfo topic={BILLING_TOPIC} />
              </CardHeader>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Card 1: Internal Calculation */}
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Internal Calculation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    ¥{billingSummary.internalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Calculated by system</p>
                </CardContent>
              </Card>

              {/* Card 2: Official Invoice Total */}
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Official Invoice Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    ¥{billingSummary.invoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">From 3PL invoice</p>
                </CardContent>
              </Card>

              {/* Card 3: Net Discrepancy */}
              <Card className="border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Net Discrepancy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${billingSummary.netDiscrepancy !== 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {billingSummary.netDiscrepancy > 0 ? '+' : ''}
                    ¥{billingSummary.netDiscrepancy.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Variance amount</p>
                </CardContent>
              </Card>
            </div>

            {/* Discrepancy Table */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Line Item Discrepancy</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Compare calculated vs. invoiced amounts by category</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={headerClass}>Expense Category</TableHead>
                      <TableHead className={headerClass}>Internal Calc</TableHead>
                      <TableHead className={headerClass}>Invoice Amount</TableHead>
                      <TableHead className={headerClass}>Variance</TableHead>
                      <TableHead className={headerClass}>Status</TableHead>
                      <TableHead className={headerClass}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingReconciliation.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                          No billing data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      billingReconciliation.map((item) => {
                        const isDiscrepancy = item.status !== 'MATCHED'
                        return (
                          <TableRow
                            key={item.category}
                            className={`border-b hover:bg-slate-50 ${isDiscrepancy ? 'bg-red-50' : 'bg-white'}`}
                          >
                            <TableCell className="font-medium text-slate-900">{item.category}</TableCell>
                            <TableCell className="font-mono text-slate-700">
                              ¥{item.calculatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="font-mono text-slate-700">
                              ¥{item.invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className={`font-mono font-bold ${item.variance !== 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              {item.variance > 0 ? '+' : ''}
                              ¥{item.variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {item.status === 'MATCHED' && (
                                <Badge variant="green" className="uppercase px-3 rounded-full">Matched</Badge>
                              )}
                              {item.status === 'OVERCHARGED' && (
                                <Badge variant="red" className="uppercase px-3 rounded-full">Overcharged</Badge>
                              )}
                              {item.status === 'UNDERCHARGED' && (
                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 uppercase px-3 rounded-full">Undercharged</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {isDiscrepancy && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-red-200 text-red-700 hover:bg-red-100"
                                  onClick={() => {
                                    // Re-use the same dialog state!
                                    setSelectedException({
                                      sku: item.category, // We map "Category" to "SKU" for the dialog
                                      intQty: item.calculatedAmount, // We map cost to qty just for display
                                      extQty: item.invoiceAmount,
                                      diff: item.variance
                                    })
                                    // Pre-fill reason based on status
                                    const defaultReason = item.status === 'OVERCHARGED' ? 'Overcharged VAS' : 'Billing Discrepancy'
                                    setReason(defaultReason)
                                    setPriority('High') // Money is always High priority
                                    setNotes(`Invoice amount ¥${item.invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} does not match calculated cost ¥${item.calculatedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
                                    setIsDialogOpen(true)
                                  }}
                                >
                                  Contest Charge
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Toast Notification */}
      {toastMessage && (
        <Card className="border border-green-300 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800">{toastMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Exception Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Raise Dispute for {selectedException?.sku || 'SKU'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedException && (
            <>
              {/* Summary Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Henkel Qty:</span>
                    <span className="font-semibold text-slate-900 ml-2">
                      {selectedException.intQty.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">3PL Qty:</span>
                    <span className="font-semibold text-slate-900 ml-2">
                      {selectedException.extQty.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Discrepancy:</span>
                    <span className={`font-semibold ml-2 ${selectedException.diff !== 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      {selectedException.diff > 0 ? `+${selectedException.diff}` : selectedException.diff}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reason">Reason Code</Label>
                  <Select
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Missing Inventory">Missing Inventory</option>
                    <option value="Damaged Goods">Damaged Goods</option>
                    <option value="System Data Error">System Data Error</option>
                    <option value="Wrong SKU">Wrong SKU</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="mt-1"
                  >
                    <option value="">Select priority...</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter additional details about the discrepancy..."
                    className="mt-1"
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setSelectedException(null)
                    setReason('')
                    setPriority('')
                    setNotes('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!reason || !priority) {
                      alert('Please select both Reason Code and Priority')
                      return
                    }

                    // Generate random exception ID
                    const exceptionId = 'EXT-' + Math.random().toString(36).substr(2, 9).toUpperCase()
                    
                    // Log dispute payload
                    const disputePayload = {
                      exception_id: exceptionId,
                      sku: selectedException.sku,
                      henkel_qty: selectedException.intQty,
                      tpl_qty: selectedException.extQty,
                      discrepancy: selectedException.diff,
                      reason_code: reason,
                      priority: priority,
                      notes: notes,
                      timestamp: Date.now(),
                      status: "OPEN" // <--- Added status
                    }
                    
                    // 1. PUBLISH TO UNS (The Missing Link)
                    publish("Henkelv2/Shanghai/Logistics/Exceptions/Action/Raise_Dispute", disputePayload)

                    console.log('📤 Dispute Payload Sent:', disputePayload)

                    // Show toast notification
                    setToastMessage(`Exception ${exceptionId} sent to Control Tower`)
                    setTimeout(() => setToastMessage(null), 3000)

                    // Close dialog and reset form
                    setIsDialogOpen(false)
                    setSelectedException(null)
                    setReason('')
                    setPriority('')
                    setNotes('')
                  }}
                  variant="destructive"
                  className="h-10 px-4"
                >
                  Submit Dispute
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </PageContainer>
  )
}