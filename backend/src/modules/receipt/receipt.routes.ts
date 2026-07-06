import { Router } from 'express';
import { authenticate, requirePermission } from '../../common/middleware/auth';
import { receiptController } from './receipt.controller';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.PAYMENT_READ), receiptController.findBySociety.bind(receiptController));
router.post('/generate', requirePermission(PERMISSIONS.RECEIPT_GENERATE), receiptController.generate.bind(receiptController));
router.get('/:id', requirePermission(PERMISSIONS.PAYMENT_READ), receiptController.findById.bind(receiptController));

export default router;
