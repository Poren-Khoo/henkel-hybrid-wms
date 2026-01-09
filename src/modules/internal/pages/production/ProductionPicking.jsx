import React, { useState } from 'react'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../../../../components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { Badge } from '../../../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import { 
  ShoppingCart, MapPin, ArrowRight, CheckCircle2, Package, Play, Timer
} from 'lucide-react'
import { useGlobalUNS } from '../../../../context/UNSContext'
import PageContainer from '../../../../components/PageContainer'
import UNSConnectionInfo from '../../../../components/UNSConnectionInfo'

const TOPIC_TASKS = "Henkelv2/Shanghai/Logistics/Production/State/Picking_Tasks"
const TOPIC_ACTION_CONFIRM = "Henkelv2/Shanghai/Logistics/Production/Action/Confirm_Pick"

export default function ProductionPicking() {
  const { data, publish } = useGlobalUNS()
  const [activeTab, setActiveTab] = useState("pending")
  const [processingId, setProcessingId] = useState(null)

  // 1. Get Live Data
  const taskData = data.raw[TOPIC_TASKS] || { items: [] }
  const allTasks = taskData.items || []

  // 2. Filter Tasks
  const pendingTasks = allTasks.filter(t => t.status === 'PENDING')
  // Note: Since we don't have "In Progress" logic in backend yet, we simulate it or just use Completed
  const completedTasks = allTasks.filter(t => t.status === 'COMPLETED')
  
  // 3. Handle Actions
  const handleConfirm = (taskId) => {
    setProcessingId(taskId)
    publish(TOPIC_ACTION_CONFIRM, {
      task_id: taskId,
      operator_id: "User_Admin",
      timestamp: Date.now()
    })
    // Optimistic UI update handled by UNS subscription
    setTimeout(() => setProcessingId(null), 800)
  }

  // Helper for KPI Cards
  const KPICard = ({ title, count, icon: Icon, colorClass }) => (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900">{count}</h3>
        </div>
        <div className={`h-10 w-10 rounded-full ${colorClass} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )

  // Reusable Table Component
  const TaskTable = ({ tasks, status, showAction }) => (
    <div className="rounded-md border border-slate-200">
      <Table>
        <TableHeader className="bg-slate-50 border-b border-slate-200">
          <TableRow>
            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Pick ID</TableHead>
            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Inventory Source</TableHead>
            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Material</TableHead>
            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Qty</TableHead>
            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">From Location</TableHead>
            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">To Line</TableHead>
            <TableHead className="uppercase text-[11px] font-bold text-slate-500 tracking-wider">Order Ref</TableHead>
            {showAction && <TableHead className="text-right uppercase text-[11px] font-bold text-slate-500 tracking-wider">Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TableRow key={task.task_id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                <TableCell className="font-mono text-xs font-bold text-slate-700">{task.task_id}</TableCell>
                <TableCell>
                    <Badge variant="outline" className="font-mono text-xs bg-slate-50 text-slate-600 border-slate-200 border rounded-sm">
                        {task.batch_id}
                    </Badge>
                </TableCell>
                <TableCell>
                    <div className="font-medium text-slate-900">{task.material_name}</div>
                    <div className="text-xs text-slate-500">{task.material_code}</div>
                </TableCell>
                <TableCell className="font-bold text-slate-900">{task.qty} kg</TableCell>
                <TableCell>
                    <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" /> {task.from_loc}
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-1 text-slate-900 font-medium">
                        <ArrowRight className="h-4 w-4 text-slate-400" /> {task.to_loc}
                    </div>
                </TableCell>
                <TableCell className="text-xs text-slate-500">{task.order_id}</TableCell>
                {showAction && (
                  <TableCell className="text-right">
                    <Button 
                      className="bg-[#a3e635] text-slate-900 hover:bg-[#8cd121] font-bold shadow-sm h-8 px-4"
                      disabled={processingId === task.task_id}
                      onClick={() => handleConfirm(task.task_id)}
                    >
                        {processingId === task.task_id ? "..." : "Confirm Pick"}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center text-slate-400">
                <div className="flex flex-col items-center justify-center gap-2">
                   <Package className="h-8 w-8 opacity-20" />
                   <p>No {status.toLowerCase()} tasks found.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <PageContainer 
      title="Picking" 
      subtitle="Pick materials and move to line-side staging"
      variant="standard"
    >
      <div className="space-y-6">
        <UNSConnectionInfo topic={TOPIC_TASKS} />

        {/* KPI ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard 
            title="Need Pick Tasks" 
            count={pendingTasks.length} 
            icon={Package} 
            colorClass="bg-blue-50 text-blue-600" 
          />
           <KPICard 
            title="In Progress" 
            count={0} 
            icon={Play} 
            colorClass="bg-amber-50 text-amber-600" 
          />
          <KPICard 
            title="Completed" 
            count={completedTasks.length} 
            icon={CheckCircle2} 
            colorClass="bg-emerald-50 text-emerald-600" 
          />
        </div>

        {/* MAIN TABS */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-slate-500" />
              Picking Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
                <TabsTrigger value="inprogress">In Progress (0)</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                <TaskTable tasks={pendingTasks} status="Pending" showAction={true} />
              </TabsContent>

              <TabsContent value="inprogress">
                <div className="p-12 text-center border border-dashed rounded-md bg-slate-50">
                    <p className="text-slate-500">In-progress tracking will be added in Phase 2.</p>
                </div>
              </TabsContent>

              <TabsContent value="completed">
                 <TaskTable tasks={completedTasks} status="Completed" showAction={false} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}