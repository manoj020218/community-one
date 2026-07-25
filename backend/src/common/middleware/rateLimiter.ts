import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { AuthenticatedRequest } from '../types';

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
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
