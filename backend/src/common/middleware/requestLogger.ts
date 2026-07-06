import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../../config/env';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === 'test') return next();

  const start = Date.now();
  const { method, url, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${method} ${url} ${statusCode} ${duration}ms - ${ip}`);
  });

  next();
}

export function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

export function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}
