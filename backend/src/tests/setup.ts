import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

module.exports = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-16-chars';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-16-chars';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.JWT_REFRESH_EXPIRES_IN = '30d';
  (global as any).__MONGO_URI__ = uri;
  (global as any).__MONGO_SERVER__ = mongoServer;
};
