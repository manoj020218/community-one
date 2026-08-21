import { Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { verifyAccessToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';
import { AuthenticationError, AuthorizationError } from '../errors/AppError';

const SUPER_ROLES = ['JENIX_SUPER_ADMIN', 'JENIX_SUPPORT'];

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

export function requireAnyPermission(...permissions: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    const userPermissions = req.user.permissions || [];
    const hasAny = permissions.some((p) => userPermissions.includes(p));

    if (!hasAny) {
      return next(new AuthorizationError(`Required one of: ${permissions.join(', ')}`));
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

// Blocks a non-super user from reading or writing another society's data by supplying a
// different societyId — checks the URL (:societyId), the request body, and the query string,
// since different endpoints put it in different places (list/read endpoints often use the
// path or a query param, create/update endpoints send it in the body). A super role
// (JENIX_SUPER_ADMIN/JENIX_SUPPORT) is exempt since they manage every society and are
// expected to target one explicitly.
export function requireSocietyAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) return next(new AuthenticationError());
  if (SUPER_ROLES.includes(req.user.roleCode)) return next();

  const societyId = req.params.societyId || req.body?.societyId || (req.query?.societyId as string | undefined);
  if (societyId && req.user.societyId !== societyId) {
    return next(new AuthorizationError('Access denied to this society'));
  }

  next();
}

// Covers single-resource routes (GET/PATCH/DELETE /flats/:id, /residents/:id, ...) that
// requireSocietyAccess can't — there's no societyId in the URL/body to compare, only a
// resource id. Looks up just that document's societyId and blocks a non-super user whose own
// society doesn't match, so a caller can't read or write another society's record by ID even
// though the id itself gives no clue which society it belongs to. A missing document is left
// for the controller's own NotFoundError to report, so 404 vs 403 stays accurate.
export function requireResourceSocietyAccess(model: Model<any>, paramName: string = 'id') {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new AuthenticationError());
    if (SUPER_ROLES.includes(req.user.roleCode)) return next();

    try {
      const doc = await model.findById(req.params[paramName]).select('societyId').lean();
      if (doc && String((doc as any).societyId) !== req.user.societyId) {
        return next(new AuthorizationError('Access denied to this society'));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
