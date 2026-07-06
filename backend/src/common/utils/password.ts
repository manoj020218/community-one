import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '../../config/constants';

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
