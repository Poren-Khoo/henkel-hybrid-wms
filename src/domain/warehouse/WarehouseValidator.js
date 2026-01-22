export class WarehouseValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WarehouseValidationError';
  }
}

export class WarehouseValidator {
  static validateCode(code) {
    if (!code || code.trim().length === 0) {
      throw new WarehouseValidationError("Warehouse code is required");
    }
    if (code.length < 3) {
      throw new WarehouseValidationError("Warehouse code must be at least 3 characters");
    }
    if (code.length > 20) {
      throw new WarehouseValidationError("Warehouse code cannot exceed 20 characters");
    }
    return code.toUpperCase().trim();
  }

  static validateName(name) {
    if (!name || name.trim().length === 0) {
      throw new WarehouseValidationError("Warehouse name is required");
    }
    if (name.length < 3) {
      throw new WarehouseValidationError("Warehouse name must be at least 3 characters");
    }
    if (name.length > 100) {
      throw new WarehouseValidationError("Warehouse name cannot exceed 100 characters");
    }
    return name.trim();
  }

  static validateType(type) {
    const validTypes = ['Plant', 'Distribution Center', 'Returns'];
    if (!validTypes.includes(type)) {
      throw new WarehouseValidationError(`Invalid warehouse type. Must be one of: ${validTypes.join(', ')}`);
    }
    return type;
  }

  static validateStatus(status) {
    const validStatuses = ['Active', 'Inactive', 'Maintenance'];
    if (!validStatuses.includes(status)) {
      throw new WarehouseValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    return status;
  }

  static validateAll(formData) {
    const errors = [];
    
    try {
      WarehouseValidator.validateCode(formData.code);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      WarehouseValidator.validateName(formData.name);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      WarehouseValidator.validateType(formData.type);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      WarehouseValidator.validateStatus(formData.status);
    } catch (e) {
      errors.push(e.message);
    }

    if (errors.length > 0) {
      throw new WarehouseValidationError(errors.join('; '));
    }

    return true;
  }
}