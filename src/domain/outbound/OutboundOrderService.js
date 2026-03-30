// src/domain/outbound/OutboundOrderService.js
import { OutboundOrderValidator, OutboundOrderValidationError } from './OutboundOrderValidator'

export class OutboundOrderService {
  /**
   * Normalize raw MQTT data to consistent structure
   * Handles various field name variations from backend
   * @param {Object} rawData - Raw data from MQTT topic
   * @param {string} source - Source of data: 'costing' | 'sync' | 'shipment'
   * @returns {Object} Normalized order object
   */
  static normalizeOrder(rawData, source) {
    if (!rawData || typeof rawData !== 'object') {
      return null;
    }

    // Handle different ID field variations
    const id = rawData.dn_no || rawData.id || rawData.ref_no || rawData.dn_id || rawData.dnNumber || 'UNKNOWN';

    // Determine type based on source
    const type = rawData.type || 'SALES_ORDER';

    // Handle status variations
    const status = rawData.status || rawData.workflow_status || rawData.sync_status || 'NEW';

    // Handle customer/destination variations
    let customer = rawData.customer || rawData.destination || rawData['3pl_provider'] || 'Unknown';
    let destination = rawData.destination || rawData.customer || rawData['3pl_provider'] || 'Unknown';

    // Special handling for shipments
    if (source === 'shipment') {
      customer = rawData.customer || '3PL Hub';
      destination = rawData.destination || 'Unknown';
    }

    // Handle quantity (for shipments, calculate from items)
    let qty = rawData.qty || rawData.quantity || 0;
    if (source === 'shipment' && rawData.items && Array.isArray(rawData.items)) {
      qty = rawData.items.reduce((sum, i) => sum + (i.qty || 0), 0);
    }

    // Handle requested_date (per DOMAIN_MODEL.md - Required field)
    const requested_date = rawData.requested_date || rawData.requestedDate ||
      rawData.ship_date || rawData.shipDate || null;

    // Handle warehouse (per DOMAIN_MODEL.md - Required field)
    const warehouse = rawData.warehouse || rawData.warehouseCode || 'WH-SHANGHAI';

    // Handle total_cost (per DOMAIN_MODEL.md - use total_cost not cost)
    const total_cost = source === 'costing' ? (rawData.total_cost || rawData.cost || 0) : null;

    // Handle breakdown (only for costing source) - normalize breakdown structure
    let breakdown = null;
    if (source === 'costing' && rawData.breakdown) {
      breakdown = {
        // Inbound costs
        inbound_total: rawData.breakdown.inbound_total || rawData.breakdown.inboundTotal || 0,
        inbound_unit_price: rawData.breakdown.inbound_unit_price || rawData.breakdown.inboundUnitPrice || rawData.breakdown.inbound_unit || 0,

        // Outbound costs
        outbound_total: rawData.breakdown.outbound_total || rawData.breakdown.outboundTotal || 0,
        outbound_unit_price: rawData.breakdown.outbound_unit_price || rawData.breakdown.outboundUnitPrice || rawData.breakdown.outbound_unit || 0,

        // Storage costs
        storage_total: rawData.breakdown.storage_total || rawData.breakdown.storageTotal || 0,
        storage_unit_price: rawData.breakdown.storage_unit_price || rawData.breakdown.storageUnitPrice || rawData.breakdown.storage_unit || 0,
        storage_days: rawData.breakdown.storage_days || rawData.breakdown.storageDays || 10,

        // Preserve any additional breakdown fields
        ...rawData.breakdown
      };
    }
    const basic_cost = source === 'costing' ? (rawData.basic_cost || rawData.basicCost || null) : null;
    const vas_cost = source === 'costing' ? (rawData.vas_cost || rawData.vasCost || null) : null;

    // Handle carrier and tracking (for sync source)
    const carrier = rawData.carrier || '';
    const trackingNumber = rawData.tracking_number || rawData.trackingNumber || '';

    // Handle items (for shipment source)
    const items = rawData.items || [];

    // Handle lines with proper structure (per DOMAIN_MODEL.md - OutboundOrderLine)
    const lines = (rawData.lines || []).map(line => ({
      code: line.code || line.material_code || line.sku || '',
      qty: line.qty || line.quantity || 0,
      picked_qty: line.picked_qty || line.pickedQty || 0,
      packed_qty: line.packed_qty || line.packedQty || 0
    }));

    return {
      id,
      dn_no: id, // Alias for DOMAIN_MODEL.md compatibility
      type,
      customer,
      destination,
      warehouse,
      requested_date,
      qty,
      status,
      total_cost, // Changed from 'cost' per DOMAIN_MODEL.md
      breakdown,
      basic_cost,
      vas_cost,
      carrier,
      tracking_number: trackingNumber, // Changed to snake_case per DOMAIN_MODEL.md
      items,
      lines, // Properly structured lines per DOMAIN_MODEL.md
      // Enterprise fields (documented below in extended schema)
      wave_id: rawData.wave_id || rawData.waveId || null,
      priority: rawData.priority || 'NORMAL',
      context: OutboundOrderValidator.getContext(type),
      on_hold: rawData.on_hold || false,
      hold_reason: rawData.hold_reason || null,
      allocated_at: rawData.allocated_at || null,
      picked_at: rawData.picked_at || null,
      packed_at: rawData.packed_at || null,
      shipped_at: rawData.shipped_at || rawData.delivered_at || null,
      raw: rawData // Preserve raw data for reference
    };
  }

