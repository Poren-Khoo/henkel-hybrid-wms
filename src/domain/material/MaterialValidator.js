// src/domain/material/MaterialValidator.js

export class MaterialValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MaterialValidationError';
  }
}

export class MaterialValidator {
    static validateCode(code) {
      if (!code || code.trim().length === 0) {
        throw new MaterialValidationError("Material code is required");
      }
      if (code.length > 20) {
        throw new MaterialValidationError("Material code cannot exceed 20 characters");
      }
      // Add format validation if needed
      if (!/^[A-Z0-9-]+$/i.test(code)) {
        throw new MaterialValidationError("Material code must be alphanumeric with hyphens only");
      }
      return code.toUpperCase().trim();
    }
  
    static validateDescription(desc) {
      if (!desc || desc.trim().length === 0) {
        throw new MaterialValidationError("Description is required");
      }
      if (desc.length < 3) {
        throw new MaterialValidationError("Description must be at least 3 characters");
      }
      if (desc.length > 200) {
        throw new MaterialValidationError("Description cannot exceed 200 characters");
      }
      return desc.trim();
    }
  
    static validateShelfLife(shelf) {
      const days = parseInt(shelf, 10);
      if (isNaN(days) || days <= 0) {
        throw new MaterialValidationError("Shelf life must be a positive number");
      }
      if (days > 3650) { // 10 years max
        throw new MaterialValidationError("Shelf life cannot exceed 3650 days");
      }
      return days;
    }
  
    static validateHazardClass(hazard) {
      const validHazards = ['None', 'Flammable', 'Corrosive', 'Toxic', 'Irritant'];
      if (!validHazards.includes(hazard)) {
        throw new MaterialValidationError(`Invalid hazard class. Must be one of: ${validHazards.join(', ')}`);
      }
      return hazard;
    }
  
    static validateStorageCondition(storage) {
      const validStorage = ['Ambient', 'Cool', 'Cold', 'Frozen'];
      if (!validStorage.includes(storage)) {
        throw new MaterialValidationError(`Invalid storage condition. Must be one of: ${validStorage.join(', ')}`);
      }
      return storage;
    }
  
    // Business rule: Hazardous materials need compatible storage
    static validateHazardStorageCompatibility(hazard, storage) {
      if (hazard !== 'None' && storage === 'Ambient') {
        // This is a business rule - you might want to allow this, but log a warning
        // For now, we'll just validate they're both valid
      }
      // Add more complex rules as needed
    }
  
    static validateAll(formData) {
      const errors = [];
      
      try {
        MaterialValidator.validateCode(formData.code);
      } catch (e) {
        errors.push(e.message);
      }
  
      try {
        MaterialValidator.validateDescription(formData.desc);
      } catch (e) {
        errors.push(e.message);
      }
  
      try {
        MaterialValidator.validateShelfLife(formData.shelf);
      } catch (e) {
        errors.push(e.message);
      }
  
      try {
        MaterialValidator.validateHazardClass(formData.hazard);
      } catch (e) {
        errors.push(e.message);
      }
  
      try {
        MaterialValidator.validateStorageCondition(formData.storage);
      } catch (e) {
        errors.push(e.message);
      }
  
      if (errors.length > 0) {
        throw new MaterialValidationError(errors.join('; '));
      }
  
      return true;
    }
}