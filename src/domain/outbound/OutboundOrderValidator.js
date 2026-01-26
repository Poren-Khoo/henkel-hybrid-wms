// src/domain/outbound/OutboundOrderValidator.js

export class OutboundOrderValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OutboundOrderValidationError';
  }
}

export class OutboundOrderValidator {
  // Valid order types
  static VALID_ORDER_TYPES = ['SALES_ORDER', 'TRANSFER_OUT'];
  
  // Valid statuses
  static VALID_STATUSES = [
    'NEW', 'PENDING', 'PENDING_APPROVAL',
    'APPROVED', 'ALLOCATED', 'READY_TO_PICK',
    'PICKING', 'PACKING', 'READY_TO_SHIP', 'READY TO SHIP',
    'SHIPPED', 'REJECTED'
  ];

  // Valid status transitions
  static VALID_TRANSITIONS = {
    'NEW': ['PICKING', 'PENDING_APPROVAL'],
    'PENDING': ['PICKING', 'PENDING_APPROVAL'],
    'PENDING_APPROVAL': ['APPROVED', 'REJECTED'],
    'APPROVED': ['PICKING', 'ALLOCATED', 'READY_TO_PICK'],
    'ALLOCATED': ['PICKING'],
    'READY_TO_PICK': ['PICKING'],
    'PICKING': ['PACKING'],
    'PACKING': ['READY_TO_SHIP', 'READY TO SHIP'],
    'READY_TO_SHIP': ['SHIPPED'],
    'READY TO SHIP': ['SHIPPED'],
    'SHIPPED': [] // Terminal state
  };

  // Helper: Check if order type is commercial (sales)
  static isCommercial(type) {
    return type === 'SALES_ORDER';
  }

  // Helper: Check if order type is transfer
  static isTransfer(type) {
    return type === 'TRANSFER_OUT';
  }

  // Helper: Check if status is pending approval
  static isPendingApproval(status) {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === 'PENDING_APPROVAL' || statusUpper === 'NEW' || statusUpper === 'PENDING';
  }

  // Helper: Check if status is released/approved
  static isReleased(status) {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === 'APPROVED' || statusUpper === 'ALLOCATED' || statusUpper === 'READY_TO_PICK';
  }

  // Helper: Check if status is in workflow (picking, packing, etc.)
  static isInWorkflow(status) {
    const statusUpper = (status || '').toUpperCase();
    return ['PICKING', 'PACKING', 'READY_TO_SHIP', 'READY TO SHIP'].includes(statusUpper);
  }

  // Helper: Check if status is shipped
  static isShipped(status) {
    const statusUpper = (status || '').toUpperCase();
    return statusUpper === 'SHIPPED';
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
  static validateWorkflowAction(orderId, currentStatus, newStatus, carrier, trackingNumber) {
    if (!orderId || orderId.trim().length === 0) {
      throw new OutboundOrderValidationError("Order ID is required");
    }

    // Validate status transition
    OutboundOrderValidator.validateStatusTransition(currentStatus, newStatus);

    // If shipping, require carrier and tracking
    if (newStatus === 'SHIPPED') {
      if (!carrier || carrier.trim().length === 0) {
        throw new OutboundOrderValidationError("Carrier is required for shipment confirmation");
      }
      if (!trackingNumber || trackingNumber.trim().length === 0) {
        throw new OutboundOrderValidationError("Tracking number is required for shipment confirmation");
      }
    }

    return true;
  }

  // Get status badge configuration (returns config object, not JSX)
  static getStatusBadgeConfig(status) {
    const statusUpper = (status || '').toUpperCase();
    
    if (statusUpper === 'PENDING_APPROVAL' || statusUpper === 'NEW' || statusUpper === 'PENDING') {
      return {
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        label: 'Needs Approval',
        variant: 'default'
      };
    }
    if (statusUpper === 'APPROVED' || statusUpper === 'ALLOCATED' || statusUpper === 'READY_TO_PICK') {
      return {
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        label: 'Released',
        variant: 'default'
      };
    }
    if (statusUpper === 'PICKING') {
      return {
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Picking',
        variant: 'default'
      };
    }
    if (statusUpper === 'PACKING') {
      return {
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Packing',
        variant: 'default'
      };
    }
    if (statusUpper === 'READY_TO_SHIP' || statusUpper === 'READY TO SHIP') {
      return {
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Ready to Ship',
        variant: 'default'
      };
    }
    if (statusUpper === 'SHIPPED') {
      return {
        className: 'bg-slate-50 text-slate-600 border-slate-200',
        label: 'Shipped',
        variant: 'default'
      };
    }
    if (statusUpper === 'REJECTED') {
      return {
        className: 'bg-red-100 text-red-700 border-red-200',
        label: 'Rejected',
        variant: 'default'
      };
    }
    
    return {
      className: '',
      label: status,
      variant: 'outline'
    };
  }
}
