import crypto from 'crypto';
import { AppError } from '../../common/errors/AppError';
import { env } from '../../config/env';

function resolveKey(): Buffer {
  const secret = env.BRIDGE_SECRET || env.JWT_SECRET;
  if (!secret) {
    throw new AppError('SAMA secret configuration is missing', 503, 'SAMA_SECRET_MISSING');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', resolveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64')).join('.');
}

export function decryptSecret(value?: string): string | undefined {
  if (!value) return undefined;
  const [ivValue, tagValue, bodyValue] = value.split('.');
  if (!ivValue || !tagValue || !bodyValue) {
    throw new AppError('SAMA source secret is invalid', 500, 'SAMA_SECRET_INVALID');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    resolveKey(),
    Buffer.from(ivValue, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(bodyValue, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
