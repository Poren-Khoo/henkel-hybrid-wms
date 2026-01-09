import React from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../../../../components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { ScrollText, FileText } from 'lucide-react'
import { useGlobalUNS } from '../../../../context/UNSContext'
import PageContainer from '../../../../components/PageContainer'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

const TOPIC_AUDIT = "Henkelv2/Shanghai/Logistics/Exceptions/State/Audit_Log"

export default function AuditLog() {
  const { data } = useGlobalUNS()
  const auditData = data.raw[TOPIC_AUDIT] || { items: [] }
  const logs = auditData.items || []

  return (
    <PageContainer title="Audit Log" subtitle="Immutable record of all system actions">
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_AUDIT} />

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-slate-500" />
                <CardTitle className="text-lg font-bold text-slate-900">System Events</CardTitle>
            </div>
          </CardHeader>
          <div className="rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Time</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">User</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Module</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Action</TableHead>
                  <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Details (JSON)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.log_id} className="bg-white border-b border-slate-100 hover:bg-slate-50 last:border-0 transition-colors">
                      <TableCell className="text-slate-500 text-xs font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{log.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 border rounded-sm uppercase text-[10px] px-2">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">{log.action}</TableCell>
                      <TableCell className="max-w-md truncate font-mono text-xs text-slate-500">
                        {JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-10 w-10 text-slate-300 mb-2" />
                        <p className="text-sm font-medium">No events recorded yet</p>
                        <p className="text-xs text-slate-400 mt-1">Perform some actions!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}