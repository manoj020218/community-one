import { Router, NextFunction, Response } from 'express';
import { authenticate, requireAnyPermission, requirePermission } from '../../common/middleware/auth';
import { AuthenticatedRequest } from '../../common/types';
import { sendSuccess } from '../../common/utils/response';
import { PERMISSIONS } from '../../config/constants';
import { accessCredentialController } from './accessCredential.controller';
import { samaAccessEventController } from './samaAccessEvent.controller';
import { accessPolicyController } from './accessPolicy.controller';
import { householdAssociationController } from './householdAssociation.controller';
import { householdPaymentController } from './householdPayment.controller';
import { householdRateCardController } from './householdRateCard.controller';
import { samaAccessService } from './sama.access.service';
import { samaController } from './sama.controller';
import { samaDeviceBindingController } from './samaDeviceBinding.controller';
import { SAMA_ROUTE_PERMISSIONS } from './sama.manifest';
import { samaReadController } from './samaRead.controller';
import { samaReportController } from './samaReport.controller';
import { samaSourceService } from './samaSource.service';
import { samaSyncController } from './samaSync.controller';
import { serviceProviderController } from './serviceProvider.controller';
import { staffCategoryController } from './staffCategory.controller';
import { staffEngagementController } from './staffEngagement.controller';
import { staffProfileController } from './staffProfile.controller';
import { workOrderController } from './workOrder.controller';

const router: Router = Router();

async function resolveSocietyId(req: AuthenticatedRequest) {
  const societyId = typeof req.body.societyId === 'string'
    ? req.body.societyId
    : typeof req.query.societyId === 'string'
      ? req.query.societyId
      : undefined;
  return samaAccessService.getActorContext(req.user!, societyId);
}

