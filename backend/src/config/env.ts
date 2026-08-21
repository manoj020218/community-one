import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const booleanFromString = (defaultValue: boolean) =>
  z
    .string()
    .default(defaultValue ? 'true' : 'false')
    .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET required'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  APP_NAME: z.string().default('Jenix Society One'),
  APP_VERSION: z.string().default('1.0.0'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_FILE_SIZE: z.string().default('10485760').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  // 100/15min (the old default) is per-IP across the WHOLE authenticated app — a single admin
  // doing legitimate bulk work (deleting many wrongly-created flats one by one, since there's
  // no bulk-delete) blows through it in under a minute, then everyone on that IP/NAT is locked
  // out of every endpoint, including simple page loads, until the window resets.
  RATE_LIMIT_MAX: z.string().default('3000').transform(Number),
  SUPER_ADMIN_EMAIL: z.string().email().default('admin@jenix.in'),
  SUPER_ADMIN_MOBILE: z.string().default('9999999999'),
  SUPER_ADMIN_PASSWORD: z.string().default('Admin@123'),
  FCM_ENABLED: booleanFromString(false),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  FCM_SERVICE_ACCOUNT_PATH: z.string().optional(),
  VISITOR_EXPIRY_WORKER_ENABLED: booleanFromString(false),
  VISITOR_EXPIRY_WORKER_INTERVAL_MS: z.string().default('15000').transform(Number),
  VISITOR_EXPIRY_BATCH_SIZE: z.string().default('50').transform(Number),
  MCR_REMINDER_WORKER_ENABLED: booleanFromString(false),
  MCR_REMINDER_WORKER_INTERVAL_MS: z.string().default('60000').transform(Number),
  MCR_REMINDER_BATCH_SIZE: z.string().default('50').transform(Number),
  MCR_DEMAND_WORKER_ENABLED: booleanFromString(false),
  MCR_DEMAND_WORKER_INTERVAL_MS: z.string().default('60000').transform(Number),
  MCR_DEMAND_WORKER_CYCLE_LIMIT: z.string().default('12').transform(Number),
  MCR_LATE_FEE_WORKER_ENABLED: booleanFromString(false),
  MCR_LATE_FEE_WORKER_INTERVAL_MS: z.string().default('60000').transform(Number),
  MCR_LATE_FEE_BATCH_SIZE: z.string().default('50').transform(Number),
  SAMA_SYNC_WORKER_ENABLED: booleanFromString(false),
  SAMA_SYNC_WORKER_INTERVAL_MS: z.string().default('60000').transform(Number),
  SAMA_SYNC_WORKER_BATCH_SIZE: z.string().default('10').transform(Number),
  VISITOR_SSE_HEARTBEAT_MS: z.string().default('20000').transform(Number),
  // Billing platform bridge (server-to-server; mirrors the FireGuard <-> billing link)
  BRIDGE_SECRET: z.string().optional(),
  APP_LOGIN_URL: z.string().optional(),
  BILLING_API_BASE: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV !== 'test') {
  console.error('Environment validation failed:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.success
  ? parsed.data
  : {
      NODE_ENV: 'test' as const,
      PORT: 5001,
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/jenix-test',
      JWT_SECRET: 'test-jwt-secret-at-least-16-chars',
      JWT_EXPIRES_IN: '7d',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-16-chars',
      JWT_REFRESH_EXPIRES_IN: '30d',
      APP_NAME: 'Jenix Society One',
      APP_VERSION: '1.0.0',
      FRONTEND_URL: 'http://localhost:5173',
      UPLOAD_DIR: 'uploads',
      MAX_FILE_SIZE: 10485760,
      RATE_LIMIT_WINDOW_MS: 900000,
      RATE_LIMIT_MAX: 3000,
      SUPER_ADMIN_EMAIL: 'admin@jenix.in',
      SUPER_ADMIN_MOBILE: '9999999999',
      SUPER_ADMIN_PASSWORD: 'Admin@123',
      FCM_ENABLED: false,
      FCM_PROJECT_ID: undefined,
      FCM_CLIENT_EMAIL: undefined,
      FCM_PRIVATE_KEY: undefined,
      FCM_SERVICE_ACCOUNT_PATH: undefined,
      VISITOR_EXPIRY_WORKER_ENABLED: false,
      VISITOR_EXPIRY_WORKER_INTERVAL_MS: 15000,
      VISITOR_EXPIRY_BATCH_SIZE: 50,
      MCR_REMINDER_WORKER_ENABLED: false,
      MCR_REMINDER_WORKER_INTERVAL_MS: 60000,
      MCR_REMINDER_BATCH_SIZE: 50,
      MCR_DEMAND_WORKER_ENABLED: false,
      MCR_DEMAND_WORKER_INTERVAL_MS: 60000,
      MCR_DEMAND_WORKER_CYCLE_LIMIT: 12,
      MCR_LATE_FEE_WORKER_ENABLED: false,
      MCR_LATE_FEE_WORKER_INTERVAL_MS: 60000,
      MCR_LATE_FEE_BATCH_SIZE: 50,
      SAMA_SYNC_WORKER_ENABLED: false,
      SAMA_SYNC_WORKER_INTERVAL_MS: 60000,
      SAMA_SYNC_WORKER_BATCH_SIZE: 10,
      VISITOR_SSE_HEARTBEAT_MS: 20000,
      BRIDGE_SECRET: process.env.BRIDGE_SECRET,
      APP_LOGIN_URL: process.env.APP_LOGIN_URL,
      BILLING_API_BASE: process.env.BILLING_API_BASE,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    };
