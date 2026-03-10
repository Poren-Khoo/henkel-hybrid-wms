// src/domain/inbound/ReceiptValidator.js

export class ReceiptValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReceiptValidationError';
  }
}

export class ReceiptValidator {
  // Validate lines array (must not be empty)
  static validateLines(lines) {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new ReceiptValidationError("At least one line item is required.");
    }
    return lines;
  }

  // Validate individual line item
  static validateLine(line, index) {
    if (!line.code || line.code.trim().length === 0) {
      throw new ReceiptValidationError(`Line ${index + 1}: Material code is required`);
    }

    const qty = Number(line.qty);
    if (isNaN(qty) || qty <= 0) {
      throw new ReceiptValidationError(`Line ${index + 1}: Quantity must be a positive number`);
    }

    if (!line.batch || line.batch.trim().length === 0) {
      throw new ReceiptValidationError(`Line ${index + 1}: Batch ID is required`);
    }

    if (!line.mfgDate || line.mfgDate.trim().length === 0) {
      throw new ReceiptValidationError(`Line ${index + 1}: Manufacturing date is required`);
    }

    // Validate date format (YYYY-MM-DD)
    if (line.mfgDate && line.mfgDate.trim().length > 0) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(line.mfgDate)) {
        throw new ReceiptValidationError(`Line ${index + 1}: Manufacturing date must be in YYYY-MM-DD format`);
      }
    }

    return line;
  }

  // Validate header data (conditional based on order type)
  static validateHeader(headerData, orderType, isManufacturing, isManual = false) {
    // Skip header validation for manual receipts
    if (isManual) {
      return headerData;
    }

    if (!isManufacturing) {
      // Commercial orders: truck required
      if (!headerData.truck || headerData.truck.trim().length === 0) {
        throw new ReceiptValidationError("Truck Plate is required for Commercial Receipts.");
      }
    } else {
      // Manufacturing orders: prodLine required
      if (!headerData.prodLine || headerData.prodLine.trim().length === 0) {
        throw new ReceiptValidationError("Production Line ID is required for Manufacturing Receipts.");
      }
    }
    return headerData;
  }

  // Comprehensive validation for creating a receipt
  static validateCreate(receiptData) {
    const errors = [];

    // Validate lines array
    try {
      ReceiptValidator.validateLines(receiptData.lines);
    } catch (e) {
      errors.push(e.message);
    }

    // Validate each line
    if (receiptData.lines && receiptData.lines.length > 0) {
      receiptData.lines.forEach((line, index) => {
        try {
          ReceiptValidator.validateLine(line, index + 1);
        } catch (e) {
          errors.push(e.message);
        }
      });
    }

    // Validate header (conditional based on type, skip for manual receipts)
    if (receiptData.headerData && receiptData.orderType !== undefined && !receiptData.isManual) {
      try {
        ReceiptValidator.validateHeader(
          receiptData.headerData,
          receiptData.orderType,
          receiptData.isManufacturing,
          receiptData.isManual
        );
      } catch (e) {
        errors.push(e.message);
      }
    }

    if (errors.length > 0) {
      throw new ReceiptValidationError(errors.join('; '));
    }

    return true;
  }
}
