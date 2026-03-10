// src/domain/inbound/ExceptionValidator.js

export class ExceptionValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExceptionValidationError';
  }
}

export class ExceptionValidator {
  // Validate resolution action
  static validateResolutionAction(action) {
    const validActions = ['ACCEPT', 'REJECT', 'WRITE_OFF'];
    if (!validActions.includes(action)) {
      throw new ExceptionValidationError(
        `Invalid resolution action. Must be one of: ${validActions.join(', ')}`
      );
    }
    return action;
  }

  // Validate exception ID
  static validateExceptionId(exceptionId) {
    if (!exceptionId || exceptionId.trim().length === 0) {
      throw new ExceptionValidationError("Exception ID is required");
    }
    return exceptionId.trim();
  }

  // Validate resolution note
  static validateResolutionNote(note, required = false) {
    if (required && (!note || note.trim().length === 0)) {
      throw new ExceptionValidationError("Resolution note is required for audit trail");
    }
    return note?.trim() || '';
  }

  // Validate severity
  static validateSeverity(severity) {
    const validSeverities = ['CRITICAL', 'WARNING', 'INFO'];
    if (severity && !validSeverities.includes(severity)) {
      throw new ExceptionValidationError(
        `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
      );
    }
    return severity || 'WARNING';
  }

  // Validate exception type
  static validateExceptionType(type) {
    const validTypes = [
      'OVER_RECEIPT',
      'QUALITY_FAIL',
      'BIN_FULL',
      'DAMAGED',
      'MISSING_DOCS',
      'RECEIPT_REJECTION',
      'MANUAL_REPORT'
    ];
    // Type is optional, but if provided should be valid
    if (type && !validTypes.includes(type)) {
      // Don't throw error for unknown types, just return as-is (for backward compatibility)
      return type;
    }
    return type || 'UNKNOWN';
  }

  // Comprehensive validation for resolution submission
  static validateResolution(resolutionData) {
    const errors = [];

    // Validate exception ID
    try {
      ExceptionValidator.validateExceptionId(resolutionData.exceptionId);
    } catch (e) {
      errors.push(e.message);
    }

    // Validate resolution action
    try {
      ExceptionValidator.validateResolutionAction(resolutionData.action);
    } catch (e) {
      errors.push(e.message);
    }

    // Validate resolution note (optional by default, but can be required)
    try {
      ExceptionValidator.validateResolutionNote(resolutionData.note, resolutionData.noteRequired || false);
    } catch (e) {
      errors.push(e.message);
    }

    if (errors.length > 0) {
      throw new ExceptionValidationError(errors.join('; '));
    }

    return true;
  }
}
