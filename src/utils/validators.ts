/**
 * Form validation utilities
 */

export type ValidationResult = { valid: true } | { valid: false; error: string };

export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
}

export function validatePhone(phone: string): ValidationResult {
  const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
  const cleaned = phone.replace(/\s|-/g, '');
  if (!phoneRegex.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid Indian mobile number' };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  return { valid: true };
}

export function validatePincode(pincode: string): ValidationResult {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  if (!pincodeRegex.test(pincode)) {
    return { valid: false, error: 'Please enter a valid 6-digit pincode' };
  }
  return { valid: true };
}

export function validatePositiveNumber(value: number, fieldName: string): ValidationResult {
  if (isNaN(value) || value <= 0) {
    return { valid: false, error: `${fieldName} must be greater than 0` };
  }
  return { valid: true };
}

export function validateMinLength(value: string, min: number, fieldName: string): ValidationResult {
  if (value.trim().length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  return { valid: true };
}

export function validateMaxLength(value: string, max: number, fieldName: string): ValidationResult {
  if (value.trim().length > max) {
    return { valid: false, error: `${fieldName} must be no more than ${max} characters` };
  }
  return { valid: true };
}
