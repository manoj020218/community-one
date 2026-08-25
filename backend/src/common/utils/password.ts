import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../../config/constants';
import { ValidationError } from '../errors/AppError';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function validatePasswordStrength(password: string): boolean {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return pattern.test(password);
}

// Resident roles get a short numeric PIN instead of a full password — typing a complex
// password is real friction for low-literacy users, and a 4-6 digit PIN is still far
// stronger than the mobile-number-as-password shortcut this replaces (mobile numbers
// circulate too widely within a society — WhatsApp groups, guard registers, deliveries
// — to double as a secret). Staff/admin roles keep full password strength enforcement.
const PIN_ROLES = ['OWNER', 'TENANT', 'FAMILY_MEMBER'];

export function validateCredentialStrength(roleCode: string, password: string): void {
  if (PIN_ROLES.includes(roleCode)) {
    if (!/^\d{4,6}$/.test(password)) {
      throw new ValidationError('PIN must be 4 to 6 digits');
    }
  } else if (!validatePasswordStrength(password)) {
    throw new ValidationError('Password must be at least 8 characters with an uppercase letter, a lowercase letter, and a number');
  }
}
