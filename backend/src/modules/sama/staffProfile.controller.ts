import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { staffProfileService } from './staffProfile.service';

export class StaffProfileController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const societyId = typeof req.query.societyId === 'string' ? req.query.societyId : undefined;
      const context = await samaAccessService.getActorContext(req.user!, societyId);
      sendPaginated(res, await staffProfileService.listBySociety(context.societyId, req.query), 'SAMA staff profiles retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const staff = await staffProfileService.create(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_STAFF_PROFILE_CREATED', entityType: 'StaffProfile', entityId: staff._id!.toString(), newValue: { staffCode: staff.staffCode, displayName: staff.displayName }, ipAddress: req.ip });
      sendCreated(res, staff, 'SAMA staff profile created');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const staff = await staffProfileService.update(context, req.params.staffId, req.body);
      sendSuccess(res, staff, 'SAMA staff profile updated');
    } catch (error) {
      next(error);
    }
  }

  async approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.lifecycleAction(req, res, next, 'SAMA_STAFF_PROFILE_APPROVED', 'SAMA staff profile approved', (context) => staffProfileService.approve(context, req.params.staffId, req.body));
  }

  async suspend(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.lifecycleAction(req, res, next, 'SAMA_STAFF_PROFILE_SUSPENDED', 'SAMA staff profile suspended', (context) => staffProfileService.suspend(context, req.params.staffId, req.body));
  }

  async reinstate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.lifecycleAction(req, res, next, 'SAMA_STAFF_PROFILE_REINSTATED', 'SAMA staff profile reinstated', (context) => staffProfileService.reinstate(context, req.params.staffId, req.body));
  }

  async terminate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.lifecycleAction(req, res, next, 'SAMA_STAFF_PROFILE_TERMINATED', 'SAMA staff profile terminated', (context) => staffProfileService.terminate(context, req.params.staffId, req.body));
  }

  async generateLogin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const result = await staffProfileService.generateLogin(context, req.params.staffId);
      // Never persist the plaintext temp password in the audit trail — only that a login was issued.
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_STAFF_LOGIN_GENERATED', entityType: 'StaffProfile', entityId: result.staffId, newValue: { username: result.username }, ipAddress: req.ip });
      sendCreated(res, result, 'Guard login generated');
    } catch (error) {
      next(error);
    }
  }

  async resetLoginPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const result = await staffProfileService.resetLoginPassword(context, req.params.staffId);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_STAFF_LOGIN_RESET', entityType: 'StaffProfile', entityId: result.staffId, newValue: { username: result.username }, ipAddress: req.ip });
      sendSuccess(res, result, 'Guard password reset');
    } catch (error) {
      next(error);
    }
  }

  private async lifecycleAction(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
    action: string,
    message: string,
    runner: (context: Awaited<ReturnType<typeof samaAccessService.getActorContext>>) => Promise<any>
  ) {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const staff = await runner(context);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action, entityType: 'StaffProfile', entityId: staff._id!.toString(), newValue: { lifecycleStatus: staff.lifecycleStatus, accessStatus: staff.accessStatus, verificationStatus: staff.verificationStatus }, ipAddress: req.ip });
      sendSuccess(res, staff, message);
    } catch (error) {
      next(error);
    }
  }
}

export const staffProfileController = new StaffProfileController();
