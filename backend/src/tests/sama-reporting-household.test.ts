import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { FileAsset } from '../modules/fileAsset/fileAsset.model';
import { Notification } from '../modules/notification/notification.model';
import { clearDb, connectTestDb, seedRoles } from './helpers';
import { createResidentUserForFlat, createSamaFixture, createSamaFlat } from './sama.helpers';

beforeAll(async () => {
  await connectTestDb();
  await seedRoles();
});

afterEach(async () => {
  await clearDb();
  await seedRoles();
});

describe('SAMA category, household payment, and reporting flow', () => {
  it('tracks category setup, household payment lifecycle, work-order ratings, and report exports', async () => {
    const fixture = await createSamaFixture();
    const flatA = await createSamaFlat(fixture, 'B-201');
    const flatB = await createSamaFlat(fixture, 'B-202');
    const { resident: residentA, user: residentUserA, token: ownerTokenA } = await createResidentUserForFlat(fixture, flatA, 'OWNER');
    const { token: ownerTokenB } = await createResidentUserForFlat(fixture, flatB, 'OWNER');

    const categoryRes = await request(app).post('/api/sama/staff-categories').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      code: 'MAID',
      name: 'Maid',
      staffTypes: ['HOUSEHOLD_STAFF'],
      defaultMonthlyRatePaise: 150000,
      requiresSocietyApproval: true,
    });

    const staffRes = await request(app).post('/api/sama/staff-profiles').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      firstName: 'Lata',
      displayName: 'Lata Maid',
      mobile: '9000000012',
      staffType: 'HOUSEHOLD_STAFF',
      primaryCategory: 'MAID',
    });
    const staffId = staffRes.body.data._id;

    const engagementRes = await request(app).post('/api/sama/engagements').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      staffProfileId: staffId,
      engagementType: 'HOUSEHOLD_DIRECT',
      employerType: 'HOUSEHOLD',
      employerFlatId: flatA._id.toString(),
      employerResidentId: residentA._id.toString(),
      startDate: '2026-07-01T00:00:00.000Z',
      paymentResponsibility: 'HOUSEHOLD',
    });

    const associationRes = await request(app).post('/api/sama/household-associations').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      staffProfileId: staffId,
      engagementId: engagementRes.body.data._id,
      flatId: flatA._id.toString(),
      residentId: residentA._id.toString(),
      services: ['Cleaning'],
      monthlyRatePaise: 150000,
    });
    const associationId = associationRes.body.data._id;

    await request(app).post(`/api/sama/household-associations/${associationId}/approve-resident`).set('Authorization', `Bearer ${ownerTokenA}`).send({});
    await request(app).post(`/api/sama/household-associations/${associationId}/approve-society`).set('Authorization', `Bearer ${fixture.adminToken}`).send({});

    const rateCardRes = await request(app).post('/api/sama/household-rate-cards').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      associationId,
      monthlyRatePaise: 150000,
      overtimeRatePaise: 5000,
      effectiveFrom: '2026-07-01T00:00:00.000Z',
    });
    const rateCardId = rateCardRes.body.data._id;

    const paymentRes = await request(app).post('/api/sama/household-payments').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      associationId,
      rateCardId,
      billingMonth: '2026-07',
      duePaise: 150000,
      paidPaise: 50000,
      paymentMethod: 'UPI',
    });
    const paymentId = paymentRes.body.data._id;

    const paymentUpdateRes = await request(app).patch(`/api/sama/household-payments/${paymentId}`).set('Authorization', `Bearer ${fixture.adminToken}`).send({
      paidPaise: 150000,
      receiptRef: 'HH-2026-07-001',
    });

    const providerRes = await request(app).post('/api/sama/service-providers').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      displayName: 'Spark Repairs',
      providerType: 'INDIVIDUAL',
      contactPersonName: 'Rahul',
      mobile: '9000000013',
      serviceCategories: ['PLUMBING'],
    });
    const providerId = providerRes.body.data._id;
    const proofFiles = await FileAsset.insertMany([
      {
        societyId: fixture.society._id,
        uploadedBy: fixture.admin._id,
        moduleCode: 'SAMA',
        fileName: `proof-${new mongoose.Types.ObjectId()}.jpg`,
        originalName: 'proof-1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageProvider: 'LOCAL',
        url: '/uploads/proof-1.jpg',
      },
      {
        societyId: fixture.society._id,
        uploadedBy: fixture.admin._id,
        moduleCode: 'SAMA',
        fileName: `proof-${new mongoose.Types.ObjectId()}.jpg`,
        originalName: 'proof-2.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        storageProvider: 'LOCAL',
        url: '/uploads/proof-2.jpg',
      },
    ]);
    const proofFileIds = proofFiles.map((item) => item._id.toString());

    const workOrderRes = await request(app).post('/api/sama/work-orders').set('Authorization', `Bearer ${fixture.adminToken}`).send({
      title: 'Kitchen sink repair',
      category: 'PLUMBING',
      priority: 'HIGH',
      flatId: flatA._id.toString(),
      residentId: residentA._id.toString(),
      scheduledStartAt: '2020-01-01T09:00:00.000Z',
      scheduledEndAt: '2020-01-01T10:00:00.000Z',
      slaTargetMinutes: 30,
    });
    const workOrderId = workOrderRes.body.data._id;

    const assignRes = await request(app).patch(`/api/sama/work-orders/${workOrderId}/assign`).set('Authorization', `Bearer ${fixture.adminToken}`).send({
      assignedServiceProviderId: providerId,
      scheduledStartAt: '2020-01-01T09:00:00.000Z',
      scheduledEndAt: '2020-01-01T10:00:00.000Z',
      slaTargetMinutes: 30,
    });

    const completeRes = await request(app).patch(`/api/sama/work-orders/${workOrderId}/complete`).set('Authorization', `Bearer ${fixture.adminToken}`).send({
      completionNotes: 'Leak fixed and joints sealed',
      completionProofFileIds: proofFileIds,
    });

    const rateRes = await request(app).post(`/api/sama/work-orders/${workOrderId}/rate`).set('Authorization', `Bearer ${ownerTokenA}`).send({
      rating: 5,
      feedback: 'Quick fix',
    });

    const categoryListRes = await request(app).get('/api/sama/staff-categories').set('Authorization', `Bearer ${fixture.adminToken}`);
    const ownerPaymentsRes = await request(app).get('/api/sama/household-payments').set('Authorization', `Bearer ${ownerTokenA}`);
    const otherOwnerPaymentsRes = await request(app).get('/api/sama/household-payments').set('Authorization', `Bearer ${ownerTokenB}`);
    const dashboardRes = await request(app).get('/api/sama/dashboard').set('Authorization', `Bearer ${fixture.adminToken}`);
    const staffReportRes = await request(app).get('/api/sama/reports/staff').set('Authorization', `Bearer ${fixture.adminToken}`);
    const providerReportRes = await request(app).get('/api/sama/reports/providers').set('Authorization', `Bearer ${fixture.adminToken}`);
    const householdReportRes = await request(app).get('/api/sama/reports/household-payments').query({ billingMonth: '2026-07' }).set('Authorization', `Bearer ${fixture.adminToken}`);
    const exportRes = await request(app).get('/api/sama/reports/export').query({ reportType: 'PROVIDERS' }).set('Authorization', `Bearer ${fixture.adminToken}`);

    const residentNotifications = await Notification.find({ userId: residentUserA._id }).sort({ createdAt: 1 }).lean();
    const adminNotifications = await Notification.find({ userId: fixture.admin._id }).sort({ createdAt: 1 }).lean();

    expect(categoryRes.status).toBe(201);
    expect(categoryListRes.body.data.items).toHaveLength(1);
    expect(categoryListRes.body.data.items[0].code).toBe('MAID');
    expect(staffRes.status).toBe(201);
    expect(rateCardRes.status).toBe(201);
    expect(paymentRes.status).toBe(201);
    expect(paymentRes.body.data.status).toBe('PARTIAL');
    expect(paymentUpdateRes.status).toBe(200);
    expect(paymentUpdateRes.body.data.status).toBe('PAID');
    expect(ownerPaymentsRes.body.data.items).toHaveLength(1);
    expect(otherOwnerPaymentsRes.body.data.items).toHaveLength(0);
    expect(completeRes.status).toBe(200);
    expect(assignRes.body.data.status).toBe('ASSIGNED');
    expect(completeRes.body.data.slaBreached).toBe(true);
    expect(completeRes.body.data.completionProofFileIds).toEqual(proofFileIds);
    expect(rateRes.status).toBe(200);
    expect(rateRes.body.data.residentRating).toBe(5);
    expect(dashboardRes.body.data.categoryCount).toBe(1);
    expect(dashboardRes.body.data.staffCount).toBe(1);
    expect(dashboardRes.body.data.activeAssociationCount).toBe(1);
    expect(dashboardRes.body.data.providerCount).toBe(1);
    expect(dashboardRes.body.data.workOrders.COMPLETED).toBe(1);
    expect(dashboardRes.body.data.slaBreachedCount).toBe(1);
    expect(dashboardRes.body.data.householdOutstandingPaise).toBe(0);
    expect(staffReportRes.body.data.categoryBreakdown).toContainEqual({ category: 'MAID', count: 1 });
    expect(providerReportRes.body.data[0]).toMatchObject({
      displayName: 'Spark Repairs',
      totalAssigned: 1,
      completedCount: 1,
      slaBreachedCount: 1,
      averageRating: 5,
    });
    expect(householdReportRes.body.data.totalDuePaise).toBe(150000);
    expect(householdReportRes.body.data.totalPaidPaise).toBe(150000);
    expect(householdReportRes.body.data.outstandingPaise).toBe(0);
    expect(exportRes.body.data.format).toBe('CSV');
    expect(exportRes.body.data.fileName).toContain('sama-providers-');
    expect(exportRes.body.data.content).toContain('providerCode');
    expect(exportRes.body.data.content).toContain('Spark Repairs');
    expect(residentNotifications.map((item) => item.title)).toEqual([
      'Household payment recorded',
      'Household payment updated',
    ]);
    expect(adminNotifications.map((item) => item.title)).toEqual([
      'Work order assigned',
      'Work order completed',
      'Work order rated',
    ]);
  });
});
