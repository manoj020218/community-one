import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';
import { AuthenticationError, AuthorizationError } from '../errors/AppError';

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
}

export function requirePermission(...permissions: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    const userPermissions = req.user.permissions || [];
    const hasAll = permissions.every((p) => userPermissions.includes(p));

    if (!hasAll) {
      return next(new AuthorizationError(`Required permissions: ${permissions.join(', ')}`));
    }

    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    if (!roles.includes(req.user.roleCode)) {
      return next(new AuthorizationError('Insufficient role'));
    }

    next();
  };
}

export function requireSocietyAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) return next(new AuthenticationError());

  const { societyId } = req.params;
  const superRoles = ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'];

  if (superRoles.includes(req.user.roleCode)) return next();

  if (societyId && req.user.societyId !== societyId) {
    return next(new AuthorizationError('Access denied to this society'));
  }

  next();
}
