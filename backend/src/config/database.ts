import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../common/utils/logger';

let isConnected = false;

export async function connectDatabase(uri?: string): Promise<void> {
  if (isConnected) return;

  const mongoUri = uri || env.MONGODB_URI;

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB error:', err);
    });
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB disconnected');
}

export function getDatabaseStatus(): { status: string; host?: string } {
  const state = mongoose.connection.readyState;
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    status: states[state] || 'unknown',
    host: state === 1 ? mongoose.connection.host : undefined,
  };
}
