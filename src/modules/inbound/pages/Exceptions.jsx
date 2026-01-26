import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog'
import { Textarea } from '../../../components/ui/textarea'
import { 
  AlertOctagon, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  ArrowRight,
  ShieldAlert,
  PackageX,
  FileWarning
} from 'lucide-react'
import PageContainer from '../../../components/PageContainer'
import { useGlobalUNS } from '../../../context/UNSContext'
import UNSConnectionInfo from '../../../components/UNSConnectionInfo'
import { ExceptionValidator, ExceptionValidationError } from '../../../domain/inbound/ExceptionValidator'
import { ExceptionService } from '../../../domain/inbound/ExceptionService'

// TOPICS
const TOPIC_EXCEPTIONS = "Henkelv2/Shanghai/Logistics/Internal/Ops/State/Exceptions"
const TOPIC_RESOLUTION = "Henkelv2/Shanghai/Logistics/Internal/Ops/Action/Resolve_Exception"

// CONSTANTS
const SEVERITY_STYLES = {
  'CRITICAL': { color: 'bg-red-50 text-red-700 border-red-200', icon: AlertOctagon },
  'WARNING': { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: ShieldAlert },
  'INFO': { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileWarning }
}

const TYPE_LABELS = {
  'OVER_RECEIPT': 'Quantity Mismatch',
  'QUALITY_FAIL': 'Quality Inspection Failed',
  'BIN_FULL': 'Bin Capacity Exceeded',
  'DAMAGED': 'Inventory Damaged',
  'MISSING_DOCS': 'Missing COA/Paperwork',
  'RECEIPT_REJECTION': 'Receipt Refused at Dock',
  'MANUAL_REPORT': 'Manual Exception Report'
}

export default function Exceptions() {
  const { data, publish } = useGlobalUNS()
  
  // STATE
  const [selectedEx, setSelectedEx] = useState(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  // 1. DATA HANDLING
  const exceptions = useMemo(() => {
    const rawData = data.raw[TOPIC_EXCEPTIONS]
    const list = Array.isArray(rawData) ? rawData : rawData?.items || []
    
    // Normalize exceptions using service
    return list.map(ex => ExceptionService.normalizeException(ex))
  }, [data.raw])

  // 2. KPIS
  const kpis = useMemo(() => {
    // Use service for KPI calculation
    return ExceptionService.calculateKPIs(exceptions)
  }, [exceptions])

  // ACTIONS
  const handleResolve = (action) => {
    try {
      // Service handles validation + command building (DDD pattern)
      const payload = ExceptionService.buildResolutionCommand({
        exceptionId: selectedEx.id,
        action: action,
        note: resolutionNote,
        resolver: "Supervisor_Account"
      })

      publish(TOPIC_RESOLUTION, payload)
      setIsResolving(false)
      setSelectedEx(null)
      setResolutionNote('')
    } catch (error) {
      if (error instanceof ExceptionValidationError) {
        alert(error.message)
        return
      }
      // Re-throw unexpected errors
      throw error
    }
  }

  return (
    <PageContainer title="Exception Management" subtitle="Supervisor Review for Blocked Inventory & Tasks">
      <div className="space-y-4">
        <UNSConnectionInfo topic={TOPIC_EXCEPTIONS} />

        {/* --- KPI CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-red-700">{kpis.critical}</div>
                <div className="text-xs font-bold text-red-600 uppercase">Critical Blockers</div>
              </div>
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertOctagon className="h-6 w-6 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-700">{kpis.open}</div>
                <div className="text-xs font-bold text-slate-500 uppercase">Total Open Issues</div>
              </div>
              <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                <FileWarning className="h-6 w-6 text-slate-500" />
              </div>
            </CardContent>
          </Card>
          {/* Add more KPIs as needed */}
        </div>

        {/* --- WORKLIST --- */}
        <Card className="border-slate-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Severity</TableHead>
                <TableHead>Exception ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exceptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <p>No open exceptions. Good job!</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                exceptions.map(ex => {
                  const Style = SEVERITY_STYLES[ex.severity] || SEVERITY_STYLES['INFO']
                  const Icon = Style.icon
                  
                  return (
                    <TableRow key={ex.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedEx(ex)}>
                      <TableCell>
                        <Badge variant="outline" className={`${Style.color} flex w-fit items-center gap-1`}>
                          <Icon className="h-3 w-3" /> {ex.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{ex.id}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{TYPE_LABELS[ex.type] || ex.type}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{ex.details}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{ex.sourceRef}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-medium text-slate-700">{ex.reportedBy}</span>
                          <div className="text-slate-400">{ex.timestamp}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedEx(ex)}>
                          Review <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* --- RESOLUTION MODAL --- */}
        <Dialog open={!!selectedEx} onOpenChange={() => setSelectedEx(null)}>
          <DialogContent className="sm:max-w-[600px]">
            {selectedEx && (
              <>
                <DialogHeader className="border-b pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className={`${SEVERITY_STYLES[selectedEx.severity]?.color}`}>
                      {selectedEx.severity}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">{selectedEx.id}</span>
                  </div>
                  <DialogTitle>{TYPE_LABELS[selectedEx.type] || selectedEx.type}</DialogTitle>
                  <DialogDescription>
                    Reference: <span className="font-mono font-bold text-slate-700">{selectedEx.sourceRef}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                  <div className="bg-slate-50 p-3 rounded-md border border-slate-100 text-sm text-slate-700">
                    <span className="font-bold block mb-1 text-xs text-slate-500 uppercase">Issue Details</span>
                    {selectedEx.details}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Supervisor Decision Note</label>
                    <Textarea 
                      placeholder="Explain your decision (required for audit)..." 
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="ghost" onClick={() => setSelectedEx(null)}>Cancel</Button>
                  
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <Button 
                      variant="destructive" 
                      onClick={() => handleResolve('REJECT')}
                      className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200 border shadow-none"
                    >
                      <PackageX className="mr-2 h-4 w-4" />
                      Return / Reject
                    </Button>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleResolve('ACCEPT')}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve & Release
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </PageContainer>
  )
}