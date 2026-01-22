import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useGlobalUNS } from '../../context/UNSContext'

const TOPIC_MAT = "Henkelv2/Shanghai/Logistics/MasterData/State/Materials"

export function MaterialSelect({ value, onChange, disabled, className }) {
  const { data } = useGlobalUNS()
  
  // 1. Fetch Live Master Data
  const packet = data.raw[TOPIC_MAT];
  let materials = [];
  
  // Handle UNS Envelope structure
  if (packet) {
    if (packet.topics && packet.topics[0] && Array.isArray(packet.topics[0].value)) {
      materials = packet.topics[0].value;
    } else {
      materials = Array.isArray(packet) ? packet : packet.items || [];
    }
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className || "w-full"}>
        <SelectValue placeholder="Select Material..." />
      </SelectTrigger>
      <SelectContent>
        {materials.map(mat => (
          <SelectItem key={mat.code} value={mat.code}>
            <span className="font-mono font-bold mr-2">{mat.code}</span>
            <span className="text-slate-500 text-xs truncate">{mat.desc}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}