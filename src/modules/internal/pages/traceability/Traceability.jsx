import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Badge } from '../../../../components/ui/badge'
import { Input } from '../../../../components/ui/input'
import { Search, GitCommit, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { useGlobalUNS } from '../../../../context/UNSContext'
import PageContainer from '../../../../components/PageContainer'

const TOPIC_ACTION_QUERY = "Henkelv2/Shanghai/Logistics/Internal/Quality/Action/Query_Trace"
const TOPIC_RESULT = "Henkelv2/Shanghai/Logistics/Internal/Quality/State/Trace_Result"

export default function Traceability() {
  const { data, publish } = useGlobalUNS()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)

  // Get Result
  const traceData = data.raw[TOPIC_RESULT] || {}
  const timeline = traceData.timeline || []
  const isResultForQuery = traceData.batch_id === query

  const handleSearch = () => {
    setSearching(true)
    publish(TOPIC_ACTION_QUERY, { query: query })
    // In a real app we'd wait for the specific ID, but for demo we assume next msg is ours
    setTimeout(() => setSearching(false), 800)
  }

  return (
    <PageContainer title="Traceability" subtitle="End-to-End Material Genealogy">
      <div className="space-y-6">
        
        {/* SEARCH BAR */}
        <Card className="shadow-sm">
            <CardContent className="pt-6">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Enter Batch ID (e.g., B-21337) or Order ID..." 
                            className="pl-10"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleSearch} disabled={searching || !query} className="bg-indigo-600 text-white">
                        {searching ? "Tracing..." : "Trace Batch"}
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* RESULTS TIMELINE */}
        {timeline.length > 0 && isResultForQuery ? (
            <div className="relative border-l-2 border-indigo-200 ml-6 space-y-8 py-4">
                {timeline.map((event, index) => (
                    <div key={index} className="relative pl-8">
                        {/* Dot */}
                        <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${
                            event.status === 'success' ? 'bg-green-500' : 
                            event.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                        }`}></div>
                        
                        {/* Content */}
                        <Card className="shadow-sm border-slate-200">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-lg">{event.event}</h4>
                                        <Badge variant="outline" className="mt-1">{event.stage}</Badge>
                                    </div>
                                    <div className="flex items-center text-xs text-slate-400">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {new Date(event.time).toLocaleString()}
                                    </div>
                                </div>
                                <p className="text-slate-600 text-sm mt-2 font-mono bg-slate-50 p-2 rounded">
                                    {event.details}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        ) : (
            query && !searching && (
                <div className="text-center py-12 text-slate-400">
                    <GitCommit className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Enter a Batch ID to visualize its journey.</p>
                </div>
            )
        )}
      </div>
    </PageContainer>
  )
}