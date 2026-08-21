import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess } from '../../common/middleware/auth';
import { paymentController } from './payment.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.PAYMENT_READ), requireSocietyAccess, paymentController.findBySociety.bind(paymentController));
router.get('/society/:societyId/summary', requirePermission(PERMISSIONS.PAYMENT_READ), requireSocietyAccess, paymentController.getSummary.bind(paymentController));
router.post('/', requirePermission(PERMISSIONS.PAYMENT_CREATE), requireSocietyAccess, paymentController.create.bind(paymentController));
router.get('/:id', requirePermission(PERMISSIONS.PAYMENT_READ), paymentController.findById.bind(paymentController));

export default router;
