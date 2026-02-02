import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useGlobalUNS } from '../../context/UNSContext'

const TOPIC_WORKERS = "Henkelv2/Shanghai/Logistics/MasterData/State/Workers"

/**
 * WorkerSelect
 * - Options backed by MasterData Workers UNS topic
 * - Emits selected worker.code as value
 */
export function WorkerSelect({ value, onChange, placeholder = "Select Operator...", className }) {
  const { data } = useGlobalUNS()

  const packet = data.raw[TOPIC_WORKERS]
  let workers = []

  if (packet) {
    if (packet.topics && packet.topics[0] && Array.isArray(packet.topics[0].value)) {
      workers = packet.topics[0].value
    } else {
      workers = Array.isArray(packet) ? packet : packet.items || []
    }
  }

  const activeWorkers = workers.filter(w => w.status === 'Active')

  // Ensure we always pass a string (code) to the Select, even if value is an object from older drafts
  const selectedCode = typeof value === 'string' ? value : (value && value.code) ? value.code : ''
  const selectedWorker = activeWorkers.find(w => w.code === selectedCode)

  return (
    <Select value={selectedCode || undefined} onValueChange={onChange}>
      <SelectTrigger className={className}>
        {selectedWorker ? (
          <span className="flex items-center gap-2">
            <span className="font-mono font-bold">{selectedWorker.code}</span>
            <span className="text-slate-500 text-xs truncate">
              {selectedWorker.name || selectedWorker.email || ''}
            </span>
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {activeWorkers.map(worker => (
          <SelectItem key={worker.code} value={worker.code}>
            <span className="font-mono font-bold mr-2">{worker.code}</span>
            <span className="text-slate-500 text-xs truncate">
              {worker.name || worker.email || ''}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

