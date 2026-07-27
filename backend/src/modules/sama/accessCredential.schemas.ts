import { z } from 'zod';
import { stringSchema } from './sama.validation';

const subjectTypeSchema = z.enum(['STAFF_PROFILE', 'SERVICE_PROVIDER', 'WORK_ORDER']);
const credentialTypeSchema = z.enum(['PIN', 'QR', 'RFID', 'BIOMETRIC_REFERENCE', 'MOBILE_TOKEN']);
const statusSchema = z.enum(['ACTIVE', 'REVOKED', 'EXPIRED']);

export const accessCredentialCreateSchema = z.object({
  societyId: stringSchema.optional(),
  subjectType: subjectTypeSchema,
  subjectId: stringSchema,
  accessPolicyId: stringSchema.optional(),
  credentialType: credentialTypeSchema,
  credentialLabel: z.string().trim().max(200).optional(),
  credentialValue: stringSchema,
  validUntil: z.coerce.date().optional(),
});

export const accessCredentialListQuerySchema = z.object({
  societyId: stringSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  subjectType: subjectTypeSchema.optional(),
  subjectId: stringSchema.optional(),
  credentialType: credentialTypeSchema.optional(),
  status: statusSchema.optional(),
  search: z.string().trim().optional(),
});