  /**
   * Merge orders from multiple sources, prioritizing costing data
   * @param {Array} costingOrders - Orders from costing workflow
   * @param {Array} syncOrders - Orders from sync status
   * @param {Array} shipments - Orders from shipment list
   * @returns {Array} Merged and deduplicated orders
   */
  static mergeOrders(costingOrders, syncOrders, shipments) {
    const orderMap = new Map();

    // First, add costing orders (highest priority - has cost info)
    costingOrders.forEach(order => {
      if (order && order.id) {
        orderMap.set(order.id, order);
      }
    });

    // Then, merge sync orders - preserve breakdown from costing if exists
    syncOrders.forEach(order => {
      if (order && order.id) {
        if (orderMap.has(order.id)) {
          // Merge: keep costing breakdown, update other fields from sync
          const existing = orderMap.get(order.id);
          orderMap.set(order.id, {
            ...order,
            // Preserve breakdown, cost, basic_cost, vas_cost from costing
            breakdown: existing.breakdown || order.breakdown,
            cost: existing.cost || order.cost,
            basic_cost: existing.basic_cost || order.basic_cost,
            vas_cost: existing.vas_cost || order.vas_cost,
          });
        } else {
          orderMap.set(order.id, order);
        }
      }
    });

    // Finally, merge shipments — update existing orders, add new ones if no match
    shipments.forEach(order => {
      if (order && order.id) {
        if (orderMap.has(order.id)) {
          const existing = orderMap.get(order.id);
          const raw = order.raw || {};
          const ci = raw.carrier_info ?? order.carrier_info;
          let carrierFromShipment;
          if (ci != null && ci !== '') {
            if (typeof ci === 'string') {
              carrierFromShipment = ci;
            } else if (typeof ci === 'object') {
              carrierFromShipment = ci.carrier ?? ci.driver ?? undefined;
            }
          }
          const trackingFromShipment = raw.tracking_no ?? raw.trackingNo;

          orderMap.set(order.id, {
            ...order,
            status: existing.status,  // always keep DN status
            breakdown: existing.breakdown || order.breakdown,
            total_cost: existing.total_cost || order.total_cost,
            basic_cost: existing.basic_cost || order.basic_cost,
            vas_cost: existing.vas_cost || order.vas_cost,
            lines: existing.lines?.length ? existing.lines : order.lines,
            picked_at: existing.picked_at ?? order.picked_at,
            shipped_at: existing.shipped_at ?? order.shipped_at,
            carrier:
              existing.carrier != null && existing.carrier !== ''
                ? existing.carrier
                : carrierFromShipment != null && carrierFromShipment !== ''
                  ? carrierFromShipment
                  : order.carrier || existing.carrier,
            tracking_number:
              existing.tracking_number != null && existing.tracking_number !== ''
                ? existing.tracking_number
                : trackingFromShipment != null && trackingFromShipment !== ''
                  ? trackingFromShipment
                  : order.tracking_number || existing.tracking_number,
          });
        } else {
          orderMap.set(order.id, order);
        }
      }
    });

    return Array.from(orderMap.values());
  }

