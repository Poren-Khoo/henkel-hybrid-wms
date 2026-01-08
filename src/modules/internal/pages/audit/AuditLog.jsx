import React from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../../../../components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { ScrollText } from 'lucide-react'
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

        <Card className="shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-slate-600" />
                <CardTitle className="text-lg">System Events</CardTitle>
            </div>
          </CardHeader>
          <div className="rounded-md">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details (JSON)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.log_id} className="hover:bg-slate-50">
                      <TableCell className="text-slate-500 text-xs font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{log.user}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">{log.action}</TableCell>
                      <TableCell className="max-w-md truncate font-mono text-xs text-slate-500">
                        {JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                      No events recorded yet. Perform some actions!
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