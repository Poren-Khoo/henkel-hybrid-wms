import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Info } from 'lucide-react'
import { useGlobalUNS } from '../../../context/UNSContext'

const headerClass = "text-xs uppercase text-slate-500 font-semibold"

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
          variant="destructive"
          className="h-10 px-4"
        >
          Save Changes
        </Button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <Card className="border border-green-300 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800">{toastMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Activity Rates (Basic Transport Rates) */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Rates</CardTitle>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Info className="h-4 w-4" />
              <span>Basic Cost = Inbound + Outbound + Storage</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={headerClass}>Activity Type</TableHead>
                <TableHead className={headerClass}>Unit</TableHead>
                <TableHead className={headerClass}>Price (CNY)</TableHead>
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
                  <TableRow key={config.key} className="bg-white border-b hover:bg-slate-50">
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
                        className="w-32"
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
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Value Added Services (Activity List)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={headerClass}>Service Code</TableHead>
                <TableHead className={headerClass}>Price (CNY)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {VAS_RATE_CONFIG.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-slate-500 py-8">
                    No VAS rates configured
                  </TableCell>
                </TableRow>
              ) : (
                VAS_RATE_CONFIG.map((config) => (
                  <TableRow key={config.key} className="bg-white border-b hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">
                      {config.label}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={rates.vas[config.key] || 0}
                        onChange={(e) => handleVASPriceChange(config.key, e.target.value)}
                        className="w-32"
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