  /**
   * Filter orders by type
   * @param {Array} orders - Array of orders
   * @param {string} type - Filter type: 'ALL' | 'SALES_ORDER' | 'TRANSFER_OUT'
   * @returns {Array} Filtered orders
   */
  static filterOrdersByType(orders, type) {
    if (type === 'ALL') {
      return orders;
    }
    return orders.filter(order => order.type === type);
  }

  /**
   * Filter orders by status (for tab-based filtering)
   * @param {Array} orders - Array of orders
   * @param {string} tab - Active tab: 'all' | 'pending-release' | 'released' | 'picking' | 'packing' | 'shipped'
   * @returns {Array} Filtered orders
   */
  static filterOrdersByStatus(orders, tab) {
    if (tab === 'all') {
      return orders;
    }

    return orders.filter(order => {
      const status = (order.status || '').toUpperCase();

      // New enterprise tabs
      if (tab === 'on-hold') {
        return status === 'ON_HOLD';
      }
      if (tab === 'awaiting-allocation') {
        return ['RELEASED', 'WAVE_ASSIGNED', 'ALLOCATING'].includes(status);
      }
      if (tab === 'allocated') {
        return status === 'ALLOCATED';
      }
      if (tab === 'in-execution') {
        return ['PICKING', 'PICKED', 'PACKING', 'PACKED'].includes(status);
      }
      if (tab === 'backorder') {
        return status === 'BACKORDER';
      }
      if (tab === 'completed') {
        return ['SHIPPED', 'DELIVERED'].includes(status);
      }

      // Legacy tabs (backwards compatibility)
      if (tab === 'pending-release') {
        return ['NEW', 'PENDING', 'PENDING_APPROVAL', 'ON_HOLD'].includes(status);
      }
      if (tab === 'released') {
        return ['APPROVED', 'ALLOCATED', 'READY_TO_PICK', 'RELEASED', 'WAVE_ASSIGNED'].includes(status);
      }
      if (tab === 'picking') {
        return status === 'PICKING';
      }
      if (tab === 'packing') {
        return status === 'PACKING';
      }
      if (tab === 'shipped') {
        return ['SHIPPED', 'DELIVERED', 'READY_TO_SHIP', 'READY TO SHIP', 'PACKED'].includes(status);
      }

      return true;
    });
  }

  /**
   * Build MQTT command payload for approval action
   * @param {string} orderId - Order ID
   * @returns {Object} MQTT payload
   */
  static buildApproveCommand(orderId) {
    if (!orderId || orderId.trim().length === 0) {
      throw new OutboundOrderValidationError("Order ID is required");
    }

    return {
      dn_no: orderId,
      action: 'APPROVE',
      timestamp: Date.now()
    };
  }

  /**
   * Build MQTT command payload for reject action
   * @param {string} orderId - Order ID
   * @param {string} reason - Reject reason
   * @param {string} currentStatus - Current order status (for validation)
   * @returns {Object} MQTT payload
   */
  static buildRejectCommand(orderId, reason, currentStatus) {
    OutboundOrderValidator.validateRejectAction(orderId, reason, currentStatus);

    return {
      dn_no: orderId,
      action: 'REJECT',
      reason: reason.trim(),
      timestamp: Date.now()
    };
  }

  /**
   * Build MQTT command payload for status update
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New status
   * @param {string} currentStatus - Current status (for validation)
   * @param {string} carrier - Carrier (required for SHIPPED)
   * @param {string} trackingNumber - Tracking number (required for SHIPPED)
   * @returns {Object} MQTT payload
   */
  static buildStatusUpdateCommand(orderId, newStatus, currentStatus, carrier, trackingNumber) {
    OutboundOrderValidator.validateWorkflowAction(orderId, currentStatus, newStatus, carrier, trackingNumber);

    const payload = {
      ref_no: orderId,
      new_status: newStatus,
      timestamp: Date.now()
    };

    // Add carrier and tracking if shipping
    if (newStatus === 'SHIPPED') {
      payload.carrier = carrier.trim();
      payload.tracking_number = trackingNumber.trim();
    }

    return payload;
  }

  // ===========================================
  // HOLD / RELEASE COMMANDS
  // ===========================================

