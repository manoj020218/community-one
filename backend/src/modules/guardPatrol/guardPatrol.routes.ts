import { Router } from 'express';
import { authenticate, requireAnyPermission, requirePermission } from '../../common/middleware/auth';
import { PERMISSIONS } from '../../config/constants';
import { PATROL_ROUTE_PERMISSIONS } from './guardPatrol.manifest';
import { patrolCheckpointController } from './patrolCheckpoint.controller';
import { patrolRouteController } from './patrolRoute.controller';
import { patrolAssignmentController } from './patrolAssignment.controller';
import { patrolRoundController } from './patrolRound.controller';
import { patrolReportController } from './patrolReport.controller';
import { patrolSettingsController } from './patrolSettings.controller';

const router: Router = Router();
router.use(authenticate);

// Settings
router.get('/settings', requireAnyPermission(...PATROL_ROUTE_PERMISSIONS), patrolSettingsController.get.bind(patrolSettingsController));
router.patch('/settings', requirePermission(PERMISSIONS.PATROL_CONFIGURE), patrolSettingsController.update.bind(patrolSettingsController));

// Checkpoints
router.get('/checkpoints', requireAnyPermission(...PATROL_ROUTE_PERMISSIONS), patrolCheckpointController.findBySociety.bind(patrolCheckpointController));
router.post('/checkpoints', requirePermission(PERMISSIONS.PATROL_CHECKPOINT_MANAGE), patrolCheckpointController.create.bind(patrolCheckpointController));
router.patch('/checkpoints/:id', requirePermission(PERMISSIONS.PATROL_CHECKPOINT_MANAGE), patrolCheckpointController.update.bind(patrolCheckpointController));
router.patch('/checkpoints/:id/disable', requirePermission(PERMISSIONS.PATROL_CHECKPOINT_MANAGE), patrolCheckpointController.disable.bind(patrolCheckpointController));
router.get('/checkpoints/:id/sticker', requirePermission(PERMISSIONS.PATROL_CHECKPOINT_MANAGE), patrolCheckpointController.sticker.bind(patrolCheckpointController));

// Routes
router.get('/routes', requireAnyPermission(...PATROL_ROUTE_PERMISSIONS), patrolRouteController.findBySociety.bind(patrolRouteController));
router.post('/routes', requirePermission(PERMISSIONS.PATROL_ROUTE_MANAGE), patrolRouteController.create.bind(patrolRouteController));
router.get('/routes/:id', requireAnyPermission(...PATROL_ROUTE_PERMISSIONS), patrolRouteController.findById.bind(patrolRouteController));
router.patch('/routes/:id', requirePermission(PERMISSIONS.PATROL_ROUTE_MANAGE), patrolRouteController.update.bind(patrolRouteController));
router.patch('/routes/:id/disable', requirePermission(PERMISSIONS.PATROL_ROUTE_MANAGE), patrolRouteController.disable.bind(patrolRouteController));

// Assignments
router.get('/assignments', requireAnyPermission(...PATROL_ROUTE_PERMISSIONS), patrolAssignmentController.findBySociety.bind(patrolAssignmentController));
router.get('/assignments/me', requirePermission(PERMISSIONS.PATROL_EXECUTE), patrolAssignmentController.findMine.bind(patrolAssignmentController));
router.post('/assignments', requirePermission(PERMISSIONS.PATROL_ASSIGNMENT_MANAGE), patrolAssignmentController.create.bind(patrolAssignmentController));
router.patch('/assignments/:id', requirePermission(PERMISSIONS.PATROL_ASSIGNMENT_MANAGE), patrolAssignmentController.update.bind(patrolAssignmentController));
router.patch('/assignments/:id/disable', requirePermission(PERMISSIONS.PATROL_ASSIGNMENT_MANAGE), patrolAssignmentController.disable.bind(patrolAssignmentController));

// Rounds (guard execution)
router.post('/rounds', requirePermission(PERMISSIONS.PATROL_EXECUTE), patrolRoundController.start.bind(patrolRoundController));
router.get('/rounds/mine/active', requirePermission(PERMISSIONS.PATROL_EXECUTE), patrolRoundController.myActive.bind(patrolRoundController));
router.get('/rounds/:id', requireAnyPermission(PERMISSIONS.PATROL_EXECUTE, PERMISSIONS.PATROL_VIEW_OWN, ...PATROL_ROUTE_PERMISSIONS), patrolRoundController.progress.bind(patrolRoundController));
router.post('/rounds/:id/scan', requirePermission(PERMISSIONS.PATROL_EXECUTE), patrolRoundController.scan.bind(patrolRoundController));
router.post('/rounds/:id/end', requirePermission(PERMISSIONS.PATROL_EXECUTE), patrolRoundController.end.bind(patrolRoundController));

// Reports / dashboard
router.get('/reports/summary', requirePermission(PERMISSIONS.PATROL_VIEW_ALL), patrolReportController.summary.bind(patrolReportController));
router.get('/reports/live-rounds', requirePermission(PERMISSIONS.PATROL_VIEW_ALL), patrolReportController.liveRounds.bind(patrolReportController));
router.get('/reports/monthly-export', requirePermission(PERMISSIONS.PATROL_VIEW_REPORTS), patrolReportController.exportMonthly.bind(patrolReportController));

export default router;
