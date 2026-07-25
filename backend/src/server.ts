import app from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './common/utils/logger';
import { visitorExpiryWorker } from './modules/visitor/visitor.expiry.worker';

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    logger.info('Database connected');
    if (env.VISITOR_EXPIRY_WORKER_ENABLED) visitorExpiryWorker.start();

    const server = app.listen(env.PORT, () => {
      logger.info(`Jenix Society One API running on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      visitorExpiryWorker.stop();
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
