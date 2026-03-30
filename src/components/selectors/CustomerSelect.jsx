import React, { useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useGlobalUNS } from '../../context/UNSContext'

const TOPIC_PARTNERS = 'Henkelv2/Shanghai/Logistics/MasterData/State/BusinessPartners'

function normalizePartnerList(packet) {
  if (!packet || typeof packet !== 'object') return []
  const v = packet.topics?.[0]?.value
  if (Array.isArray(v)) return v
  if (Array.isArray(packet)) return packet
  const items = packet.items
  return Array.isArray(items) ? items : []
}

function partnerHasCustomerRole(partner) {
  const roles = Array.isArray(partner.roles) ? partner.roles : (partner.roles ? [partner.roles] : [])
  return roles.some((r) => String(r).toLowerCase() === 'customer')
}

export function CustomerSelect({ value, onChange, disabled, className }) {
  const { data } = useGlobalUNS()

  const customers = useMemo(() => {
    const list = normalizePartnerList(data.raw[TOPIC_PARTNERS])
    return list.filter(partnerHasCustomerRole)
  }, [data.raw])

  const selectValue = value && customers.some((c) => (c.name || c.code) === value) ? value : undefined

  return (
    <Select value={selectValue} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className || 'w-full'}>
        <SelectValue placeholder="Select Customer..." />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-60 overflow-y-auto">
        {customers.map((p) => (
          <SelectItem key={p.code} value={p.name || p.code}>
            {p.name || p.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
