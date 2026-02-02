export class WorkerValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WorkerValidationError';
  }
}

export class WorkerValidator {
  static validateCode(code) {
    if (!code || code.trim().length === 0) {
      throw new WorkerValidationError("Worker code is required");
    }
    if (code.length < 2) {
      throw new WorkerValidationError("Worker code must be at least 2 characters");
    }
    if (code.length > 20) {
      throw new WorkerValidationError("Worker code cannot exceed 20 characters");
    }
    if (!/^[A-Z0-9-]+$/i.test(code)) {
      throw new WorkerValidationError("Worker code must be alphanumeric with hyphens only");
    }
    return code.toUpperCase().trim();
  }

  static validateName(name) {
    if (!name || name.trim().length === 0) {
      throw new WorkerValidationError("Worker name is required");
    }
    if (name.length < 2) {
      throw new WorkerValidationError("Worker name must be at least 2 characters");
    }
    if (name.length > 100) {
      throw new WorkerValidationError("Worker name cannot exceed 100 characters");
    }
    return name.trim();
  }

  static validateRole(role) {
    const validRoles = ['Operator', 'Supervisor', 'Manager', 'Admin'];
    if (!validRoles.includes(role)) {
      throw new WorkerValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
    return role;
  }

  static validateEmail(email) {
    // If email is provided, validate it; otherwise it's optional
    if (email && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new WorkerValidationError("Invalid email format");
      }
      return email.trim();
    }
    return email || '';
  }

  static validatePhone(phone) {
    // Phone is optional, but if provided, should be valid format
    if (phone && phone.trim().length > 0) {
      // Basic phone validation (allows digits, spaces, hyphens, parentheses)
      const phoneRegex = /^[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(phone.trim())) {
        throw new WorkerValidationError("Invalid phone number format");
      }
      if (phone.trim().length < 7) {
        throw new WorkerValidationError("Phone number must be at least 7 characters");
      }
      return phone.trim();
    }
    return phone || '';
  }

  static validateStatus(status) {
    const validStatuses = ['Active', 'Inactive'];
    if (!validStatuses.includes(status)) {
      throw new WorkerValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    return status;
  }

  static validateAuthRole(authRole) {
    // Optional field - only validate if provided
    if (authRole && authRole.trim().length > 0) {
      const validAuthRoles = ['OPERATOR', 'APPROVER', 'ADMIN', 'FINANCE'];
      if (!validAuthRoles.includes(authRole)) {
        throw new WorkerValidationError(`Invalid auth role. Must be one of: ${validAuthRoles.join(', ')}`);
      }
      return authRole;
    }
    return authRole || null;
  }

  static validateAll(formData) {
    const errors = [];
    
    try {
      WorkerValidator.validateCode(formData.code);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      WorkerValidator.validateName(formData.name);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      WorkerValidator.validateRole(formData.role);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      WorkerValidator.validateEmail(formData.email);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      WorkerValidator.validatePhone(formData.phone);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      WorkerValidator.validateStatus(formData.status);
    } catch (e) {
      errors.push(e.message);
    }

    try {
      WorkerValidator.validateAuthRole(formData.authRole);
    } catch (e) {
      errors.push(e.message);
    }

    if (errors.length > 0) {
      throw new WorkerValidationError(errors.join('; '));
    }

    return true;
  }
}
