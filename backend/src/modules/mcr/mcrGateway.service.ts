import crypto from 'crypto';
import mongoose from 'mongoose';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors/AppError';
import { Flat } from '../flat/flat.model';
import { Resident } from '../resident/resident.model';
import { McrActorContext } from './mcr.access.service';
import { MaintenanceDemand } from './demand.model';
import { McrGatewayConfig } from './mcrGatewayConfig.model';
import { McrGatewayWebhookEvent } from './mcrGatewayWebhookEvent.model';
import { mcrGatewayConfigSchema, mcrGatewayOrderSchema } from './mcrGateway.schemas';
import { mcrNumberingService } from './mcrNumbering.service';
import { McrPaymentRecord } from './mcrPaymentRecord.model';
import { mcrPaymentVerificationService } from './mcrPaymentVerification.service';
import { mcrSettingsService } from './mcrSettings.service';
import { parseOrThrow } from './mcr.validation';

export class McrGatewayService {
  async getConfig(societyId: string) {
    return McrGatewayConfig.findOne({ societyId });
  }

  async updateConfig(context: McrActorContext, input: unknown) {
    const dto = parseOrThrow(mcrGatewayConfigSchema, input);
    return McrGatewayConfig.findOneAndUpdate(
      { societyId: context.societyId },
      { $set: { ...dto, updatedBy: context.user.userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async createOrder(context: McrActorContext, input: unknown) {
    const dto = parseOrThrow(mcrGatewayOrderSchema, input);
    const config = await McrGatewayConfig.findOne({ societyId: context.societyId, enabled: true });
    if (!config) throw new ConflictError('MCR payment gateway is not configured');

    const flatId = dto.flatId || context.user.flatId;
    if (!flatId) throw new ValidationError('flatId is required for gateway orders');
    const flat = await Flat.findOne({ _id: flatId, societyId: context.societyId });
    if (!flat) throw new NotFoundError('Flat');

    const outstandingPaise = await this.getOutstandingPaise(context.societyId, flatId);
    const settings = await mcrSettingsService.getBySociety(context.societyId, context.user.userId);
    const amountPaise = dto.amountPaise || outstandingPaise;
    if (!amountPaise) throw new ValidationError('No payable outstanding amount is available for this flat');
    if (amountPaise > outstandingPaise && !settings.allowAdvancePayment) {
      throw new ValidationError('Advance payments are disabled in MCR settings');
    }

    const resident = dto.residentId
      ? await Resident.findOne({ _id: dto.residentId, societyId: context.societyId, flatId, status: 'ACTIVE' })
      : await Resident.findOne({ societyId: context.societyId, flatId, primaryContact: true, status: 'ACTIVE' });
    const receivedDate = new Date();
    const paymentNumber = await mcrNumberingService.nextPaymentNumber(context.societyId, receivedDate);
    const gatewayOrderId = `MCRGO-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const payment = await McrPaymentRecord.create({
      societyId: context.societyId,
      paymentNumber,
      flatId,
      residentId: resident?._id,
      payerName: dto.payerName || resident?.name || 'Gateway Payer',
      payerMobile: dto.payerMobile || resident?.mobile,
      amountPaise,
      paymentMethod: 'PAYMENT_GATEWAY',
      paymentDate: receivedDate,
      receivedDate,
      status: 'DRAFT',
      source: 'PAYMENT_GATEWAY',
      enteredBy: context.user.userId,
      gatewayProvider: config.provider,
      gatewayOrderId,
      gatewaySignatureStatus: 'PENDING',
    });

    return {
      paymentId: payment._id!.toString(),
      paymentNumber,
      gatewayOrderId,
      provider: config.provider,
      amountPaise,
      checkoutPayload: {
        provider: config.provider,
        orderId: gatewayOrderId,
        publicKey: config.publicKey,
        paymentId: payment._id!.toString(),
        mockWebhookUrl: `/api/mcr/public/gateway/webhook/${config.provider.toLowerCase()}`,
      },
    };
  }

  async processWebhook(provider: string, headers: Record<string, unknown>, payload: Record<string, unknown>) {
    if (provider !== 'mock') throw new ValidationError('Unsupported gateway provider');
    const gatewayOrderId = `${payload.orderId || ''}`.trim();
    if (!gatewayOrderId) throw new ValidationError('orderId is required');
    const payment = await McrPaymentRecord.findOne({ gatewayOrderId });
    if (!payment) throw new NotFoundError('MCR payment');
    const config = await McrGatewayConfig.findOne({ societyId: payment.societyId, provider: 'MOCK' });
    if (!config?.enabled) throw new ConflictError('MCR payment gateway is not configured');

    const eventId = `${payload.eventId || gatewayOrderId}-${payload.status || 'UNKNOWN'}`;
    const existing = await McrGatewayWebhookEvent.findOne({ provider, eventId });
    if (existing) return { duplicate: true, eventId, paymentId: payment._id!.toString() };

    const signature = `${headers['x-mcr-gateway-secret'] || ''}`;
    const signatureStatus = !config.webhookSecret || signature === config.webhookSecret ? 'VALID' : 'INVALID';
    const event = await McrGatewayWebhookEvent.create({
      provider,
      eventId,
      gatewayOrderId,
      gatewayPaymentId: payload.paymentId,
      paymentId: payment._id,
      societyId: payment.societyId,
      signatureStatus,
      eventType: `${payload.status || 'UNKNOWN'}`,
      payload,
      processedAt: new Date(),
    });

    if (signatureStatus !== 'VALID') {
      payment.gatewaySignatureStatus = 'INVALID';
      await payment.save();
      return { duplicate: false, eventId, paymentId: payment._id!.toString(), signatureStatus };
    }

    payment.gatewayPaymentId = `${payload.paymentId || ''}` || undefined;
    payment.gatewaySignatureStatus = 'VALID';
    if (`${payload.status}`.toUpperCase() === 'SUCCESS') {
      if (config.autoVerifySuccessfulPayments && ['DRAFT', 'PENDING_VERIFICATION'].includes(payment.status)) {
        // Persist the gateway fields before verifySystemPayment re-fetches its own copy of the payment —
        // otherwise these in-memory changes are lost once verification loads a fresh document by ID.
        await payment.save();
        await mcrPaymentVerificationService.verifySystemPayment(payment.societyId.toString(), payment._id!.toString(), config.updatedBy.toString());
      } else if (payment.status === 'DRAFT') {
        payment.status = 'PENDING_VERIFICATION';
        await payment.save();
      }
    } else if (`${payload.status}`.toUpperCase() === 'FAILED') {
      payment.status = 'REJECTED';
      payment.rejectionReason = 'Gateway reported failed payment';
      await payment.save();
    } else {
      await payment.save();
    }

    return { duplicate: false, eventId: event.eventId, paymentId: payment._id!.toString(), signatureStatus };
  }

  private async getOutstandingPaise(societyId: string, flatId: string) {
    const result = await MaintenanceDemand.aggregate<{ _id: null; total: number }>([
      {
        $match: {
          societyId: new mongoose.Types.ObjectId(societyId),
          flatId: new mongoose.Types.ObjectId(flatId),
          status: { $in: ['PUBLISHED', 'PARTIALLY_PAID', 'OVERDUE'] },
          outstandingPaise: { $gt: 0 },
        },
      },
      { $group: { _id: null, total: { $sum: '$outstandingPaise' } } },
    ]);
    return result[0]?.total || 0;
  }
}

export const mcrGatewayService = new McrGatewayService();
