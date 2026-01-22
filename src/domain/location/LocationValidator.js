// src/domain/location/LocationValidator.js

export class LocationValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'LocationValidationError';
    }
  }
  
  export class LocationValidator {
    static validateCode(code) {
      if (!code || code.trim().length === 0) {
        throw new LocationValidationError("Location code is required");
      }
      if (code.length > 20) {
        throw new LocationValidationError("Location code cannot exceed 20 characters");
      }
      // Location codes often follow patterns like A-01-01
      if (!/^[A-Z0-9-]+$/i.test(code)) {
        throw new LocationValidationError("Location code must be alphanumeric with hyphens only");
      }
      return code.toUpperCase().trim();
    }
  
    static validateZone(zone) {
      if (!zone || zone.trim().length === 0) {
        throw new LocationValidationError("Zone is required");
      }
      if (zone.length > 10) {
        throw new LocationValidationError("Zone cannot exceed 10 characters");
      }
      return zone.toUpperCase().trim();
    }
  
    static validateWarehouse(wh) {
      if (!wh || wh.trim().length === 0) {
        throw new LocationValidationError("Warehouse code is required");
      }
      return wh.trim();
    }
  
    static validateCapacity(capacity, capacityUom) {
      const num = parseFloat(capacity);
      if (isNaN(num) || num <= 0) {
        throw new LocationValidationError("Capacity must be a positive number");
      }
      if (num > 1000000) {
        throw new LocationValidationError("Capacity cannot exceed 1,000,000");
      }
      
      const validUoms = ['KG', 'PALLET', 'M3'];
      if (!validUoms.includes(capacityUom)) {
        throw new LocationValidationError(`Invalid capacity unit. Must be one of: ${validUoms.join(', ')}`);
      }
      
      return { capacity: num, capacityUom };
    }
  
    static validateType(type) {
      const validTypes = ['Storage', 'Receiving', 'Production', 'QA Hold', 'Picking'];
      if (!validTypes.includes(type)) {
        throw new LocationValidationError(`Invalid location type. Must be one of: ${validTypes.join(', ')}`);
      }
      return type;
    }
  
    static validateTemperature(temp) {
      const validTemps = ['Ambient', 'Cool', 'Cold', 'Frozen'];
      if (!validTemps.includes(temp)) {
        throw new LocationValidationError(`Invalid temperature. Must be one of: ${validTemps.join(', ')}`);
      }
      return temp;
    }
  
    static validateAll(formData) {
      const errors = [];
      
      try {
        LocationValidator.validateCode(formData.code);
      } catch (e) {
        errors.push(e.message);
      }
  
      try {
        LocationValidator.validateZone(formData.zone);
      } catch (e) {
        errors.push(e.message);
      }
  
      try {
        LocationValidator.validateWarehouse(formData.wh);
      } catch (e) {
        errors.push(e.message);
      }
  
      try {
        LocationValidator.validateCapacity(formData.capacity, formData.capacityUom);
      } catch (e) {
        errors.push(e.message);
      }
  
      try {
        LocationValidator.validateType(formData.type);
      } catch (e) {
        errors.push(e.message);
      }
  
      try {
        LocationValidator.validateTemperature(formData.temp);
      } catch (e) {
        errors.push(e.message);
      }
  
      if (errors.length > 0) {
        throw new LocationValidationError(errors.join('; '));
      }
  
      return true;
    }
  }