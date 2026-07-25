import { Router } from 'express';
import { authenticate, requirePermission, requireAnyPermission } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { visitorCreateRateLimiter } from '../../common/middleware/rateLimiter';
import { visitorContextController } from './visitorContext.controller';
import { visitorRequestController } from './visitorRequest.controller';

const router: Router = Router();

const VIEW_PERMISSIONS = [
  PERMISSIONS.VISITOR_REQUEST_VIEW_ASSIGNED_GATE,
  PERMISSIONS.VISITOR_REQUEST_VIEW_OWN_FLAT,
  PERMISSIONS.VISITOR_REQUEST_VIEW_SOCIETY,
];

router.use(authenticate);
router.get('/context', visitorContextController.getContext.bind(visitorContextController));
router.get('/events', visitorContextController.openEvents.bind(visitorContextController));
router.get('/towers', visitorContextController.getTowers.bind(visitorContextController));
router.get('/towers/:towerId/flats', visitorContextController.getFlats.bind(visitorContextController));
router.get('/settings', visitorContextController.getSettings.bind(visitorContextController));
router.patch('/settings', requirePermission(PERMISSIONS.VISITOR_SETTINGS_MANAGE), visitorContextController.updateSettings.bind(visitorContextController));
router.get('/reports/summary', requirePermission(PERMISSIONS.VISITOR_REPORT_VIEW), visitorContextController.getSummary.bind(visitorContextController));
router.get('/requests', requireAnyPermission(...VIEW_PERMISSIONS), visitorRequestController.list.bind(visitorRequestController));
router.post('/requests', requirePermission(PERMISSIONS.VISITOR_REQUEST_CREATE), visitorCreateRateLimiter, visitorRequestController.create.bind(visitorRequestController));
router.get('/requests/:requestId', requireAnyPermission(...VIEW_PERMISSIONS), visitorRequestController.get.bind(visitorRequestController));
router.get('/requests/:requestId/photo', requireAnyPermission(...VIEW_PERMISSIONS), visitorRequestController.getPhoto.bind(visitorRequestController));
router.post('/requests/:requestId/approve', requirePermission(PERMISSIONS.VISITOR_REQUEST_RESPOND_OWN_FLAT), visitorRequestController.approve.bind(visitorRequestController));
router.post('/requests/:requestId/reject', requirePermission(PERMISSIONS.VISITOR_REQUEST_RESPOND_OWN_FLAT), visitorRequestController.reject.bind(visitorRequestController));
router.post('/requests/:requestId/cancel', requirePermission(PERMISSIONS.VISITOR_REQUEST_CANCEL), visitorRequestController.cancel.bind(visitorRequestController));
router.post('/requests/:requestId/confirm-entry', requirePermission(PERMISSIONS.VISITOR_ENTRY_CONFIRM), visitorRequestController.confirmEntry.bind(visitorRequestController));
router.post('/requests/:requestId/confirm-exit', requirePermission(PERMISSIONS.VISITOR_EXIT_CONFIRM), visitorRequestController.confirmExit.bind(visitorRequestController));

export default router;
