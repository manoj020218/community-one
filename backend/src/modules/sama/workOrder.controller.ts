import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types';
import { sendCreated, sendPaginated, sendSuccess } from '../../common/utils/response';
import { auditService } from '../audit/audit.service';
import { samaAccessService } from './sama.access.service';
import { samaNotificationService } from './samaNotification.service';
import { workOrderService } from './workOrder.service';

export class WorkOrderController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.query.societyId === 'string' ? req.query.societyId : undefined);
      sendPaginated(res, await workOrderService.listBySociety(context.societyId, req.query), 'SAMA work orders retrieved');
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const workOrder = await workOrderService.create(context, req.body);
      await auditService.log({ societyId: context.societyId, actorUserId: context.user.userId, actorRole: context.user.roleCode, moduleCode: 'SAMA', action: 'SAMA_WORK_ORDER_CREATED', entityType: 'WorkOrder', entityId: workOrder._id!.toString(), newValue: { workOrderCode: workOrder.workOrderCode, title: workOrder.title }, ipAddress: req.ip });
      sendCreated(res, workOrder, 'SAMA work order created');
    } catch (error) {
      next(error);
    }
  }

  async assign(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const workOrder = await workOrderService.assign(context, req.params.workOrderId, req.body);
      await samaNotificationService.notifyUser(context.societyId, workOrder.requestedByUserId?.toString(), { title: 'Work order assigned', message: `${workOrder.title} has been assigned for action.`, actionUrl: `/sama/work-orders/${workOrder._id}`, entityType: 'WorkOrder', entityId: workOrder._id!.toString() });
      sendSuccess(res, workOrder, 'SAMA work order assigned');
    } catch (error) {
      next(error);
    }
  }

  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const workOrder = await workOrderService.complete(context, req.params.workOrderId, req.body);
      await samaNotificationService.notifyUser(context.societyId, workOrder.requestedByUserId?.toString(), { title: 'Work order completed', message: `${workOrder.title} has been marked completed.`, actionUrl: `/sama/work-orders/${workOrder._id}`, entityType: 'WorkOrder', entityId: workOrder._id!.toString() });
      sendSuccess(res, workOrder, 'SAMA work order completed');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendAction(req, res, next, 'SAMA work order cancelled', (context) => workOrderService.cancel(context, req.params.workOrderId, req.body), async (context, workOrder) => {
      await samaNotificationService.notifyUser(context.societyId, workOrder.requestedByUserId?.toString(), { title: 'Work order cancelled', message: `${workOrder.title} has been cancelled.`, actionUrl: `/sama/work-orders/${workOrder._id}`, entityType: 'WorkOrder', entityId: workOrder._id!.toString(), type: 'WARNING' });
    });
  }

  async reschedule(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendAction(req, res, next, 'SAMA work order rescheduled', (context) => workOrderService.reschedule(context, req.params.workOrderId, req.body), async (context, workOrder) => {
      await samaNotificationService.notifyUser(context.societyId, workOrder.requestedByUserId?.toString(), { title: 'Work order rescheduled', message: `${workOrder.title} has been rescheduled.`, actionUrl: `/sama/work-orders/${workOrder._id}`, entityType: 'WorkOrder', entityId: workOrder._id!.toString() });
    });
  }

  async escalate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    await this.sendAction(req, res, next, 'SAMA work order escalated', (context) => workOrderService.escalate(context, req.params.workOrderId, req.body), async (context, workOrder) => {
      await samaNotificationService.notifySocietyRoles(context.societyId, ['SOCIETY_ADMIN', 'FACILITY_MANAGER'], { title: 'Work order escalated', message: `${workOrder.title} needs attention at escalation level ${workOrder.escalationLevel}.`, actionUrl: `/sama/work-orders/${workOrder._id}`, entityType: 'WorkOrder', entityId: workOrder._id!.toString(), type: 'WARNING', priority: 'HIGH' });
    });
  }

  async rate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const workOrder = await workOrderService.rate(context, req.params.workOrderId, req.body);
      await samaNotificationService.notifyUser(context.societyId, workOrder.assignedByUserId?.toString(), { title: 'Work order rated', message: `${workOrder.title} received a rating of ${workOrder.residentRating}/5.`, actionUrl: `/sama/work-orders/${workOrder._id}`, entityType: 'WorkOrder', entityId: workOrder._id!.toString() });
      sendSuccess(res, workOrder, 'SAMA work order rated');
    } catch (error) {
      next(error);
    }
  }

  private async sendAction(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
    message: string,
    runner: (context: Awaited<ReturnType<typeof samaAccessService.getActorContext>>) => Promise<any>,
    notifier: (context: Awaited<ReturnType<typeof samaAccessService.getActorContext>>, workOrder: any) => Promise<void>
  ) {
    try {
      const context = await samaAccessService.getActorContext(req.user!, typeof req.body.societyId === 'string' ? req.body.societyId : undefined);
      const workOrder = await runner(context);
      await notifier(context, workOrder);
      sendSuccess(res, workOrder, message);
    } catch (error) {
      next(error);
    }
  }
}

export const workOrderController = new WorkOrderController();
