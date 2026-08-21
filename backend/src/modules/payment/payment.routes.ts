import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { paymentController } from './payment.controller';
import { PaymentRecord } from './payment.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.PAYMENT_READ), requireSocietyAccess, paymentController.findBySociety.bind(paymentController));
router.get('/society/:societyId/summary', requirePermission(PERMISSIONS.PAYMENT_READ), requireSocietyAccess, paymentController.getSummary.bind(paymentController));
router.post('/', requirePermission(PERMISSIONS.PAYMENT_CREATE), requireSocietyAccess, paymentController.create.bind(paymentController));
router.get('/:id', requirePermission(PERMISSIONS.PAYMENT_READ), requireResourceSocietyAccess(PaymentRecord), paymentController.findById.bind(paymentController));

export default router;