router.use(authenticate);
router.get('/context', requireAnyPermission(...SAMA_ROUTE_PERMISSIONS), samaController.getContext.bind(samaController));
router.get('/staff-profiles', requireAnyPermission(PERMISSIONS.SAMA_VIEW_STAFF, PERMISSIONS.SAMA_CREATE_STAFF, PERMISSIONS.SAMA_EDIT_STAFF, PERMISSIONS.SAMA_APPROVE_STAFF), staffProfileController.list.bind(staffProfileController));
router.post('/staff-profiles', requirePermission(PERMISSIONS.SAMA_CREATE_STAFF), staffProfileController.create.bind(staffProfileController));
router.patch('/staff-profiles/:staffId', requirePermission(PERMISSIONS.SAMA_EDIT_STAFF), staffProfileController.update.bind(staffProfileController));
router.post('/staff-profiles/:staffId/approve', requirePermission(PERMISSIONS.SAMA_APPROVE_STAFF), staffProfileController.approve.bind(staffProfileController));
router.post('/staff-profiles/:staffId/suspend', requirePermission(PERMISSIONS.SAMA_EDIT_STAFF), staffProfileController.suspend.bind(staffProfileController));
router.post('/staff-profiles/:staffId/reinstate', requirePermission(PERMISSIONS.SAMA_APPROVE_STAFF), staffProfileController.reinstate.bind(staffProfileController));
router.post('/staff-profiles/:staffId/terminate', requirePermission(PERMISSIONS.SAMA_APPROVE_STAFF), staffProfileController.terminate.bind(staffProfileController));
router.get('/staff-categories', requireAnyPermission(PERMISSIONS.SAMA_VIEW_STAFF, PERMISSIONS.SAMA_MANAGE_STAFF_CATEGORIES), staffCategoryController.list.bind(staffCategoryController));
router.post('/staff-categories', requirePermission(PERMISSIONS.SAMA_MANAGE_STAFF_CATEGORIES), staffCategoryController.create.bind(staffCategoryController));
router.patch('/staff-categories/:categoryId', requirePermission(PERMISSIONS.SAMA_MANAGE_STAFF_CATEGORIES), staffCategoryController.update.bind(staffCategoryController));
router.get('/engagements', requireAnyPermission(PERMISSIONS.SAMA_VIEW_STAFF, PERMISSIONS.SAMA_CREATE_STAFF, PERMISSIONS.SAMA_EDIT_STAFF), staffEngagementController.list.bind(staffEngagementController));
router.post('/engagements', requirePermission(PERMISSIONS.SAMA_CREATE_STAFF), staffEngagementController.create.bind(staffEngagementController));
router.get('/household-associations', requireAnyPermission(PERMISSIONS.SAMA_MANAGE_HOUSEHOLD_ASSOCIATIONS, PERMISSIONS.SAMA_VIEW_SELF), householdAssociationController.list.bind(householdAssociationController));
router.post('/household-associations', requirePermission(PERMISSIONS.SAMA_MANAGE_HOUSEHOLD_ASSOCIATIONS), householdAssociationController.create.bind(householdAssociationController));
router.post('/household-associations/:associationId/approve-resident', requireAnyPermission(PERMISSIONS.SAMA_MANAGE_HOUSEHOLD_ASSOCIATIONS, PERMISSIONS.SAMA_VIEW_SELF), householdAssociationController.approveResident.bind(householdAssociationController));
router.post('/household-associations/:associationId/approve-society', requirePermission(PERMISSIONS.SAMA_MANAGE_HOUSEHOLD_ASSOCIATIONS), householdAssociationController.approveSociety.bind(householdAssociationController));
router.get('/household-rate-cards', requireAnyPermission(PERMISSIONS.SAMA_MANAGE_HOUSEHOLD_PAYMENTS, PERMISSIONS.SAMA_VIEW_SELF), householdRateCardController.list.bind(householdRateCardController));
router.post('/household-rate-cards', requirePermission(PERMISSIONS.SAMA_MANAGE_HOUSEHOLD_PAYMENTS), householdRateCardController.create.bind(householdRateCardController));
router.patch('/household-rate-cards/:rateCardId', requirePermission(PERMISSIONS.SAMA_MANAGE_HOUSEHOLD_PAYMENTS), householdRateCardController.update.bind(householdRateCardController));
router.get('/household-payments', requireAnyPermission(PERMISSIONS.SAMA_MANAGE_HOUSEHOLD_PAYMENTS, PERMISSIONS.SAMA_VIEW_SELF), householdPaymentController.list.bind(householdPaymentController));
router.post('/household-payments', requirePermission(PERMISSIONS.SAMA_MANAGE_HOUSEHOLD_PAYMENTS), householdPaymentController.create.bind(householdPaymentController));
router.patch('/household-payments/:paymentId', requirePermission(PERMISSIONS.SAMA_MANAGE_HOUSEHOLD_PAYMENTS), householdPaymentController.update.bind(householdPaymentController));
router.get('/service-providers', requireAnyPermission(PERMISSIONS.SAMA_VIEW_SOCIETY, PERMISSIONS.SAMA_VIEW_STAFF, PERMISSIONS.SAMA_MANAGE_SERVICE_POOL), serviceProviderController.list.bind(serviceProviderController));
router.post('/service-providers', requirePermission(PERMISSIONS.SAMA_MANAGE_SERVICE_POOL), serviceProviderController.create.bind(serviceProviderController));
router.patch('/service-providers/:providerId', requirePermission(PERMISSIONS.SAMA_MANAGE_SERVICE_POOL), serviceProviderController.update.bind(serviceProviderController));
router.get('/work-orders', requireAnyPermission(PERMISSIONS.SAMA_VIEW_SOCIETY, PERMISSIONS.SAMA_MANAGE_SERVICE_POOL, PERMISSIONS.SAMA_CREATE_WORK_ORDER, PERMISSIONS.SAMA_ASSIGN_WORK_ORDER, PERMISSIONS.SAMA_COMPLETE_WORK_ORDER), workOrderController.list.bind(workOrderController));
router.post('/work-orders', requirePermission(PERMISSIONS.SAMA_CREATE_WORK_ORDER), workOrderController.create.bind(workOrderController));
router.patch('/work-orders/:workOrderId/assign', requirePermission(PERMISSIONS.SAMA_ASSIGN_WORK_ORDER), workOrderController.assign.bind(workOrderController));
router.patch('/work-orders/:workOrderId/complete', requirePermission(PERMISSIONS.SAMA_COMPLETE_WORK_ORDER), workOrderController.complete.bind(workOrderController));
router.patch('/work-orders/:workOrderId/cancel', requireAnyPermission(PERMISSIONS.SAMA_ASSIGN_WORK_ORDER, PERMISSIONS.SAMA_MANAGE_SERVICE_POOL), workOrderController.cancel.bind(workOrderController));
router.patch('/work-orders/:workOrderId/reschedule', requireAnyPermission(PERMISSIONS.SAMA_ASSIGN_WORK_ORDER, PERMISSIONS.SAMA_MANAGE_SERVICE_POOL), workOrderController.reschedule.bind(workOrderController));
router.patch('/work-orders/:workOrderId/escalate', requireAnyPermission(PERMISSIONS.SAMA_ASSIGN_WORK_ORDER, PERMISSIONS.SAMA_MANAGE_SERVICE_POOL), workOrderController.escalate.bind(workOrderController));
router.post('/work-orders/:workOrderId/rate', requireAnyPermission(PERMISSIONS.SAMA_VIEW_SELF, PERMISSIONS.SAMA_MANAGE_SERVICE_POOL, PERMISSIONS.SAMA_COMPLETE_WORK_ORDER), workOrderController.rate.bind(workOrderController));
router.get('/access-policies', requireAnyPermission(PERMISSIONS.SAMA_MANAGE_ACCESS, PERMISSIONS.SAMA_MANAGE_CREDENTIALS), accessPolicyController.list.bind(accessPolicyController));
router.post('/access-policies', requirePermission(PERMISSIONS.SAMA_MANAGE_ACCESS), accessPolicyController.create.bind(accessPolicyController));
router.patch('/access-policies/:policyId', requirePermission(PERMISSIONS.SAMA_MANAGE_ACCESS), accessPolicyController.update.bind(accessPolicyController));
router.get('/credentials', requireAnyPermission(PERMISSIONS.SAMA_MANAGE_CREDENTIALS, PERMISSIONS.SAMA_MANAGE_ACCESS), accessCredentialController.list.bind(accessCredentialController));
router.post('/credentials', requirePermission(PERMISSIONS.SAMA_MANAGE_CREDENTIALS), accessCredentialController.create.bind(accessCredentialController));
router.patch('/credentials/:credentialId/revoke', requirePermission(PERMISSIONS.SAMA_MANAGE_CREDENTIALS), accessCredentialController.revoke.bind(accessCredentialController));
router.get('/external-devices', requireAnyPermission(PERMISSIONS.SAMA_MANAGE_ACCESS, PERMISSIONS.SAMA_SYNC), samaDeviceBindingController.listExternal.bind(samaDeviceBindingController));
router.get('/device-bindings', requireAnyPermission(PERMISSIONS.SAMA_MANAGE_ACCESS, PERMISSIONS.SAMA_VIEW_AUDIT), samaDeviceBindingController.list.bind(samaDeviceBindingController));
router.post('/device-bindings', requirePermission(PERMISSIONS.SAMA_MANAGE_ACCESS), samaDeviceBindingController.create.bind(samaDeviceBindingController));
router.patch('/device-bindings/:bindingId', requirePermission(PERMISSIONS.SAMA_MANAGE_ACCESS), samaDeviceBindingController.update.bind(samaDeviceBindingController));
router.patch('/access-events/:eventId/resolve', requirePermission(PERMISSIONS.SAMA_MANAGE_ACCESS), samaAccessEventController.resolve.bind(samaAccessEventController));
router.get('/source', requireAnyPermission(PERMISSIONS.SAMA_CONFIGURE, PERMISSIONS.SAMA_SYNC, PERMISSIONS.SAMA_VIEW_SOCIETY), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const context = await resolveSocietyId(req);
    sendSuccess(res, await samaSourceService.getMaskedBySociety(context.societyId), 'SAMA source retrieved');
  } catch (error) {
    next(error);
  }
});
router.patch('/source', requirePermission(PERMISSIONS.SAMA_CONFIGURE), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const context = await resolveSocietyId(req);
    sendSuccess(res, await samaSourceService.update(context.user.userId, context.societyId, req.body), 'SAMA source updated');
  } catch (error) {
    next(error);
  }
});
router.get('/staff', requireAnyPermission(PERMISSIONS.SAMA_VIEW_SOCIETY, PERMISSIONS.SAMA_SYNC, PERMISSIONS.SAMA_CONFIGURE), samaReadController.listStaff.bind(samaReadController));
router.get('/staff/:staffId', requireAnyPermission(PERMISSIONS.SAMA_VIEW_SOCIETY, PERMISSIONS.SAMA_SYNC, PERMISSIONS.SAMA_CONFIGURE), samaReadController.getStaff.bind(samaReadController));
router.get('/attendance-events', requireAnyPermission(PERMISSIONS.SAMA_VIEW_SOCIETY, PERMISSIONS.SAMA_SYNC, PERMISSIONS.SAMA_CONFIGURE), samaReadController.listAttendanceEvents.bind(samaReadController));
router.get('/shifts', requireAnyPermission(PERMISSIONS.SAMA_VIEW_SOCIETY, PERMISSIONS.SAMA_SYNC, PERMISSIONS.SAMA_CONFIGURE), samaReadController.listShifts.bind(samaReadController));
router.get('/leaves', requireAnyPermission(PERMISSIONS.SAMA_VIEW_SOCIETY, PERMISSIONS.SAMA_SYNC, PERMISSIONS.SAMA_CONFIGURE), samaReadController.listLeaves.bind(samaReadController));
router.get('/payroll-runs', requireAnyPermission(PERMISSIONS.SAMA_VIEW_SOCIETY, PERMISSIONS.SAMA_SYNC, PERMISSIONS.SAMA_CONFIGURE), samaReadController.listPayrollRuns.bind(samaReadController));
router.get('/payroll-runs/:runId', requireAnyPermission(PERMISSIONS.SAMA_VIEW_SOCIETY, PERMISSIONS.SAMA_SYNC, PERMISSIONS.SAMA_CONFIGURE), samaReadController.getPayrollRun.bind(samaReadController));
router.get('/sync-runs', requireAnyPermission(PERMISSIONS.SAMA_VIEW_AUDIT, PERMISSIONS.SAMA_SYNC, PERMISSIONS.SAMA_CONFIGURE), samaReadController.listSyncRuns.bind(samaReadController));
router.get('/access-events', requireAnyPermission(PERMISSIONS.SAMA_VIEW_AUDIT, PERMISSIONS.SAMA_MANAGE_ACCESS, PERMISSIONS.SAMA_SYNC), samaReadController.listAccessEvents.bind(samaReadController));
router.get('/sync-health', requireAnyPermission(PERMISSIONS.SAMA_VIEW_AUDIT, PERMISSIONS.SAMA_SYNC, PERMISSIONS.SAMA_CONFIGURE), samaReadController.getSyncHealth.bind(samaReadController));
router.get('/dashboard', requireAnyPermission(PERMISSIONS.SAMA_VIEW_REPORTS, PERMISSIONS.SAMA_EXPORT_REPORTS), samaReportController.getDashboard.bind(samaReportController));
router.get('/reports/staff', requireAnyPermission(PERMISSIONS.SAMA_VIEW_REPORTS, PERMISSIONS.SAMA_EXPORT_REPORTS), samaReportController.getStaffReport.bind(samaReportController));
router.get('/reports/providers', requireAnyPermission(PERMISSIONS.SAMA_VIEW_REPORTS, PERMISSIONS.SAMA_EXPORT_REPORTS), samaReportController.getProviderReport.bind(samaReportController));
router.get('/reports/household-payments', requireAnyPermission(PERMISSIONS.SAMA_VIEW_REPORTS, PERMISSIONS.SAMA_EXPORT_REPORTS), samaReportController.getHouseholdPaymentReport.bind(samaReportController));
router.get('/reports/work-orders', requireAnyPermission(PERMISSIONS.SAMA_VIEW_REPORTS, PERMISSIONS.SAMA_EXPORT_REPORTS), samaReportController.getWorkOrderReport.bind(samaReportController));
router.get('/reports/sync-health', requireAnyPermission(PERMISSIONS.SAMA_VIEW_REPORTS, PERMISSIONS.SAMA_EXPORT_REPORTS), samaReportController.getSyncHealthReport.bind(samaReportController));
router.get('/reports/access-exceptions', requireAnyPermission(PERMISSIONS.SAMA_VIEW_REPORTS, PERMISSIONS.SAMA_EXPORT_REPORTS), samaReportController.getAccessExceptionReport.bind(samaReportController));
router.get('/reports/export', requirePermission(PERMISSIONS.SAMA_EXPORT_REPORTS), samaReportController.export.bind(samaReportController));
router.post('/sync/employees', requirePermission(PERMISSIONS.SAMA_SYNC), samaSyncController.syncEmployees.bind(samaSyncController));
router.post('/sync/attendance', requirePermission(PERMISSIONS.SAMA_SYNC), samaSyncController.syncAttendance.bind(samaSyncController));
router.post('/sync/leaves', requirePermission(PERMISSIONS.SAMA_SYNC), samaSyncController.syncLeaves.bind(samaSyncController));
router.post('/sync/shifts', requirePermission(PERMISSIONS.SAMA_SYNC), samaSyncController.syncShifts.bind(samaSyncController));
router.post('/sync/payroll', requirePermission(PERMISSIONS.SAMA_SYNC), samaSyncController.syncPayroll.bind(samaSyncController));
router.post('/sync/access-events', requirePermission(PERMISSIONS.SAMA_SYNC), samaSyncController.syncAccessEvents.bind(samaSyncController));
router.post('/sync/run-due', requirePermission(PERMISSIONS.SAMA_SYNC), samaSyncController.runDue.bind(samaSyncController));
router.post('/sync-runs/:runId/retry', requirePermission(PERMISSIONS.SAMA_SYNC), samaSyncController.retryRun.bind(samaSyncController));

export default router;
