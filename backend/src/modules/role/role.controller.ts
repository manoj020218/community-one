import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { roleService } from './role.service';
import { sendSuccess, sendCreated } from '../../common/utils/response';

export class RoleController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = await roleService.create(req.body);
      sendCreated(res, role, 'Role created successfully');
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await roleService.findAll();
      sendSuccess(res, roles, 'Roles retrieved');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = await roleService.findById(req.params.id);
      sendSuccess(res, role);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = await roleService.update(req.params.id, req.body);
      sendSuccess(res, role, 'Role updated');
    } catch (error) {
      next(error);
    }
  }
}

export const roleController = new RoleController();
