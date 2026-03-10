// src/domain/container/ContainerValidator.js

export class ContainerValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContainerValidationError';
  }
}

export class ContainerValidator {
  static validateId(id) {
    if (!id || id.trim().length === 0) {
      throw new ContainerValidationError("Container ID is required");
    }
    if (id.length > 20) {
      throw new ContainerValidationError("Container ID cannot exceed 20 characters");
    }
    return id.toUpperCase().trim();
  }

  static validateType(type) {
    const validTypes = ['IBC', 'DRUM', 'TOTE', 'PALLET', 'CAGE'];
    if (!validTypes.includes(type)) {
      throw new ContainerValidationError(`Invalid container type. Must be one of: ${validTypes.join(', ')}`);
    }
    return type;
  }

  static validateCapacity(capacity, capacityUom) {
    const num = parseFloat(capacity);
    if (isNaN(num) || num <= 0) {
      throw new ContainerValidationError("Capacity must be a positive number");
    }
    
    const validUoms = ['L', 'KG', 'M3'];
    if (!validUoms.includes(capacityUom)) {
      throw new ContainerValidationError(`Invalid capacity unit. Must be one of: ${validUoms.join(', ')}`);
    }
    
    return { capacity: num, capacityUom };
  }

  static validateTare(tare, tareUom) {
    const num = parseFloat(tare);
    if (isNaN(num) || num < 0) {
      throw new ContainerValidationError("Tare weight must be a non-negative number");
    }
    
    const validUoms = ['KG', 'L'];
    if (!validUoms.includes(tareUom)) {
      throw new ContainerValidationError(`Invalid tare unit. Must be one of: ${validUoms.join(', ')}`);
    }
    
    return { tare: num, tareUom };
  }

  static validateCleaning(cleaning) {
    const validCleaning = ['Clean', 'Requires Cleaning', 'Quarantine'];
    if (!validCleaning.includes(cleaning)) {
      throw new ContainerValidationError(`Invalid cleaning status. Must be one of: ${validCleaning.join(', ')}`);
    }
    return cleaning;
  }

  static validateStatus(status) {
    const validStatuses = ['Available', 'In Use', 'Maintenance', 'Quarantine'];
    if (!validStatuses.includes(status)) {
      throw new ContainerValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    return status;
  }

  static validateAll(formData) {
    const errors = [];
    
    try {
      ContainerValidator.validateId(formData.id);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      ContainerValidator.validateType(formData.type);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      ContainerValidator.validateCapacity(formData.capacity, formData.capacityUom);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      ContainerValidator.validateTare(formData.tare, formData.tareUom);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      ContainerValidator.validateCleaning(formData.cleaning);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      ContainerValidator.validateStatus(formData.status);
    } catch (e) {
      errors.push(e.message);
    }

    if (errors.length > 0) {
      throw new ContainerValidationError(errors.join('; '));
    }

    return true;
  }
}