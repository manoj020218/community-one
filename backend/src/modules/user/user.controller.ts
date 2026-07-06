import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { userService } from './user.service';
import { sendSuccess, sendCreated } from '../../common/utils/response';

export class UserController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.create(req.body);
      const { passwordHash, refreshToken, ...safeUser } = (user as any).toObject();
      sendCreated(res, safeUser, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.findById(req.user!.userId);
      sendSuccess(res, user, 'Profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.findById(req.params.id);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.update(req.user!.userId, req.body);
      sendSuccess(res, user, 'Profile updated');
    } catch (error) {
      next(error);
    }
  }

  async getBySociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { societyId } = req.params;
      const users = await userService.findBySociety(societyId);
      sendSuccess(res, users, 'Users retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
