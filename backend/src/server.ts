import app from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './common/utils/logger';
import { mcrDemandAutomationWorker } from './modules/mcr/mcrDemandAutomation.worker';
import { mcrLateFeeWorker } from './modules/mcr/mcrLateFee.worker';
import { mcrReminderWorker } from './modules/mcr/mcrReminder.worker';
import { mcrWhatsAppInboundService } from './modules/mcr/mcrWhatsAppInbound.service';
import { samaScheduledSyncWorker } from './modules/sama/samaScheduledSync.worker';
import { visitorExpiryWorker } from './modules/visitor/visitor.expiry.worker';
import { patrolRoundWorker } from './modules/guardPatrol/patrolRound.worker';
import { whatsAppService } from './modules/communication/whatsapp.service';

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    logger.info('Database connected');
    if (env.MCR_DEMAND_WORKER_ENABLED) mcrDemandAutomationWorker.start();
    if (env.MCR_LATE_FEE_WORKER_ENABLED) mcrLateFeeWorker.start();
    if (env.MCR_REMINDER_WORKER_ENABLED) mcrReminderWorker.start();
    if (env.SAMA_SYNC_WORKER_ENABLED) samaScheduledSyncWorker.start();
    if (env.VISITOR_EXPIRY_WORKER_ENABLED) visitorExpiryWorker.start();
    patrolRoundWorker.start();
    whatsAppService.onInboundImage((societyId, payload) => mcrWhatsAppInboundService.handle(societyId, payload));
    whatsAppService.reconnectAll().catch((err) => logger.warn('WhatsApp reconnectAll failed', { err }));

    const server = app.listen(env.PORT, () => {
      logger.info(`Jenix Society One API running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      mcrDemandAutomationWorker.stop();
      mcrLateFeeWorker.stop();
      mcrReminderWorker.stop();
      samaScheduledSyncWorker.stop();
      visitorExpiryWorker.stop();
      patrolRoundWorker.stop();
      server.close(async () => {
        const { disconnectDatabase } = await import('./config/database');
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
