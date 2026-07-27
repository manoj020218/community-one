import { createHash } from 'crypto';
import { ConflictError } from '../../common/errors/AppError';
import { buildPaginatedResult, parsePagination } from '../../common/utils/response';
import { SamaActorContext } from './sama.access.service';
import { AccessCredential } from './accessCredential.model';
import { accessCredentialCreateSchema, accessCredentialListQuerySchema } from './accessCredential.schemas';
import { samaSubjectService } from './samaSubject.service';
import { parseOrThrow } from './sama.validation';

function hashCredential(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export class AccessCredentialService {
  async listBySociety(societyId: string, input: unknown) {
    const query = parseOrThrow(accessCredentialListQuerySchema, input);
    const filter: Record<string, unknown> = { societyId };
    if (query.subjectType) filter.subjectType = query.subjectType;
    if (query.subjectId) filter.subjectId = query.subjectId;
    if (query.credentialType) filter.credentialType = query.credentialType;
    if (query.status) filter.status = query.status;
    if (query.search) {
      const term = new RegExp(query.search, 'i');
      filter.$or = [{ credentialLabel: term }, { identifierLast4: term }];
    }
    const { page, limit, skip } = parsePagination(query);
    const [items, total] = await Promise.all([
      AccessCredential.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AccessCredential.countDocuments(filter),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async create(context: SamaActorContext, input: unknown) {
    const dto = parseOrThrow(accessCredentialCreateSchema, input);
    await samaSubjectService.ensureExists(context.societyId, dto.subjectType, dto.subjectId);
    if (dto.accessPolicyId) {
      const policy = await samaSubjectService.getActivePolicy(context.societyId, dto.accessPolicyId);
      samaSubjectService.ensurePolicyMatches(policy, dto.subjectType, dto.subjectId);
    }
    const identifierHash = hashCredential(dto.credentialValue);
    const existing = await AccessCredential.findOne({ societyId: context.societyId, credentialType: dto.credentialType, identifierHash });
    if (existing) throw new ConflictError('Credential already exists for this society');
    return AccessCredential.create({
      societyId: context.societyId,
      subjectType: dto.subjectType,
      subjectId: dto.subjectId,
      accessPolicyId: dto.accessPolicyId,
      credentialType: dto.credentialType,
      credentialLabel: dto.credentialLabel,
      identifierHash,
      identifierLast4: dto.credentialValue.slice(-4),
      validUntil: dto.validUntil,
      issuedAt: new Date(),
      createdBy: context.user.userId,
      updatedBy: context.user.userId,
    });
  }

  async revoke(context: SamaActorContext, credentialId: string) {
    const credential = await AccessCredential.findOne({ _id: credentialId, societyId: context.societyId }).orFail();
    if (credential.status === 'REVOKED') return credential;
    credential.status = 'REVOKED';
    credential.revokedAt = new Date();
    credential.revokedByUserId = context.user.userId;
    credential.updatedBy = context.user.userId;
    await credential.save();
    return credential;
  }
}

export const accessCredentialService = new AccessCredentialService();