  /**
   * Build MQTT command payload for putting order on hold
   * @param {string} orderId - Order ID
   * @param {string} reason - Reason for hold (optional)
   * @param {string} currentStatus - Current order status (for validation)
   * @returns {Object} MQTT payload
   */
  static buildHoldCommand(orderId, reason, currentStatus) {
    OutboundOrderValidator.validateHoldAction(orderId, currentStatus);

    return {
      dn_no: orderId,
      action: 'HOLD',
      reason: reason?.trim() || 'Manual hold',
      timestamp: Date.now()
    };
  }

  /**
   * Build MQTT command payload for releasing hold
   * @param {string} orderId - Order ID
   * @param {string} currentStatus - Current order status (for validation)
   * @returns {Object} MQTT payload
   */
  static buildReleaseHoldCommand(orderId, currentStatus) {
    OutboundOrderValidator.validateReleaseHoldAction(orderId, currentStatus);

    return {
      dn_no: orderId,
      action: 'RELEASE_HOLD',
      timestamp: Date.now()
    };
  }

  // ===========================================
  // PICK COMMANDS
  // ===========================================

  /**
   * Build MQTT command payload for creating pick tasks
   * @param {string} orderId - Order ID
   * @returns {Object} MQTT payload
   */
  static buildCreatePicksCommand(orderId) {
    if (!orderId || orderId.trim().length === 0) {
      throw new OutboundOrderValidationError("Order ID is required");
    }

    return {
      dn_no: orderId,
      action: 'CREATE_PICKS',
      timestamp: Date.now()
    };
  }

  // ===========================================
  // DELIVERY COMMANDS (Manufacturing)
  // ===========================================

  /**
   * Build MQTT command payload for confirming delivery to production line
   * @param {string} orderId - Order ID
   * @param {string} productionLine - Production line location
   * @returns {Object} MQTT payload
   */
  static buildConfirmDeliveryCommand(orderId, productionLine) {
    if (!orderId || orderId.trim().length === 0) {
      throw new OutboundOrderValidationError("Order ID is required");
    }

    return {
      dn_no: orderId,
      action: 'CONFIRM_DELIVERY',
      production_line: productionLine || 'DEFAULT',
      timestamp: Date.now()
    };
  }

  /**
   * Build MQTT command payload for creating a new outbound order
   * @param {Object} orderData - Order data from form
   * @returns {Object} MQTT payload
   */
  static buildCreateCommand(orderData) {
    if (!orderData || !orderData.type) {
      throw new OutboundOrderValidationError("Order type is required");
    }

    if (!orderData.lines || !Array.isArray(orderData.lines) || orderData.lines.length === 0) {
      throw new OutboundOrderValidationError("At least one line item is required");
    }

    // Validate that all lines have material code and quantity
    const validLines = orderData.lines.filter(line => line.code && line.qty);
    if (validLines.length === 0) {
      throw new OutboundOrderValidationError("All line items must have material code and quantity");
    }

    const payload = {
      type: orderData.type,
      warehouse: orderData.warehouse || 'WH01',
      operator: orderData.operator || 'Current User',
      requested_date: orderData.requestedDate || new Date().toLocaleDateString('en-CA'),
      lines: validLines.map(line => ({
        code: line.code,
        qty: Number(line.qty) || 0
      })),
      timestamp: Date.now()
    };

    // Add type-specific fields
    if (orderData.type === 'SALES_ORDER') {
      if (!orderData.customer) {
        throw new OutboundOrderValidationError("Customer is required for Sales Orders");
      }
      payload.customer = orderData.customer;
    } else if (orderData.type === 'TRANSFER_OUT') {
      if (!orderData.destination) {
        throw new OutboundOrderValidationError("Destination is required for Transfer Orders");
      }
      payload.destination = orderData.destination;
    }

    return payload;
  }

  /**
   * Calculate progress percentage based on status
   * @param {string} status - Order status
   * @returns {number} Progress percentage (0-100)
   */
  static calculateProgressPercentage(status) {
    const statusUpper = (status || '').toUpperCase();

    if (statusUpper === 'NEW' || statusUpper === 'PENDING' || statusUpper === 'PENDING_APPROVAL') {
      return 0;
    }
    if (statusUpper === 'APPROVED' || statusUpper === 'ALLOCATED' || statusUpper === 'READY_TO_PICK') {
      return 20;
    }
    if (statusUpper === 'PICKING') {
      return 40;
    }
    if (statusUpper === 'PACKING') {
      return 60;
    }
    if (statusUpper === 'READY_TO_SHIP' || statusUpper === 'READY TO SHIP') {
      return 80;
    }
    if (statusUpper === 'SHIPPED') {
      return 100;
    }

    return 0;
  }

