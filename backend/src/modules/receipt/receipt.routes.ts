import { Router } from 'express';
import { authenticate, requirePermission, requireSocietyAccess, requireResourceSocietyAccess } from '../../common/middleware/auth';
import { receiptController } from './receipt.controller';
import { Receipt } from './receipt.model';
import { PERMISSIONS } from '../../config/constants';

const router: Router = Router();
router.use(authenticate);

router.get('/society/:societyId', requirePermission(PERMISSIONS.PAYMENT_READ), requireSocietyAccess, receiptController.findBySociety.bind(receiptController));
router.post('/generate', requirePermission(PERMISSIONS.RECEIPT_GENERATE), requireSocietyAccess, receiptController.generate.bind(receiptController));
router.get('/:id', requirePermission(PERMISSIONS.PAYMENT_READ), requireResourceSocietyAccess(Receipt), receiptController.findById.bind(receiptController));

export default router;
