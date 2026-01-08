// Mock service simulating Unified Namespace API responses

/**
 * Scenario A: Internal Warehouse Data
 * Path: Henkelv2/Shanghai/Logistics/Internal/Ops/State/Task_Queue
 */
export const getInternalWarehouseData = () => {
  return {
    last_updated: 1766728919,
    tasks: [
      {
        task_id: "T-7794",
        dn_no: "DN_INT_999",
        type: "PUTAWAY",
        location: "STAGING-01",
        sku: "GLUE-500",
        status: "NEW",
      },
      {
        task_id: "T-7795",
        dn_no: "DN_INT_100",
        type: "PICK",
        location: "A-01-02",
        sku: "SEALANT-X",
        status: "COMPLETED",
      },
    ],
  }
}

/**
 * Scenario B: External Warehouse Data
 * Path: Henkelv2/Shanghai/Logistics/External/Integration/State/Sync_Status
 */
export const getExternalWarehouseData = () => {
  return {
    last_updated: 1766728923,
    sync_records: [
      {
        ref_no: "DN_EXT_888",
        type: "ASN",
        "3pl_provider": "DHL",
        sku: "SEALANT-X",
        sync_status: "PENDING",
        timestamp: 1766728506044,
      },
      {
        ref_no: "DN_EXT_999",
        type: "DN",
        "3pl_provider": "KUEHNE+NAGEL",
        sku: "GLUE-200",
        sync_status: "SENT",
        timestamp: 1766728509000,
      },
    ],
  }
}

/**
 * Costing Engine Data
 * Path: Henkelv2/Shanghai/Logistics/Costing/State
 */
export const getCostingData = () => {
  return {
    // Internal Allocation Data
    internal: {
      recent_dns: [
        { dn_no: "DN_INT_999", order_date: "2024-01-15", pallet_days: 12, allocated_cost: 452.50 },
        { dn_no: "DN_INT_100", order_date: "2024-01-14", pallet_days: 8, allocated_cost: 301.67 },
        { dn_no: "DN_INT_098", order_date: "2024-01-13", pallet_days: 15, allocated_cost: 565.83 },
        { dn_no: "DN_INT_097", order_date: "2024-01-12", pallet_days: 5, allocated_cost: 188.33 },
      ],
      total_orders: 1250,
      total_pallet_days: 3450,
    },
    // External Billing Data
    external: {
      rate_card: {
        storage_per_day: 0.50,
        inbound_per_pallet: 15.00,
        outbound_per_pallet: 18.00,
        vas_per_item: 2.50,
      },
      activity_summary: {
        inbound_pallets: 450,
        storage_days: 3200,
        vas_items: 180,
      },
      invoice_items: [
        { activity: "Storage", qty: 3200, unit: "days", rate: 0.50, total: 1600.00 },
        { activity: "Inbound Handling", qty: 450, unit: "pallets", rate: 15.00, total: 6750.00 },
        { activity: "Outbound Handling", qty: 320, unit: "pallets", rate: 18.00, total: 5760.00 },
        { activity: "VAS (Labeling)", qty: 180, unit: "items", rate: 2.50, total: 450.00 },
      ],
      official_invoice_total: 14550.00,
      calculated_total: 14560.00,
    },
  }
}

/**
 * Unified Inventory Data
 * Path: Henkelv2/Shanghai/Logistics/Inventory/State/Stock_Levels
 * Combines data from both Internal and External warehouses
 */
export const getInventoryData = () => {
  return {
    last_updated: 1766728930,
    items: [
      // Internal Warehouse Items
      {
        sku: "GLUE-500",
        description: "Industrial Adhesive 500ml",
        warehouse_name: "Shanghai Internal WH",
        warehouse_type: "INT",
        qty_on_hand: 1250,
        status: "Available",
      },
      {
        sku: "SEALANT-X",
        description: "Premium Sealant Compound",
        warehouse_name: "Shanghai Internal WH",
        warehouse_type: "INT",
        qty_on_hand: 850,
        status: "Available",
      },
      {
        sku: "GLUE-200",
        description: "Industrial Adhesive 200ml",
        warehouse_name: "Shanghai Internal WH",
        warehouse_type: "INT",
        qty_on_hand: 0,
        status: "Blocked",
        block_reason: "Quality Hold",
      },
      {
        sku: "TAPE-PRO",
        description: "Professional Packing Tape",
        warehouse_name: "Shanghai Internal WH",
        warehouse_type: "INT",
        qty_on_hand: 3200,
        status: "Available",
      },
      // External Warehouse Items (3PL)
      {
        sku: "SEALANT-X",
        description: "Premium Sealant Compound",
        warehouse_name: "DHL Shanghai Hub",
        warehouse_type: "EXT",
        qty_on_hand: 450,
        status: "Available",
      },
      {
        sku: "GLUE-200",
        description: "Industrial Adhesive 200ml",
        warehouse_name: "Kuehne+Nagel WH",
        warehouse_type: "EXT",
        qty_on_hand: 680,
        status: "Available",
      },
      {
        sku: "GLUE-500",
        description: "Industrial Adhesive 500ml",
        warehouse_name: "DHL Shanghai Hub",
        warehouse_type: "EXT",
        qty_on_hand: 0,
        status: "Blocked",
        block_reason: "Quality Hold",
      },
      {
        sku: "FOAM-INS",
        description: "Insulation Foam Sheet",
        warehouse_name: "Kuehne+Nagel WH",
        warehouse_type: "EXT",
        qty_on_hand: 1200,
        status: "Available",
      },
      {
        sku: "TAPE-PRO",
        description: "Professional Packing Tape",
        warehouse_name: "DHL Shanghai Hub",
        warehouse_type: "EXT",
        qty_on_hand: 0,
        status: "Blocked",
        block_reason: "Damaged Stock",
      },
    ],
  }
}