  /**
   * Get progress steps for workflow visualization
   * Context-aware: Shows different steps for Trading vs Manufacturing
   * @param {string} status - Order status
   * @param {string} type - Order type (for context)
   * @returns {Array} Array of step objects with label and status
   */
  static getProgressSteps(status, type = 'SALES_ORDER') {
    const statusUpper = (status || '').toUpperCase();
    const context = OutboundOrderValidator.getContext(type);

    // Define steps based on context
    const tradingSteps = [
      { key: 'RELEASED', label: 'Released', status: 'pending' },
      { key: 'ALLOCATED', label: 'Allocated', status: 'pending' },
      { key: 'PICKING', label: 'Picking', status: 'pending' },
      { key: 'PACKING', label: 'Packing', status: 'pending' },
      { key: 'SHIPPED', label: 'Shipped', status: 'pending' },
    ];

    const manufacturingSteps = [
      { key: 'RELEASED', label: 'Released', status: 'pending' },
      { key: 'ALLOCATED', label: 'Allocated', status: 'pending' },
      { key: 'PICKING', label: 'Picking', status: 'pending' },
      { key: 'DELIVERED', label: 'Delivered', status: 'pending' },
    ];

    const steps = context === 'TRADING' ? tradingSteps : manufacturingSteps;

    // Status to step index mapping
    const statusOrder = {
      'NEW': 0, 'PENDING': 0, 'PENDING_APPROVAL': 0, 'ON_HOLD': 0,
      'RELEASED': 0, 'WAVE_ASSIGNED': 0.5,
      'ALLOCATING': 1, 'ALLOCATED': 1, 'BACKORDER': 1,
      'PICKING': 2, 'PICKED': 2.5,
      'PACKING': 3, 'PACKED': 3.5,
      'SHIPPED': 4, 'DELIVERED': 3
    };

    const currentIndex = statusOrder[statusUpper] ?? 0;
    const isOnHold = statusUpper === 'ON_HOLD';
    const isBackorder = statusUpper === 'BACKORDER';

    steps.forEach((step, idx) => {
      if (isOnHold) {
        step.status = idx === 0 ? 'warning' : 'pending';
      } else if (isBackorder && idx === 1) {
        step.status = 'error';
      } else if (idx < Math.floor(currentIndex)) {
        step.status = 'completed';
      } else if (idx === Math.floor(currentIndex)) {
        step.status = currentIndex % 1 === 0.5 ? 'completed' : 'active';
      }
    });

    return steps;
  }

  // ===========================================
  // ENTERPRISE TAB CONFIGURATION
  // ===========================================

  /**
   * Get tab configuration for order list
   * @returns {Array} Array of tab config objects
   */
  static getOrderListTabs() {
    return [
      { id: 'all', label: 'All', filter: null },
      { id: 'on-hold', label: 'On Hold', filter: 'on-hold', badge: 'warning' },
      { id: 'awaiting-allocation', label: 'Awaiting Allocation', filter: 'awaiting-allocation' },
      { id: 'allocated', label: 'Allocated', filter: 'allocated' },
      { id: 'in-execution', label: 'In Execution', filter: 'in-execution', badge: 'info' },
      { id: 'backorder', label: 'Backorder', filter: 'backorder', badge: 'error' },
      { id: 'completed', label: 'Completed', filter: 'completed' },
    ];
  }

  /**
   * Count orders by tab for badge display
   * @param {Array} orders - Array of orders
   * @returns {Object} Map of tab id to count
   */
  static countOrdersByTab(orders) {
    const counts = {};
    const tabs = OutboundOrderService.getOrderListTabs();

    tabs.forEach(tab => {
      if (tab.filter) {
        counts[tab.id] = OutboundOrderService.filterOrdersByStatus(orders, tab.filter).length;
      } else {
        counts[tab.id] = orders.length;
      }
    });

    return counts;
  }
}
