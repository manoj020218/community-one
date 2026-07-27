import { ValidationError } from '../../common/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { SamaActorContext } from './sama.access.service';
import { HouseholdAssociation } from './householdAssociation.model';
import { HouseholdPaymentRecord } from './householdPaymentRecord.model';
import { householdPaymentCreateSchema, householdPaymentListQuerySchema, householdPaymentUpdateSchema } from './householdPayment.schemas';
import { HouseholdRateCard } from './householdRateCard.model';
import { parseOrThrow } from './sama.validation';

function computeStatus(duePaise: number, paidPaise: number) {
  if (paidPaise <= 0) return 'DUE';
  if (paidPaise >= duePaise) return 'PAID';
  return 'PARTIAL';
}

export class HouseholdPaymentService {
  async listForActor(context: SamaActorContext, input: unknown) {
    const query = parseOrThrow(householdPaymentListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId: context.societyId };
    if (query.flatId) filter.flatId = query.flatId;
    if (query.billingMonth) filter.billingMonth = query.billingMonth;
    if (query.status) filter.status = query.status;
    if (!context.user.permissions.includes('sama.view_society') && context.user.flatId) filter.flatId = context.user.flatId;
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      HouseholdPaymentRecord.find(filter).sort({ billingMonth: -1, createdAt: -1 }).skip(skip).limit(limit),
      HouseholdPaymentRecord.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(householdPaymentCreateSchema, input);
    const association = await HouseholdAssociation.findOne({ _id: dto.associationId, societyId: context.societyId }).orFail();
    if (association.status !== 'ACTIVE') throw new ValidationError('Only active household associations can record payments');
    if (dto.rateCardId) await HouseholdRateCard.findOne({ _id: dto.rateCardId, societyId: context.societyId, associationId: dto.associationId }).orFail();
    const paidPaise = dto.paidPaise || 0;
    return HouseholdPaymentRecord.create({
      societyId: context.societyId,
      associationId: association._id,
      rateCardId: dto.rateCardId,
      staffProfileId: association.staffProfileId,
      flatId: association.flatId,
      residentId: association.residentId,
      billingMonth: dto.billingMonth,
      duePaise: dto.duePaise,
      paidPaise,
      status: computeStatus(dto.duePaise, paidPaise),
      paymentMethod: dto.paymentMethod,
      paidAt: dto.paidAt,
      notes: dto.notes,
      receiptRef: dto.receiptRef,
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });
  }

  async update(context: SamaActorContext, paymentId: string, input: unknown) {
    const dto = parseOrThrow(householdPaymentUpdateSchema, input);
    const payment = await HouseholdPaymentRecord.findOne({ _id: paymentId, societyId: context.societyId }).orFail();
    if (dto.rateCardId) await HouseholdRateCard.findOne({ _id: dto.rateCardId, societyId: context.societyId, associationId: payment.associationId }).orFail();
    payment.rateCardId = dto.rateCardId || payment.rateCardId;
    payment.duePaise = dto.duePaise ?? payment.duePaise;
    payment.paidPaise = dto.paidPaise ?? payment.paidPaise;
    payment.status = computeStatus(payment.duePaise, payment.paidPaise) as any;
    if (payment.status === 'PAID') payment.paidAt = dto.paidAt || payment.paidAt || new Date();
    if (dto.paymentMethod !== undefined) payment.paymentMethod = dto.paymentMethod;
    if (dto.notes !== undefined) payment.notes = dto.notes;
    if (dto.receiptRef !== undefined) payment.receiptRef = dto.receiptRef;
    payment.updatedBy = context.user.userId;
    await payment.save();
    return payment;
  }
}

export const householdPaymentService = new HouseholdPaymentService();
