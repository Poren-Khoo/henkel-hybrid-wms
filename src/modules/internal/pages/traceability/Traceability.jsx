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
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Enter Batch ID (e.g., B-21337) or Order ID..." 
                            className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <Button 
                        onClick={handleSearch} 
                        disabled={searching || !query} 
                        className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed h-9"
                    >
                        {searching ? "Tracing..." : "Trace Batch"}
                    </Button>
                </div>
            </CardContent>
        </Card>

        {/* RESULTS TIMELINE */}
        {timeline.length > 0 && isResultForQuery ? (
            <div className="relative border-l-2 border-[#a3e635]/30 ml-6 space-y-8 py-4">
                {timeline.map((event, index) => (
                    <div key={index} className="relative pl-8">
                        {/* Dot */}
                        <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${
                            event.status === 'success' ? 'bg-[#a3e635]' : 
                            event.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
                        }`}></div>
                        
                        {/* Content */}
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-lg">{event.event}</h4>
                                        <Badge variant="outline" className="mt-1 bg-slate-50 text-slate-600 border-slate-200 border rounded-sm uppercase text-[10px] px-2">{event.stage}</Badge>
                                    </div>
                                    <div className="flex items-center text-xs text-slate-500">
                                        <Clock className="h-3 w-3 mr-1 text-slate-400" />
                                        {new Date(event.time).toLocaleString()}
                                    </div>
                                </div>
                                <p className="text-slate-600 text-sm mt-2 font-mono bg-slate-50 p-2 rounded border border-slate-100">
                                    {event.details}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        ) : (
            query && !searching && (
                <div className="flex flex-col items-center justify-center text-slate-400 py-16">
                    <GitCommit className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">No Trace Data Found</h3>
                    <p className="text-xs text-slate-500">Enter a Batch ID to visualize its journey</p>
                </div>
            )
        )}
      </div>
    </PageContainer>
  )
}