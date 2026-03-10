// src/domain/inbound/PutawayTaskValidator.js

export class PutawayTaskValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PutawayTaskValidationError';
  }
}

export class PutawayTaskValidator {
  // Validate putaway confirmation scan
  static validateConfirmation(scanData, task) {
    if (!task) {
      throw new PutawayTaskValidationError("Task is required for confirmation");
    }

    if (!scanData.scanHu || scanData.scanHu.trim().length === 0) {
      throw new PutawayTaskValidationError("HU scan is required");
    }

    if (!scanData.scanBin || scanData.scanBin.trim().length === 0) {
      throw new PutawayTaskValidationError("Bin scan is required");
    }

    if (!scanData.confirmedTarget || !scanData.confirmedTarget.bin) {
      throw new PutawayTaskValidationError("Target bin must be selected");
    }

    // Validate scan matches task
    if (scanData.scanHu !== task.hu) {
      throw new PutawayTaskValidationError(`HU scan mismatch. Expected: ${task.hu}, Scanned: ${scanData.scanHu}`);
    }

    if (scanData.scanBin !== scanData.confirmedTarget.bin) {
      throw new PutawayTaskValidationError(`Bin scan mismatch. Expected: ${scanData.confirmedTarget.bin}, Scanned: ${scanData.scanBin}`);
    }

    return true;
  }

  // Validate exception report
  static validateExceptionReport(exceptionData) {
    if (!exceptionData.reason || exceptionData.reason.trim().length === 0) {
      throw new PutawayTaskValidationError("Exception reason is required");
    }

    const validReasons = ['BIN_FULL', 'DAMAGE', 'ACCESS', 'LABEL'];
    if (!validReasons.includes(exceptionData.reason)) {
      throw new PutawayTaskValidationError(`Invalid exception reason. Must be one of: ${validReasons.join(', ')}`);
    }

    return true;
  }

  // Validate task type
  static validateTaskType(type) {
    const validTypes = ['PUTAWAY', 'INTERNAL_MOVE', 'REPLENISHMENT'];
    if (type && !validTypes.includes(type)) {
      throw new PutawayTaskValidationError(`Invalid task type. Must be one of: ${validTypes.join(', ')}`);
    }
    return type || 'PUTAWAY';
  }
}