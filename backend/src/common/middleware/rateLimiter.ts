import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { verifyAccessToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';

// apiRateLimiter runs before `authenticate` (auth is wired per-router, after this global
// middleware), so req.user is never populated here — decode the bearer token directly just to
// get a stable key. An invalid/forged token still falls through to IP, and the real auth
// middleware downstream rejects it regardless; this decode only affects which rate-limit
// bucket a request counts against, not whether it's authenticated.
function rateLimitKey(req: { headers: { authorization?: string }; ip?: string }): string {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
  if (token) {
    try {
      return verifyAccessToken(token).userId;
    } catch {
      // fall through to IP
    }
  }
  return req.ip || 'unknown';
}

// Keyed by user ID once authenticated (falls back to IP before auth runs, e.g. login), so one
// admin doing legitimate bulk work — deleting many wrongly-created flats one by one, since
// there's no bulk-delete — can't exhaust the budget for every other admin, resident, or guard
// sharing the same office/NAT IP.
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  skip: () => env.NODE_ENV === 'test',
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts. Please try again after 15 minutes.',
    },
  },
  skip: () => env.NODE_ENV === 'test',
});

// Guards submitting visitor requests: capped per guard, not per IP (a gate's
// shared network would otherwise throttle every guard on it together).
export const visitorCreateRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthenticatedRequest).user?.userId || req.ip || 'unknown',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many visitor requests. Please wait a moment before trying again.',
    },
  },
  skip: () => env.NODE_ENV === 'test',
});
