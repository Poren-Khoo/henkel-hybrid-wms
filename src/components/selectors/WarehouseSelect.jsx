import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useGlobalUNS } from '../../context/UNSContext'

const TOPIC_WH = "Henkelv2/Shanghai/Logistics/MasterData/State/Warehouses"

export function WarehouseSelect({ value, onChange }) {
  const { data } = useGlobalUNS()
  
  const warehouses = data.raw[TOPIC_WH] 
    ? (Array.isArray(data.raw[TOPIC_WH]) ? data.raw[TOPIC_WH] : data.raw[TOPIC_WH].items || [])
    : []

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select Facility..." />
      </SelectTrigger>
      <SelectContent>
        {warehouses.filter(w => w.status === 'Active').map(wh => (
          <SelectItem key={wh.code} value={wh.code}>
            {wh.name} ({wh.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}