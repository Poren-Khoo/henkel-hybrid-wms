import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Info, CheckCircle2, Calculator } from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'

// MQTT Topics
const TOPIC_STATE = "Henkelv2/Shanghai/Logistics/MasterData/State/Rate_Cards"
const TOPIC_ACTION = "Henkelv2/Shanghai/Logistics/MasterData/Action/Update_Rates"

// Whitelist Configuration - Basic Rates
const BASIC_RATE_CONFIG = [
  { key: 'inbound', label: 'Inbound Handling (入库费)', unit: 'Rate per Unit' },
  { key: 'outbound', label: 'Outbound Handling (出库费)', unit: 'Rate per Unit' },
  { key: 'storage', label: 'Storage Fee (仓储费)', unit: 'Rate per Unit per Day' }
]

// Whitelist Configuration - VAS Rates
const VAS_RATE_CONFIG = [
  { key: 'activity_1', label: 'Activity 1 (Labeling)' },
  { key: 'activity_2', label: 'Activity 2 (Repacking)' },
  { key: 'activity_3', label: 'Activity 3 (Urgent)' }
]

// Default Rate Card Data - Activity-Based Costing
const DEFAULT_RATES = {
  basic: {
    "inbound": 2.00,      // 入库费 - Rate per Unit
    "outbound": 3.00,     // 出库费 - Rate per Unit
    "storage": 0.50        // 仓储费 - Rate per Unit per Day
  },
  vas: {
    "activity_1": 2,      // Activity 1 (Labeling)
    "activity_2": 50,     // Activity 2 (Repacking)
    "activity_3": 500     // Activity 3 (Urgent)
  }
}

export default function RateCard() {
  // Get data from Node-RED via MQTT
  const { data, publish } = useGlobalUNS()
  const [toastMessage, setToastMessage] = useState(null)
  
  // Initialize rates from MQTT data or use defaults
  const [rates, setRates] = useState(DEFAULT_RATES)

  // Initialize rates from MQTT data or use defaults
  // We point specifically to the "rates" bucket
  const incomingRates = data.rates || {}

  // Update rates when MQTT data arrives
  useEffect(() => {
    // Check if incomingRates has the right structure
    if (incomingRates.basic || incomingRates.vas) {
      
      // 1. Merge Basic Rates
      const whitelistedBasic = { ...DEFAULT_RATES.basic }
      if (incomingRates.basic) {
        BASIC_RATE_CONFIG.forEach(config => {
          // Use incoming if it exists, otherwise keep default
          if (incomingRates.basic[config.key] !== undefined) {
             whitelistedBasic[config.key] = Number(incomingRates.basic[config.key])
          }
        })
      }

      // 2. Merge VAS Rates
      const whitelistedVAS = { ...DEFAULT_RATES.vas }
      if (incomingRates.vas) {
        VAS_RATE_CONFIG.forEach(config => {
          if (incomingRates.vas[config.key] !== undefined) {
             whitelistedVAS[config.key] = Number(incomingRates.vas[config.key])
          }
        })
      }

      setRates({
        basic: whitelistedBasic,
        vas: whitelistedVAS
      })
    }
  }, [incomingRates]) // <--- Dependency is now specific

  // Handle price change for Basic Rates (Activity Rates)
  const handleBasicPriceChange = (activityKey, newPrice) => {
    const price = Number(newPrice)
    if (isNaN(price)) return
    
    setRates(prev => ({
      ...prev,
      basic: {
        ...prev.basic,
        [activityKey]: price
      }
    }))
  }

  // Handle price change for VAS Rates
  const handleVASPriceChange = (activityKey, newPrice) => {
    const price = Number(newPrice)
    if (isNaN(price)) return
    
    setRates(prev => ({
      ...prev,
      vas: {
        ...prev.vas,
        [activityKey]: price
      }
    }))
  }

  // Save changes to Node-RED - only send whitelisted keys
  const handleSaveChanges = () => {
    // Filter to only include whitelisted keys
    const whitelistedRates = {
      basic: {},
      vas: {}
    }

    BASIC_RATE_CONFIG.forEach(config => {
      if (rates.basic[config.key] !== undefined) {
        whitelistedRates.basic[config.key] = rates.basic[config.key]
      }
    })

    VAS_RATE_CONFIG.forEach(config => {
      if (rates.vas[config.key] !== undefined) {
        whitelistedRates.vas[config.key] = rates.vas[config.key]
      }
    })

    publish(TOPIC_ACTION, whitelistedRates)
    setToastMessage('Rates Updated')
    setTimeout(() => setToastMessage(null), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Rate Cards</h1>
          <p className="text-slate-600 mt-2">Active pricing rules synchronized from SAP.</p>
        </div>
        <Button
          onClick={handleSaveChanges}
          className="h-10 px-4 bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm inline-flex items-center gap-2"
        >
          Save Changes
        </Button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Card className="bg-white border border-emerald-200 shadow-sm">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">{toastMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Activity Rates (Basic Transport Rates) */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Activity Rates</CardTitle>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="h-4 w-4 text-slate-400" />
              <span>Basic Cost = Inbound + Outbound + Storage</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Activity Type</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Unit</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Price (CNY)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BASIC_RATE_CONFIG.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500 py-8">
                    No activity rates configured
                  </TableCell>
                </TableRow>
              ) : (
                BASIC_RATE_CONFIG.map((config) => (
                  <TableRow key={config.key} className="bg-white border-b border-slate-100 hover:bg-slate-50 last:border-0 transition-colors">
                    <TableCell className="font-medium text-slate-900">
                      {config.label}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {config.unit}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={rates.basic[config.key] || 0}
                        onChange={(e) => handleBasicPriceChange(config.key, e.target.value)}
                        className="w-32 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white"
                        step="0.01"
                        min="0"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 2: Value Added Services (Activity List) */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">Value Added Services (Activity List)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Service Code</TableHead>
                <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Price (CNY)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {VAS_RATE_CONFIG.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-slate-500 py-8">
                    <div className="flex flex-col items-center justify-center">
                      <Calculator className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-sm font-medium">No VAS rates configured</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                VAS_RATE_CONFIG.map((config) => (
                  <TableRow key={config.key} className="bg-white border-b border-slate-100 hover:bg-slate-50 last:border-0 transition-colors">
                    <TableCell className="font-medium text-slate-900">
                      {config.label}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={rates.vas[config.key] || 0}
                        onChange={(e) => handleVASPriceChange(config.key, e.target.value)}
                        className="w-32 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white"
                        step="0.01"
                        min="0"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
