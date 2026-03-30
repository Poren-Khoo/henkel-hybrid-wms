// src/domain/inbound/InboundOrderService.js
import { InboundOrderValidator } from './InboundOrderValidator'

const BUSINESS_TYPES = {
  'PO': 'Purchase Receipt',
  'ASN': 'Supplier Delivery',
  'RMA': 'Sales Return',
  'PROD_FG': 'Finished Goods Receipt',
  'PROD_SFG': 'Semi-Finished Receipt',
  'SUB_RET': 'Subcontract Return',
  'TRANSFER': 'Inter-WH Transfer'
}

export class InboundOrderService {
  static buildCreateCommand(orderData) {
    // Validate first
    InboundOrderValidator.validateCreate(orderData)
    
    // Build MQTT command (DTO formatting)
    return {
      request_id: orderData.request_id ?? crypto.randomUUID(),
      ...orderData,
      supplier: InboundOrderValidator.isManufacturing(orderData.type) 
        ? orderData.lineId 
        : orderData.supplier,
      businessType: BUSINESS_TYPES[orderData.type] || orderData.type,
      lines: orderData.lines.map(l => ({
        code: l.code,
        qty: Number(l.qty),
        lot: l.lot || '',
        expiry: l.expiry || '',
      })),
      timestamp: Date.now()
    }
  }
}