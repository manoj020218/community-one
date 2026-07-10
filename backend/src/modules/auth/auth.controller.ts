import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess, sendCreated } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      await auditService.log({
        actorUserId: result.user._id,
        actorRole: result.user.roleCode,
        moduleCode: 'CORE',
        action: 'LOGIN',
        entityType: 'User',
        entityId: result.user._id,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async onboardSociety(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.onboardSociety(req.body);
      sendCreated(res, result, 'Society registered successfully');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      sendSuccess(res, result, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.logout(req.user!.userId);
      await auditService.log({
        actorUserId: req.user!.userId,
        actorRole: req.user!.roleCode,
        moduleCode: 'CORE',
        action: 'LOGOUT',
        entityType: 'User',
        entityId: req.user!.userId,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      });
      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.changePassword(req.user!.userId, req.body);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
