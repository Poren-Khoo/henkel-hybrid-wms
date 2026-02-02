// src/domain/outbound/OutboundOrderValidator.js

export class OutboundOrderValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OutboundOrderValidationError';
  }
}

export class OutboundOrderValidator {
  // ===========================================
  // ORDER TYPES & CONTEXT CONFIGURATION
  // ===========================================

  static VALID_ORDER_TYPES = ['SALES_ORDER', 'TRANSFER_OUT', 'PRODUCTION_ISSUE'];

  /**
   * Order type configuration - determines workflow behavior
   * Trading (SALES_ORDER): Uses wave planning, requires packing
   * Manufacturing (TRANSFER_OUT, PRODUCTION_ISSUE): Direct release, skip packing
   */
  static ORDER_TYPE_CONFIG = {
    'SALES_ORDER': {
      context: 'TRADING',
      requiresWavePlanning: true,
      requiresAllocation: true,
      requiresPacking: true,
      terminalStatus: 'SHIPPED'
    },
    'TRANSFER_OUT': {
      context: 'MANUFACTURING',
      requiresWavePlanning: false,
      requiresAllocation: true,
      requiresPacking: false,
      terminalStatus: 'DELIVERED'
    },
    'PRODUCTION_ISSUE': {
      context: 'MANUFACTURING',
      requiresWavePlanning: false,
      requiresAllocation: true,
      requiresPacking: false,
      terminalStatus: 'DELIVERED'
    }
  };

  // ===========================================
  // STATUS DEFINITIONS
  // ===========================================

  static VALID_STATUSES = [
    // Initial states
    'RELEASED',           // Auto-released from ERP
    'ON_HOLD',            // Manual hold by user

    // Planning states (Trading only)
    'WAVE_ASSIGNED',      // Added to wave

    // Allocation states
    'ALLOCATING',         // Allocation in progress
    'ALLOCATED',          // Inventory reserved
    'BACKORDER',          // No inventory available

    // Execution states
    'PICKING',            // Pick tasks in progress
    'PICKED',             // All items picked

    // Packing states (Trading only)
    'PACKING',            // At pack station
    'PACKED',             // Ready for carrier

    // Terminal states
    'SHIPPED',            // Dispatched to customer (Trading)
    'DELIVERED',          // Delivered to production line (Manufacturing)

    // Legacy support
    'NEW', 'PENDING', 'PENDING_APPROVAL', 'APPROVED',
    'READY_TO_PICK', 'READY_TO_SHIP', 'READY TO SHIP', 'REJECTED'
  ];

  // ===========================================
  // STATUS TRANSITIONS
  // ===========================================

  static VALID_TRANSITIONS = {
    // New enterprise workflow
    'RELEASED': ['ON_HOLD', 'WAVE_ASSIGNED', 'ALLOCATING'],
    'ON_HOLD': ['RELEASED'],
    'WAVE_ASSIGNED': ['ALLOCATING', 'RELEASED'],
    'ALLOCATING': ['ALLOCATED', 'BACKORDER'],
    'BACKORDER': ['ALLOCATING', 'RELEASED'],
    'ALLOCATED': ['PICKING'],
    'PICKING': ['PICKED'],
    'PICKED': ['PACKING', 'DELIVERED'],  // Trading → PACKING, Manufacturing → DELIVERED
    'PACKING': ['PACKED'],
    'PACKED': ['SHIPPED'],
    'SHIPPED': [],
    'DELIVERED': [],

    // Legacy transitions (backwards compatibility)
    'NEW': ['RELEASED', 'PICKING', 'PENDING_APPROVAL'],
    'PENDING': ['RELEASED', 'PICKING', 'PENDING_APPROVAL'],
    'PENDING_APPROVAL': ['RELEASED', 'APPROVED', 'REJECTED'],
    'APPROVED': ['ALLOCATING', 'PICKING', 'ALLOCATED', 'READY_TO_PICK'],
    'READY_TO_PICK': ['PICKING'],
    'READY_TO_SHIP': ['SHIPPED'],
    'READY TO SHIP': ['SHIPPED'],
    'REJECTED': []
  };

  // ===========================================
  // ORDER TYPE HELPERS
  // ===========================================

  /** Check if order type is commercial (sales) - Trading context */
  static isCommercial(type) {
    return type === 'SALES_ORDER';
  }

  /** Check if order type is transfer */
  static isTransfer(type) {
    return type === 'TRANSFER_OUT';
  }

