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
    let type = 'SALES_ORDER';
    if (source === 'shipment') {
      type = 'TRANSFER_OUT';
    } else if (rawData.type) {
      type = rawData.type;
    }

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
    
    // Handle cost (only for costing source)
    const cost = source === 'costing' ? (rawData.total_cost || rawData.cost || 0) : null;
    
    // Handle breakdown (only for costing source)
    const breakdown = source === 'costing' ? (rawData.breakdown || null) : null;
    const basic_cost = source === 'costing' ? (rawData.basic_cost || null) : null;
    const vas_cost = source === 'costing' ? (rawData.vas_cost || null) : null;
    
    // Handle carrier and tracking (for sync source)
    const carrier = rawData.carrier || '';
    const trackingNumber = rawData.tracking_number || rawData.trackingNumber || '';
    
    // Handle items (for shipment source)
    const items = rawData.items || [];

    return {
      id,
      type,
      customer,
      destination,
      qty,
      status,
      cost,
      breakdown,
      basic_cost,
      vas_cost,
      carrier,
      trackingNumber,
      items,
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

    // Then, add sync orders (only if not already in map)
    syncOrders.forEach(order => {
      if (order && order.id && !orderMap.has(order.id)) {
        orderMap.set(order.id, order);
      }
    });

    // Finally, add shipments (they have different IDs, so no conflict)
    shipments.forEach(order => {
      if (order && order.id) {
        orderMap.set(order.id, order);
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
      
      if (tab === 'pending-release') {
        return status === 'NEW' || status === 'PENDING' || status === 'PENDING_APPROVAL';
      }
      if (tab === 'released') {
        return status === 'APPROVED' || status === 'ALLOCATED' || status === 'READY_TO_PICK';
      }
      if (tab === 'picking') {
        return status === 'PICKING';
      }
      if (tab === 'packing') {
        return status === 'PACKING';
      }
      if (tab === 'shipped') {
        return status === 'SHIPPED' || status === 'READY_TO_SHIP' || status === 'READY TO SHIP';
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
   * @param {string} status - Order status
   * @returns {Array} Array of step objects with label and status
   */
  static getProgressSteps(status) {
    const statusUpper = (status || '').toUpperCase();
    
    const steps = [
      { label: 'NEW', status: 'pending' },
      { label: 'PICKING', status: 'pending' },
      { label: 'PACKING', status: 'pending' },
      { label: 'READY TO SHIP', status: 'pending' },
      { label: 'SHIPPED', status: 'pending' },
    ];

    if (statusUpper === 'NEW' || statusUpper === 'PENDING' || statusUpper === 'PENDING_APPROVAL') {
      steps[0].status = 'active';
    } else if (statusUpper === 'APPROVED' || statusUpper === 'ALLOCATED' || statusUpper === 'READY_TO_PICK') {
      steps[0].status = 'completed';
      steps[1].status = 'active';
    } else if (statusUpper === 'PICKING') {
      steps[0].status = 'completed';
      steps[1].status = 'active';
    } else if (statusUpper === 'PACKING') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'active';
    } else if (statusUpper === 'READY_TO_SHIP' || statusUpper === 'READY TO SHIP') {
      steps[0].status = 'completed';
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[3].status = 'active';
    } else if (statusUpper === 'SHIPPED') {
      steps.forEach(step => step.status = 'completed');
    }

    return steps;
  }
}
