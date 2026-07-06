import request from 'supertest';
import app from '../app';
import { connectTestDb, clearDb, createSuperAdmin, createTestUser, seedRoles } from './helpers';
import { Society } from '../modules/society/society.model';
import { Tower } from '../modules/tower/tower.model';
import { Flat } from '../modules/flat/flat.model';
import { Resident } from '../modules/resident/resident.model';
import { Vehicle } from '../modules/vehicle/vehicle.model';
import { Pet } from '../modules/pet/pet.model';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('Health Endpoint', () => {
  it('GET /health should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.apiStatus).toBe('running');
  });
});

describe('Auth', () => {
  it('should login successfully with valid credentials', async () => {
    const { user } = await createSuperAdmin();
    const res = await request(app).post('/api/auth/login').send({ identifier: user.email, password: 'Admin@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(user.email);
  });

  it('should reject invalid credentials', async () => {
    await createSuperAdmin();
    const res = await request(app).post('/api/auth/login').send({ identifier: 'superadmin@test.com', password: 'WrongPass' });
    expect(res.status).toBe(401);
  });

  it('should protect authenticated routes', async () => {
    const res = await request(app).get('/api/societies');
    expect(res.status).toBe(401);
  });
});

describe('Society', () => {
  it('should create a society', async () => {
    const { token } = await createSuperAdmin();
    const res = await request(app).post('/api/societies').set('Authorization', `Bearer ${token}`).send({
      name: 'Green Valley Society', address: '123 Main St', city: 'Mumbai',
      state: 'Maharashtra', pincode: '400001', contactPersonName: 'Raj Sharma',
      contactMobile: '9876543210', contactEmail: 'raj@greenvalley.com',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('JSO-GREENVALLEYSO');
  });

  it('should enforce society data isolation', async () => {
    const { token: adminToken } = await createTestUser({ societyId: new (require('mongoose').Types.ObjectId)().toString() });
    const { token: superToken } = await createSuperAdmin();
    const societyRes = await request(app).post('/api/societies').set('Authorization', `Bearer ${superToken}`).send({
      name: 'Test Society', address: 'Addr', city: 'City', state: 'State',
      pincode: '400001', contactPersonName: 'Name', contactMobile: '9000000001', contactEmail: 'a@b.com',
    });
    const societyId = societyRes.body.data._id;
    // Admin from different society cannot access this society's data
    const res = await request(app).get(`/api/societies/${societyId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Tower', () => {
  it('should create a tower', async () => {
    const { token, user } = await createSuperAdmin();
    const society = await Society.create({ name: 'S1', code: 'JSO-S1', address: 'A', city: 'C', state: 'S', pincode: '400001', contactPersonName: 'N', contactMobile: '9000000001', contactEmail: 'x@y.com', createdBy: user._id });
    const res = await request(app).post('/api/towers').set('Authorization', `Bearer ${token}`).send({ societyId: society._id, name: 'Tower A', numberOfFloors: 10 });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Tower A');
  });
});

describe('Module Registry', () => {
  it('should return all modules', async () => {
    const { ModuleRegistry } = require('../modules/moduleRegistry/moduleRegistry.model');
    await ModuleRegistry.create({ code: 'CORE', name: 'Core', routePrefix: '/', apiPrefix: '/api', status: 'ACTIVE' });
    const { token } = await createSuperAdmin();
    const res = await request(app).get('/api/modules').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Notification', () => {
  it('should create and retrieve notifications', async () => {
    const { token, user } = await createSuperAdmin();
    const { Notification } = require('../modules/notification/notification.model');
    await Notification.create({ userId: user._id, title: 'Test', message: 'Hello', type: 'INFO' });
    const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });
});

describe('Audit Log', () => {
  it('should record audit logs on create society', async () => {
    const { token } = await createSuperAdmin();
    await request(app).post('/api/societies').set('Authorization', `Bearer ${token}`).send({
      name: 'Audit Test Society', address: 'A', city: 'C', state: 'S',
      pincode: '400001', contactPersonName: 'N', contactMobile: '9000000002', contactEmail: 'audit@test.com',
    });
    const { AuditLog } = require('../modules/audit/audit.model');
    const log = await AuditLog.findOne({ action: 'CREATE', entityType: 'Society' });
    expect(log).not.toBeNull();
  });
});

describe('Device Heartbeat', () => {
  it('should update heartbeat', async () => {
    const { token, user } = await createSuperAdmin();
    const society = await Society.create({ name: 'S2', code: 'JSO-S2', address: 'A', city: 'C', state: 'S', pincode: '400001', contactPersonName: 'N', contactMobile: '9000000003', contactEmail: 'b@c.com', createdBy: user._id });
    const createRes = await request(app).post('/api/devices').set('Authorization', `Bearer ${token}`).send({ societyId: society._id, deviceName: 'Gate Reader', deviceType: 'UHF_READER', deviceCode: 'DEV001' });
    expect(createRes.status).toBe(201);
    const device = createRes.body.data;
    const hbRes = await request(app).post(`/api/devices/${device._id}/heartbeat`).set('x-device-api-key', device.apiKey).send({ firmwareVersion: '1.0.1' });
    expect(hbRes.status).toBe(200);
    expect(hbRes.body.data.onlineStatus).toBe(true);
  });
});

describe('Receipt Number Generation', () => {
  it('should generate sequential receipt numbers', async () => {
    const { token, user } = await createSuperAdmin();
    const society = await Society.create({ name: 'Receipt Soc', code: 'JSO-REC', address: 'A', city: 'C', state: 'S', pincode: '400001', contactPersonName: 'N', contactMobile: '9000000004', contactEmail: 'c@d.com', createdBy: user._id });
    const tower = await Tower.create({ societyId: society._id, name: 'T1', code: 'T1', numberOfFloors: 1, createdBy: user._id });
    const { Floor } = require('../modules/floor/floor.model');
    const floor = await Floor.create({ societyId: society._id, towerId: tower._id, floorNumber: 1, floorName: 'Floor 1', createdBy: user._id });
    const flat = await Flat.create({ societyId: society._id, towerId: tower._id, floorId: floor._id, flatNo: 'A-101', createdBy: user._id });
    const payment = await request(app).post('/api/payments').set('Authorization', `Bearer ${token}`).send({ societyId: society._id, flatId: flat._id, amount: 5000, paymentPurpose: 'Maintenance', paymentMode: 'UPI' });
    const r1 = await request(app).post('/api/receipts/generate').set('Authorization', `Bearer ${token}`).send({ societyId: society._id, paymentRecordId: payment.body.data._id, flatId: flat._id, amount: 5000, purpose: 'Maintenance', paymentMode: 'UPI' });
    const r2 = await request(app).post('/api/receipts/generate').set('Authorization', `Bearer ${token}`).send({ societyId: society._id, paymentRecordId: payment.body.data._id, flatId: flat._id, amount: 3000, purpose: 'Parking', paymentMode: 'CASH' });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r1.body.data.receiptNo).toContain('/');
    expect(r2.body.data.receiptNo).not.toBe(r1.body.data.receiptNo);
  });
});