  /** Check if order type is production issue */
  static isProductionIssue(type) {
    return type === 'PRODUCTION_ISSUE';
  }

  /** Get the context (TRADING or MANUFACTURING) for an order type */
  static getContext(type) {
    return OutboundOrderValidator.ORDER_TYPE_CONFIG[type]?.context || 'TRADING';
  }

  /** Check if order type requires wave planning */
  static requiresWavePlanning(type) {
    return OutboundOrderValidator.ORDER_TYPE_CONFIG[type]?.requiresWavePlanning ?? false;
  }

  /** Check if order type requires packing step */
  static requiresPacking(type) {
    return OutboundOrderValidator.ORDER_TYPE_CONFIG[type]?.requiresPacking ?? true;
  }

  /** Get terminal status for order type */
  static getTerminalStatus(type) {
    return OutboundOrderValidator.ORDER_TYPE_CONFIG[type]?.terminalStatus || 'SHIPPED';
  }

  // ===========================================
  // STATUS HELPERS
  // ===========================================

  /** Check if status is pending approval (legacy) or can be held */
  static isPendingApproval(status) {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === 'PENDING_APPROVAL' || statusUpper === 'NEW' || statusUpper === 'PENDING';
  }

  /** Check if order is on hold */
  static isOnHold(status) {
    return (status || '').toUpperCase() === 'ON_HOLD';
  }

  /** Check if status is released/approved (ready for planning) */
  static isReleased(status) {
    const statusUpper = (status || '').toUpperCase();
    return ['RELEASED', 'APPROVED', 'ALLOCATED', 'READY_TO_PICK', 'WAVE_ASSIGNED'].includes(statusUpper);
  }

  /** Check if order is awaiting allocation */
  static isAwaitingAllocation(status) {
    const statusUpper = (status || '').toUpperCase();
    return ['RELEASED', 'WAVE_ASSIGNED', 'ALLOCATING'].includes(statusUpper);
  }

  /** Check if order is allocated and ready for picking */
  static isAllocated(status) {
    return (status || '').toUpperCase() === 'ALLOCATED';
  }

  /** Check if status is in workflow (picking, packing, etc.) */
  static isInWorkflow(status) {
    const statusUpper = (status || '').toUpperCase();
    return ['PICKING', 'PICKED', 'PACKING', 'PACKED', 'READY_TO_SHIP', 'READY TO SHIP'].includes(statusUpper);
  }

  /** Check if order is in picking */
  static isPicking(status) {
    return (status || '').toUpperCase() === 'PICKING';
  }

  /** Check if order is picked (ready for next step) */
  static isPicked(status) {
    return (status || '').toUpperCase() === 'PICKED';
  }

  /** Check if order is in packing */
  static isPacking(status) {
    return (status || '').toUpperCase() === 'PACKING';
  }

  /** Check if order is packed */
  static isPacked(status) {
    return (status || '').toUpperCase() === 'PACKED';
  }

  /** Check if status is shipped (terminal for Trading) */
  static isShipped(status) {
    return (status || '').toUpperCase() === 'SHIPPED';
  }

  /** Check if status is delivered (terminal for Manufacturing) */
  static isDelivered(status) {
    return (status || '').toUpperCase() === 'DELIVERED';
  }

  /** Check if order is in terminal state */
  static isTerminal(status) {
    const statusUpper = (status || '').toUpperCase();
    return ['SHIPPED', 'DELIVERED', 'REJECTED'].includes(statusUpper);
  }

  /** Check if order is backordered (no inventory) */
  static isBackorder(status) {
    return (status || '').toUpperCase() === 'BACKORDER';
  }

  // Validate order type
  static validateOrderType(type) {
    if (!type || !OutboundOrderValidator.VALID_ORDER_TYPES.includes(type)) {
      throw new OutboundOrderValidationError(
        `Invalid order type. Must be one of: ${OutboundOrderValidator.VALID_ORDER_TYPES.join(', ')}`
      );
    }
    return type;
  }

  // Validate status
  static validateStatus(status) {
    const statusUpper = (status || '').toUpperCase();
    // Normalize status variations
    const normalizedStatus = statusUpper === 'READY TO SHIP' ? 'READY_TO_SHIP' : statusUpper;

    if (!OutboundOrderValidator.VALID_STATUSES.includes(normalizedStatus)) {
      // Allow unknown statuses but return normalized version
      return normalizedStatus;
    }
    return normalizedStatus;
  }

