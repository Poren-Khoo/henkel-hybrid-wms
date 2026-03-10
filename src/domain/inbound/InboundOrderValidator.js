// src/domain/inbound/InboundOrderValidator.js

export class InboundOrderValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'InboundOrderValidationError';
    }
  }
  
export class InboundOrderValidator {
    // Helper: Check if order type is manufacturing
    static isManufacturing(type) {
      return ['PROD_FG', 'PROD_SFG', 'SUB_RET'].includes(type);
    }
  
    // Validate order type
    static validateType(type) {
      const validTypes = ['PO', 'ASN', 'RMA', 'PROD_FG', 'PROD_SFG', 'SUB_RET', 'TRANSFER'];
      if (!validTypes.includes(type)) {
        throw new InboundOrderValidationError(
          `Invalid order type. Must be one of: ${validTypes.join(', ')}`
        );
      }
      return type;
    }
  
    // Validate supplier (required for commercial orders)
    static validateSupplier(supplier, orderType) {
      if (!InboundOrderValidator.isManufacturing(orderType)) {
        if (!supplier || supplier.trim().length === 0) {
          throw new InboundOrderValidationError("Supplier is required for commercial orders");
        }
      }
      return supplier?.trim() || '';
    }
  
    // Validate production line ID (required for manufacturing orders)
    static validateLineId(lineId, orderType) {
      if (InboundOrderValidator.isManufacturing(orderType)) {
        if (!lineId || lineId.trim().length === 0) {
          throw new InboundOrderValidationError("Production Line ID is required for manufacturing orders");
        }
      }
      return lineId?.trim() || '';
    }
  
    // Validate warehouse
    static validateWarehouse(warehouse) {
      if (!warehouse || warehouse.trim().length === 0) {
        throw new InboundOrderValidationError("Warehouse is required");
      }
      return warehouse.trim();
    }
  
    // Validate line items
    static validateLines(lines) {
      if (!Array.isArray(lines) || lines.length === 0) {
        throw new InboundOrderValidationError("At least one line item is required");
      }
  
      lines.forEach((line, index) => {
        if (!line.code || line.code.trim().length === 0) {
          throw new InboundOrderValidationError(`Line ${index + 1}: Material code is required`);
        }
        
        const qty = Number(line.qty);
        if (isNaN(qty) || qty <= 0) {
          throw new InboundOrderValidationError(`Line ${index + 1}: Quantity must be a positive number`);
        }
      });
  
      return lines;
    }
  
    // Validate ETA (optional, but if provided should be valid)
    static validateETA(eta) {
      if (eta && eta.trim().length > 0) {
        // Basic date validation (YYYY-MM-DD format)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(eta)) {
          throw new InboundOrderValidationError("ETA must be in YYYY-MM-DD format");
        }
      }
      return eta || '';
    }
  
    // Comprehensive validation for creating an inbound order
    static validateCreate(orderData) {
      const errors = [];
  
      // Validate type
      try {
        InboundOrderValidator.validateType(orderData.type);
      } catch (e) {
        errors.push(e.message);
      }
  
      // Conditional validation based on type
      try {
        InboundOrderValidator.validateSupplier(orderData.supplier, orderData.type);
      } catch (e) {
        errors.push(e.message);
      }
  
      try {
        InboundOrderValidator.validateLineId(orderData.lineId, orderData.type);
      } catch (e) {
        errors.push(e.message);
      }
  
      // Validate warehouse
      try {
        InboundOrderValidator.validateWarehouse(orderData.warehouse);
      } catch (e) {
        errors.push(e.message);
      }
  
      // Validate lines
      try {
        InboundOrderValidator.validateLines(orderData.lines);
      } catch (e) {
        errors.push(e.message);
      }
  
      // Validate ETA (optional)
      try {
        InboundOrderValidator.validateETA(orderData.eta);
      } catch (e) {
        errors.push(e.message);
      }
  
      if (errors.length > 0) {
        throw new InboundOrderValidationError(errors.join('; '));
      }
  
      return true;
    }
  }