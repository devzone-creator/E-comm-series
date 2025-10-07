// Manual validation system without express-validator

class ManualValidator {
  constructor() {
    this.errors = {};
  }

  // Email validation
  isEmail(value, field) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value || !emailRegex.test(value)) {
      this.errors[field] = 'Please provide a valid email address';
      return false;
    }
    return true;
  }

  // Required field validation
  isRequired(value, field, message) {
    if (!value || value.trim() === '') {
      this.errors[field] = message || `${field} is required`;
      return false;
    }
    return true;
  }

  // Length validation
  isLength(value, field, min, max, message) {
    if (!value) return false;
    const length = value.trim().length;
    if (length < min || length > max) {
      this.errors[field] = message || `${field} must be between ${min} and ${max} characters`;
      return false;
    }
    return true;
  }

  // Name validation (letters and spaces only)
  isName(value, field) {
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!value || !nameRegex.test(value)) {
      this.errors[field] = `${field} can only contain letters and spaces`;
      return false;
    }
    return true;
  }

  // Phone validation (basic)
  isPhone(value, field) {
    if (!value) return true; // Optional field
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
      this.errors[field] = 'Please provide a valid phone number';
      return false;
    }
    return true;
  }

  // Password strength validation
  isStrongPassword(value, field) {
    if (!value) return false;
    
    if (value.length < 6) {
      this.errors[field] = 'Password must be at least 6 characters long';
      return false;
    }
    
    if (!/(?=.*[a-z])/.test(value)) {
      this.errors[field] = 'Password must contain at least one lowercase letter';
      return false;
    }
    
    if (!/(?=.*[A-Z])/.test(value)) {
      this.errors[field] = 'Password must contain at least one uppercase letter';
      return false;
    }
    
    if (!/(?=.*\d)/.test(value)) {
      this.errors[field] = 'Password must contain at least one number';
      return false;
    }
    
    return true;
  }

  // Password confirmation validation
  passwordsMatch(password, confirmPassword, field) {
    if (password !== confirmPassword) {
      this.errors[field] = 'Passwords do not match';
      return false;
    }
    return true;
  }

  // Get all errors
  getErrors() {
    return this.errors;
  }

  // Check if there are any errors
  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }

  // Clear all errors
  clearErrors() {
    this.errors = {};
  }
}

// Validation functions
export const validateLogin = (data) => {
  const validator = new ManualValidator();
  const { email, password } = data;

  validator.isRequired(email, 'email', 'Email is required');
  if (email) {
    validator.isEmail(email, 'email');
  }

  validator.isRequired(password, 'password', 'Password is required');

  return {
    isValid: !validator.hasErrors(),
    errors: validator.getErrors()
  };
};

export const validateRegistration = (data) => {
  const validator = new ManualValidator();
  const { email, password, confirmPassword, firstName, lastName, phone } = data;

  // Email validation
  validator.isRequired(email, 'email', 'Email is required');
  if (email) {
    validator.isEmail(email, 'email');
  }

  // Password validation
  validator.isRequired(password, 'password', 'Password is required');
  if (password) {
    validator.isStrongPassword(password, 'password');
  }

  // Confirm password validation
  validator.isRequired(confirmPassword, 'confirmPassword', 'Please confirm your password');
  if (password && confirmPassword) {
    validator.passwordsMatch(password, confirmPassword, 'confirmPassword');
  }

  // First name validation
  validator.isRequired(firstName, 'firstName', 'First name is required');
  if (firstName) {
    validator.isLength(firstName, 'firstName', 2, 50);
    validator.isName(firstName, 'firstName');
  }

  // Last name validation
  validator.isRequired(lastName, 'lastName', 'Last name is required');
  if (lastName) {
    validator.isLength(lastName, 'lastName', 2, 50);
    validator.isName(lastName, 'lastName');
  }

  // Phone validation (optional)
  if (phone) {
    validator.isPhone(phone, 'phone');
  }

  return {
    isValid: !validator.hasErrors(),
    errors: validator.getErrors()
  };
};

export const validateProfileUpdate = (data) => {
  const validator = new ManualValidator();
  const { firstName, lastName, phone } = data;

  // First name validation
  validator.isRequired(firstName, 'firstName', 'First name is required');
  if (firstName) {
    validator.isLength(firstName, 'firstName', 2, 50);
    validator.isName(firstName, 'firstName');
  }

  // Last name validation
  validator.isRequired(lastName, 'lastName', 'Last name is required');
  if (lastName) {
    validator.isLength(lastName, 'lastName', 2, 50);
    validator.isName(lastName, 'lastName');
  }

  // Phone validation (optional)
  if (phone) {
    validator.isPhone(phone, 'phone');
  }

  return {
    isValid: !validator.hasErrors(),
    errors: validator.getErrors()
  };
};

export const validatePasswordChange = (data) => {
  const validator = new ManualValidator();
  const { currentPassword, newPassword, confirmNewPassword } = data;

  validator.isRequired(currentPassword, 'currentPassword', 'Current password is required');
  
  validator.isRequired(newPassword, 'newPassword', 'New password is required');
  if (newPassword) {
    validator.isStrongPassword(newPassword, 'newPassword');
  }

  validator.isRequired(confirmNewPassword, 'confirmNewPassword', 'Please confirm your new password');
  if (newPassword && confirmNewPassword) {
    validator.passwordsMatch(newPassword, confirmNewPassword, 'confirmNewPassword');
  }

  return {
    isValid: !validator.hasErrors(),
    errors: validator.getErrors()
  };
};