export class PartnerValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PartnerValidationError';
  }
}

export class PartnerValidator {
  static validateCode(code) {
    if (!code || code.trim().length === 0) {
      throw new PartnerValidationError("Partner code is required");
    }
    if (code.length < 2) {
      throw new PartnerValidationError("Partner code must be at least 2 characters");
    }
    if (code.length > 20) {
      throw new PartnerValidationError("Partner code cannot exceed 20 characters");
    }
    return code.toUpperCase().trim();
  }

  static validateName(name) {
    if (!name || name.trim().length === 0) {
      throw new PartnerValidationError("Partner name is required");
    }
    if (name.length < 2) {
      throw new PartnerValidationError("Partner name must be at least 2 characters");
    }
    if (name.length > 100) {
      throw new PartnerValidationError("Partner name cannot exceed 100 characters");
    }
    return name.trim();
  }

  static validateRoles(roles) {
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new PartnerValidationError("At least one role must be selected");
    }
    
    const validRoles = ['Supplier', 'Customer', 'Carrier'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    
    if (invalidRoles.length > 0) {
      throw new PartnerValidationError(`Invalid roles: ${invalidRoles.join(', ')}. Must be one of: ${validRoles.join(', ')}`);
    }
    
    return roles;
  }

  static validateEmail(email) {
    // If email is provided, validate it; otherwise it's optional
    if (email && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new PartnerValidationError("Invalid email format");
      }
      return email.trim();
    }
    return email || '';
  }

  static validateAll(formData) {
    const errors = [];
    
    try {
      PartnerValidator.validateCode(formData.code);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      PartnerValidator.validateName(formData.name);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      PartnerValidator.validateRoles(formData.roles || []);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      PartnerValidator.validateEmail(formData.email);
    } catch (e) {
      errors.push(e.message);
    }

    if (errors.length > 0) {
      throw new PartnerValidationError(errors.join('; '));
    }

    return true;
  }
}
