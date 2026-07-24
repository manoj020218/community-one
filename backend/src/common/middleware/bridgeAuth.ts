import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AuthenticationError } from '../errors/AppError';

/**
 * Server-to-server auth for the billing platform bridge.
 * Constant-time compare against BRIDGE_SECRET; fails closed if unset.
 */
export function bridgeAuth(req: Request, _res: Response, next: NextFunction): void {
  const provided = req.headers['x-bridge-secret'];
  const expected = env.BRIDGE_SECRET;

  if (!expected || typeof provided !== 'string') {
    return next(new AuthenticationError('Invalid bridge secret'));
  }

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  const valid =
    providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);

  if (!valid) {
    return next(new AuthenticationError('Invalid bridge secret'));
  }

  next();
}
