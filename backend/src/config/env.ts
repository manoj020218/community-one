import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

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
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  SUPER_ADMIN_EMAIL: z.string().email().default('admin@jenix.in'),
  SUPER_ADMIN_MOBILE: z.string().default('9999999999'),
  SUPER_ADMIN_PASSWORD: z.string().default('Admin@123'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV !== 'test') {
  console.error('Environment validation failed:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.success ? parsed.data : {
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
  RATE_LIMIT_MAX: 100,
  SUPER_ADMIN_EMAIL: 'admin@jenix.in',
  SUPER_ADMIN_MOBILE: '9999999999',
  SUPER_ADMIN_PASSWORD: 'Admin@123',
};
