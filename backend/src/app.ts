import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { requestLogger } from './common/middleware/requestLogger';
import { apiRateLimiter } from './common/middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './common/middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import roleRoutes from './modules/role/role.routes';
import societyRoutes from './modules/society/society.routes';
import towerRoutes from './modules/tower/tower.routes';
import floorRoutes from './modules/floor/floor.routes';
import flatRoutes from './modules/flat/flat.routes';
import residentRoutes from './modules/resident/resident.routes';
import vehicleRoutes from './modules/vehicle/vehicle.routes';
import petRoutes from './modules/pet/pet.routes';
import moduleRegistryRoutes from './modules/moduleRegistry/moduleRegistry.routes';
import notificationRoutes from './modules/notification/notification.routes';
import auditRoutes from './modules/audit/audit.routes';
import fileAssetRoutes from './modules/fileAsset/fileAsset.routes';
import paymentRoutes from './modules/payment/payment.routes';
import receiptRoutes from './modules/receipt/receipt.routes';
import reportRoutes from './modules/report/report.routes';
import deviceRoutes from './modules/device/device.routes';
import healthRoutes from './modules/health/health.routes';

const app: express.Application = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// Request middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), env.UPLOAD_DIR)));

// Rate limiting
app.use('/api', apiRateLimiter);

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/societies', societyRoutes);
app.use('/api/towers', towerRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/flats', flatRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/modules', moduleRegistryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/files', fileAssetRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/devices', deviceRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