  // Validate status transition
  static validateStatusTransition(currentStatus, newStatus) {
    const current = OutboundOrderValidator.validateStatus(currentStatus);
    const next = OutboundOrderValidator.validateStatus(newStatus);

    const allowedTransitions = OutboundOrderValidator.VALID_TRANSITIONS[current] || [];

    if (!allowedTransitions.includes(next)) {
      throw new OutboundOrderValidationError(
        `Invalid status transition from ${current} to ${next}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      );
    }

    return true;
  }

  /**
   * Collect field-level errors for outbound order create payload.
   * Returns a flat map of field -> message for easier UI binding.
   * Does NOT throw.
   *
   * @param {Object} orderData
   * @returns {Record<string, string>} fieldErrors
   */
  static collectCreateErrors(orderData) {
    const errors = {};

    if (!orderData) {
      errors.form = 'Order data is required';
      return errors;
    }

    // Header: type
    if (!orderData.type || !OutboundOrderValidator.VALID_ORDER_TYPES.includes(orderData.type)) {
      errors.type = `Order type is required (one of: ${OutboundOrderValidator.VALID_ORDER_TYPES.join(', ')})`;
    }

    // Header: warehouse
    if (!orderData.warehouse || String(orderData.warehouse).trim().length === 0) {
      errors.warehouse = 'Warehouse is required';
    }

    // Header: requested date
    if (!orderData.requestedDate || String(orderData.requestedDate).trim().length === 0) {
      errors.requestedDate = 'Requested ship date is required';
    }

    // Type-specific header fields
    if (OutboundOrderValidator.isCommercial(orderData.type)) {
      if (!orderData.customer || String(orderData.customer).trim().length === 0) {
        errors.customer = 'Customer is required for Sales Orders';
      }
    } else if (OutboundOrderValidator.isTransfer(orderData.type)) {
      if (!orderData.destination || String(orderData.destination).trim().length === 0) {
        errors.destination = 'Destination is required for Transfer Orders';
      }
    }

    // Lines: at least one with material + qty
    if (!Array.isArray(orderData.lines) || orderData.lines.length === 0) {
      errors.lines = 'At least one line item is required';
    } else {
      const hasValidLine = orderData.lines.some(
        (line) => line && line.code && String(line.qty || '').trim().length > 0
      );
      if (!hasValidLine) {
        errors.lines = 'All line items must have material and quantity';
      }
    }

    return errors;
  }

  /**
   * Validate outbound order create payload (header + lines)
   * This is intentionally simple for Phase 1 and can be extended in Phase 2
   * to return structured, field-level errors.
   *
   * @param {Object} orderData
   * @throws {OutboundOrderValidationError} when required fields are missing/invalid
   */
  static validateCreate(orderData) {
    const errors = OutboundOrderValidator.collectCreateErrors(orderData);

    if (Object.keys(errors).length > 0) {
      // Throw the first error message for non-UI callers
      const firstKey = Object.keys(errors)[0];
      throw new OutboundOrderValidationError(errors[firstKey]);
    }

    return true;
  }

  // Validate approval action
  static validateApprovalAction(orderId, currentStatus) {
    if (!orderId || orderId.trim().length === 0) {
      throw new OutboundOrderValidationError("Order ID is required");
    }

    if (!OutboundOrderValidator.isPendingApproval(currentStatus)) {
      throw new OutboundOrderValidationError(
        `Order must be in PENDING_APPROVAL status to approve. Current status: ${currentStatus}`
      );
    }

    return true;
  }

  // Validate reject action
  static validateRejectAction(orderId, reason, currentStatus) {
    if (!orderId || orderId.trim().length === 0) {
      throw new OutboundOrderValidationError("Order ID is required");
    }

    if (!OutboundOrderValidator.isPendingApproval(currentStatus)) {
      throw new OutboundOrderValidationError(
        `Order must be in PENDING_APPROVAL status to reject. Current status: ${currentStatus}`
      );
    }

    if (!reason || reason.trim().length === 0) {
      throw new OutboundOrderValidationError("Reject reason is required");
    }

    return true;
  }

  // Validate workflow action
  // @param order - Optional order object to validate line quantities for ORD-004
  static validateWorkflowAction(orderId, currentStatus, newStatus, carrier, trackingNumber, order = null) {
    if (!orderId || orderId.trim().length === 0) {
      throw new OutboundOrderValidationError("Order ID is required");
    }

    // Validate status transition
    OutboundOrderValidator.validateStatusTransition(currentStatus, newStatus);

    // If shipping, require carrier and tracking (ORD-005)
    if (newStatus === 'SHIPPED') {
      if (!carrier || carrier.trim().length === 0) {
        throw new OutboundOrderValidationError("Carrier is required for shipment confirmation");
      }
      if (!trackingNumber || trackingNumber.trim().length === 0) {
        throw new OutboundOrderValidationError("Tracking number is required for shipment confirmation");
      }

      // ORD-004: Cannot ship if picked_qty < required_qty
      if (order && order.lines && Array.isArray(order.lines)) {
        const incompleteLines = order.lines.filter(line => {
          const required = line.qty || 0;
          const picked = line.picked_qty || 0;
          return picked < required;
        });

        if (incompleteLines.length > 0) {
          const details = incompleteLines.map(l =>
            `${l.code}: picked ${l.picked_qty || 0}/${l.qty}`
          ).join(', ');
          throw new OutboundOrderValidationError(
            `Cannot ship: some lines not fully picked. ${details}`
          );
        }
      }
    }

    return true;
  }

  // ===========================================
  // STATUS BADGE CONFIGURATION
  // ===========================================

  /** Get status badge configuration (returns config object, not JSX) */
  static getStatusBadgeConfig(status) {
    const statusUpper = (status || '').toUpperCase();

    // On Hold - Red warning
    if (statusUpper === 'ON_HOLD') {
      return {
        className: 'bg-red-100 text-red-700 border-red-200',
        label: 'On Hold',
        variant: 'default',
        icon: 'pause'
      };
    }

    // Released / Ready for planning - Blue
    if (statusUpper === 'RELEASED' || statusUpper === 'APPROVED') {
      return {
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        label: 'Released',
        variant: 'default',
        icon: 'check'
      };
    }

    // Wave assigned - Indigo
    if (statusUpper === 'WAVE_ASSIGNED') {
      return {
        className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        label: 'In Wave',
        variant: 'default',
        icon: 'layers'
      };
    }

    // Allocating - Cyan
    if (statusUpper === 'ALLOCATING') {
      return {
        className: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        label: 'Allocating',
        variant: 'default',
        icon: 'loader'
      };
    }

    // Allocated - Teal
    if (statusUpper === 'ALLOCATED' || statusUpper === 'READY_TO_PICK') {
      return {
        className: 'bg-teal-100 text-teal-700 border-teal-200',
        label: 'Allocated',
        variant: 'default',
        icon: 'package'
      };
    }

    // Backorder - Gray warning
    if (statusUpper === 'BACKORDER') {
      return {
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        label: 'Backorder',
        variant: 'default',
        icon: 'alert-triangle'
      };
    }

    // Picking - Orange
    if (statusUpper === 'PICKING') {
      return {
        className: 'bg-orange-100 text-orange-700 border-orange-200',
        label: 'Picking',
        variant: 'default',
        icon: 'shopping-cart'
      };
    }

    // Picked - Purple
    if (statusUpper === 'PICKED') {
      return {
        className: 'bg-purple-100 text-purple-700 border-purple-200',
        label: 'Picked',
        variant: 'default',
        icon: 'check-circle'
      };
    }

    // Packing - Pink
    if (statusUpper === 'PACKING') {
      return {
        className: 'bg-pink-100 text-pink-700 border-pink-200',
        label: 'Packing',
        variant: 'default',
        icon: 'box'
      };
    }

    // Packed - Ready to load
    if (statusUpper === 'PACKED' || statusUpper === 'READY_TO_SHIP' || statusUpper === 'READY TO SHIP') {
      return {
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        label: 'Ready to Ship',
        variant: 'default',
        icon: 'truck'
      };
    }

    // Shipped - Terminal (Trading)
    if (statusUpper === 'SHIPPED') {
      return {
        className: 'bg-slate-100 text-slate-600 border-slate-200',
        label: 'Shipped',
        variant: 'default',
        icon: 'check-square'
      };
    }

    // Delivered - Terminal (Manufacturing)
    if (statusUpper === 'DELIVERED') {
      return {
        className: 'bg-green-100 text-green-700 border-green-200',
        label: 'Delivered',
        variant: 'default',
        icon: 'check-square'
      };
    }

    // Rejected - Terminal
    if (statusUpper === 'REJECTED') {
      return {
        className: 'bg-red-100 text-red-700 border-red-200',
        label: 'Rejected',
        variant: 'default',
        icon: 'x-circle'
      };
    }

    // Legacy: Pending Approval
    if (statusUpper === 'PENDING_APPROVAL' || statusUpper === 'NEW' || statusUpper === 'PENDING') {
      return {
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        label: 'Pending',
        variant: 'default',
        icon: 'clock'
      };
    }

    // Unknown status
    return {
      className: 'bg-gray-50 text-gray-500 border-gray-200',
      label: status,
      variant: 'outline',
      icon: 'help-circle'
    };
  }

  // ===========================================
  // HOLD / RELEASE ACTIONS
  // ===========================================

  /** Validate hold action */
  static validateHoldAction(orderId, currentStatus) {
    if (!orderId || orderId.trim().length === 0) {
      throw new OutboundOrderValidationError("Order ID is required");
    }

    const statusUpper = (currentStatus || '').toUpperCase();

    // Can only hold if in RELEASED or WAVE_ASSIGNED state
    if (statusUpper !== 'RELEASED' && statusUpper !== 'WAVE_ASSIGNED') {
      throw new OutboundOrderValidationError(
        `Cannot hold order in status: ${currentStatus}. Only RELEASED or WAVE_ASSIGNED orders can be held.`
      );
    }

    return true;
  }

  /** Validate release hold action */
  static validateReleaseHoldAction(orderId, currentStatus) {
    if (!orderId || orderId.trim().length === 0) {
      throw new OutboundOrderValidationError("Order ID is required");
    }

    if (!OutboundOrderValidator.isOnHold(currentStatus)) {
      throw new OutboundOrderValidationError(
        `Order is not on hold. Current status: ${currentStatus}`
      );
    }

    return true;
  }

  // ===========================================
  // NEXT VALID ACTIONS
  // ===========================================

  /**
   * Get the next valid actions for an order based on its status and type
   * @param {string} status - Current order status
   * @param {string} type - Order type (SALES_ORDER, TRANSFER_OUT, PRODUCTION_ISSUE)
   * @returns {Array} Array of valid action objects
   */
  static getNextActions(status, type) {
    const statusUpper = (status || '').toUpperCase();
    const context = OutboundOrderValidator.getContext(type);
    const actions = [];

    // On Hold
    if (statusUpper === 'ON_HOLD') {
      actions.push({ action: 'RELEASE_HOLD', label: 'Release Hold', variant: 'primary' });
    }

    // Released
    if (statusUpper === 'RELEASED') {
      actions.push({ action: 'HOLD', label: 'Put on Hold', variant: 'warning' });
      if (context === 'TRADING') {
        actions.push({ action: 'ADD_TO_WAVE', label: 'Add to Wave', variant: 'primary' });
      } else {
        actions.push({ action: 'ALLOCATE', label: 'Allocate', variant: 'primary' });
      }
    }

    // Wave Assigned (Trading only)
    if (statusUpper === 'WAVE_ASSIGNED') {
      actions.push({ action: 'HOLD', label: 'Put on Hold', variant: 'warning' });
      actions.push({ action: 'REMOVE_FROM_WAVE', label: 'Remove from Wave', variant: 'secondary' });
    }

    // Allocated
    if (statusUpper === 'ALLOCATED') {
      actions.push({ action: 'CREATE_PICKS', label: 'Create Pick Tasks', variant: 'primary' });
    }

    // Backorder
    if (statusUpper === 'BACKORDER') {
      actions.push({ action: 'RETRY_ALLOCATION', label: 'Retry Allocation', variant: 'primary' });
      actions.push({ action: 'RELEASE', label: 'Back to Released', variant: 'secondary' });
    }

    // Picked
    if (statusUpper === 'PICKED') {
      if (context === 'TRADING') {
        actions.push({ action: 'START_PACKING', label: 'Start Packing', variant: 'primary' });
      } else {
        actions.push({ action: 'CONFIRM_DELIVERY', label: 'Confirm Delivery', variant: 'primary' });
      }
    }

    // Packed (Trading only)
    if (statusUpper === 'PACKED') {
      actions.push({ action: 'CONFIRM_SHIP', label: 'Confirm Shipment', variant: 'primary' });
    }

    return actions;
  }
}
