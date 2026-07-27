import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { householdAssociationService } from './householdAssociation.service';

export class HouseholdAssociationController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendPaginated(res, await householdAssociationService.listForActor(context, req.query), 'SAMA household associations retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const association = await householdAssociationService.create(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_HOUSEHOLD_ASSOCIATION_CREATED', entityType: 'HouseholdAssociation', entityId: association._id!.toString(), newValue: { flatId: association.flatId, staffProfileId: association.staffProfileId }, ipAddress: req.ip });
      sendCreated(res, association, 'SAMA household association created');
    } catch (error) {
      next(error);
    }
  }

  async approveResident(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!);
      sendSuccess(res, await householdAssociationService.approveByResident(context, req.params.associationId), 'SAMA household association approved by resident');
    } catch (error) {
      next(error);
    }
  }

  async approveSociety(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      sendSuccess(res, await householdAssociationService.approveBySociety(context, req.params.associationId), 'SAMA household association approved by society');
    } catch (error) {
      next(error);
    }
  }
}

export const householdAssociationController = new HouseholdAssociationController();
