import { AppError } from '../../common/errors/AppError';
import { decryptSecret, encryptSecret } from './sama.crypto';
import { ISamaSourceDocument, SamaSource } from './samaSource.model';
import { samaSourceUpdateSchema } from './samaSource.schemas';
import { parseOrThrow } from './sama.validation';

export interface SamaSourceClientConfig {
  baseUrl: string;
  apiPrefix: string;
  accessToken: string;
}

const SYNC_FIELDS = {
  EMPLOYEES: 'lastEmployeeSyncAt',
  ATTENDANCE: 'lastAttendanceSyncAt',
  LEAVES: 'lastLeaveSyncAt',
  SHIFTS: 'lastShiftSyncAt',
  PAYROLL: 'lastPayrollSyncAt',
  ACCESS_EVENTS: 'lastAccessEventSyncAt',
} as const;

type SourceField =
  | 'lastEmployeeSyncAt'
  | 'lastAttendanceSyncAt'
  | 'lastShiftSyncAt'
  | 'lastLeaveSyncAt'
  | 'lastPayrollSyncAt'
  | 'lastAccessEventSyncAt';

export class SamaSourceService {
  async getMaskedBySociety(societyId: string): Promise<Record<string, unknown>> {
    const source = await SamaSource.findOne({ societyId, provider: 'EDGEFOLIO' }).lean();
    if (!source) return { provider: 'EDGEFOLIO', configured: false };
    return this.toMasked(source);
  }

  async update(userId: string, societyId: string, input: unknown): Promise<Record<string, unknown>> {
    const parsed = parseOrThrow(samaSourceUpdateSchema, input);
    const update: Record<string, unknown> = { updatedBy: userId };

    if (parsed.baseUrl) update.baseUrl = parsed.baseUrl.replace(/\/+$/, '');
    if (parsed.apiPrefix) update.apiPrefix = this.normalizePrefix(parsed.apiPrefix);
    if (typeof parsed.isActive === 'boolean') update.isActive = parsed.isActive;
    if (typeof parsed.syncScheduleEnabled === 'boolean') update.syncScheduleEnabled = parsed.syncScheduleEnabled;
    if (typeof parsed.syncIntervalMinutes === 'number') update.syncIntervalMinutes = parsed.syncIntervalMinutes;
    if (parsed.scheduledSyncTypes) update.scheduledSyncTypes = parsed.scheduledSyncTypes;
    if (typeof parsed.syncRetryLimit === 'number') update.syncRetryLimit = parsed.syncRetryLimit;
    if (typeof parsed.staleAfterMinutes === 'number') update.staleAfterMinutes = parsed.staleAfterMinutes;
    if (parsed.accessToken) update.encryptedAccessToken = encryptSecret(parsed.accessToken);
    if (parsed.clearAccessToken) update.encryptedAccessToken = undefined;

    const source = await SamaSource.findOneAndUpdate(
      { societyId, provider: 'EDGEFOLIO' },
      { $set: { ...update, createdBy: userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return this.toMasked(source!);
  }

  async getClientConfig(societyId: string): Promise<SamaSourceClientConfig> {
    const source = await SamaSource.findOne({ societyId, provider: 'EDGEFOLIO' });
    if (!source) throw new AppError('SAMA source is not configured', 409, 'SAMA_SOURCE_NOT_CONFIGURED');
    if (!source.isActive) throw new AppError('SAMA source is inactive', 409, 'SAMA_SOURCE_INACTIVE');

    const accessToken = decryptSecret(source.encryptedAccessToken);
    if (!accessToken) {
      throw new AppError('SAMA source access token is missing', 409, 'SAMA_SOURCE_TOKEN_MISSING');
    }

    return {
      baseUrl: source.baseUrl,
      apiPrefix: this.normalizePrefix(source.apiPrefix),
      accessToken,
    };
  }

  async markSyncSuccess(societyId: string, field: SourceField): Promise<void> {
    const now = new Date();
    await SamaSource.updateOne(
      { societyId, provider: 'EDGEFOLIO' },
      { $set: { [field]: now, lastSuccessfulSyncAt: now, lastSyncError: undefined, consecutiveSyncFailures: 0 } }
    );
  }

  async markSyncFailure(societyId: string, message: string): Promise<void> {
    const now = new Date();
    await SamaSource.updateOne(
      { societyId, provider: 'EDGEFOLIO' },
      { $set: { lastSyncError: message.slice(0, 300), lastSyncFailureAt: now }, $inc: { consecutiveSyncFailures: 1 } }
    );
  }

  async markScheduledSyncRun(societyId: string): Promise<void> {
    await SamaSource.updateOne(
      { societyId, provider: 'EDGEFOLIO' },
      { $set: { lastScheduledSyncAt: new Date() } }
    );
  }

  async listDueScheduledSources(limit: number, asOf: Date = new Date()): Promise<ISamaSourceDocument[]> {
    const sources = await SamaSource.find({
      provider: 'EDGEFOLIO',
      isActive: true,
      syncScheduleEnabled: true,
    }).sort({ updatedAt: 1 }).limit(limit);

    return sources.filter((source) => {
      if (!source.lastScheduledSyncAt) return true;
      return asOf.getTime() - source.lastScheduledSyncAt.getTime() >= source.syncIntervalMinutes * 60_000;
    });
  }

  async getHealthBySociety(societyId: string, asOf: Date = new Date()): Promise<Record<string, unknown>> {
    const source = await SamaSource.findOne({ societyId, provider: 'EDGEFOLIO' }).lean();
    if (!source) return { configured: false, provider: 'EDGEFOLIO', overallStatus: 'NOT_CONFIGURED' };
    const syncChecks = (source.scheduledSyncTypes || []).map((syncType) => {
      const field = SYNC_FIELDS[syncType as keyof typeof SYNC_FIELDS];
      const rawValue = field ? (source as Record<string, unknown>)[field] : undefined;
      const lastSyncedAt = rawValue ? new Date(String(rawValue)) : undefined;
      const ageMinutes = lastSyncedAt ? Math.floor((asOf.getTime() - lastSyncedAt.getTime()) / 60_000) : null;
      const isStale = !lastSyncedAt || ageMinutes! >= Number(source.staleAfterMinutes || 180);
      return { syncType, lastSyncedAt: lastSyncedAt || null, ageMinutes, isStale };
    });
    const staleSyncTypes = syncChecks.filter((item) => item.isStale).map((item) => item.syncType);
    return {
      configured: true,
      provider: source.provider,
      overallStatus: source.lastSyncError || staleSyncTypes.length || source.consecutiveSyncFailures ? 'ATTENTION' : 'OK',
      syncScheduleEnabled: source.syncScheduleEnabled,
      syncIntervalMinutes: source.syncIntervalMinutes,
      syncRetryLimit: source.syncRetryLimit,
      staleAfterMinutes: source.staleAfterMinutes,
      consecutiveSyncFailures: source.consecutiveSyncFailures || 0,
      lastSyncError: source.lastSyncError,
      lastSyncFailureAt: source.lastSyncFailureAt || null,
      lastSuccessfulSyncAt: source.lastSuccessfulSyncAt || null,
      staleSyncTypes,
      syncChecks,
    };
  }

  async markAlertSent(societyId: string): Promise<void> {
    await SamaSource.updateOne({ societyId, provider: 'EDGEFOLIO' }, { $set: { lastSyncAlertAt: new Date() } });
  }

  private toMasked(source: Partial<Record<keyof ISamaSourceDocument, unknown>>): Record<string, unknown> {
    return {
      provider: source.provider || 'EDGEFOLIO',
      configured: true,
      baseUrl: source.baseUrl,
      apiPrefix: source.apiPrefix,
      isActive: source.isActive,
      syncScheduleEnabled: source.syncScheduleEnabled,
      syncIntervalMinutes: source.syncIntervalMinutes,
      scheduledSyncTypes: source.scheduledSyncTypes,
      syncRetryLimit: source.syncRetryLimit,
      staleAfterMinutes: source.staleAfterMinutes,
      hasAccessToken: Boolean(source.encryptedAccessToken),
      lastEmployeeSyncAt: source.lastEmployeeSyncAt,
      lastAttendanceSyncAt: source.lastAttendanceSyncAt,
      lastShiftSyncAt: source.lastShiftSyncAt,
      lastLeaveSyncAt: source.lastLeaveSyncAt,
      lastPayrollSyncAt: source.lastPayrollSyncAt,
      lastAccessEventSyncAt: source.lastAccessEventSyncAt,
      lastScheduledSyncAt: source.lastScheduledSyncAt,
      lastSuccessfulSyncAt: source.lastSuccessfulSyncAt,
      lastSyncFailureAt: source.lastSyncFailureAt,
      lastSyncAlertAt: source.lastSyncAlertAt,
      lastSyncError: source.lastSyncError,
      consecutiveSyncFailures: source.consecutiveSyncFailures || 0,
      updatedAt: source.updatedAt,
    };
  }

  private normalizePrefix(value: string): string {
    const prefix = value.startsWith('/') ? value : `/${value}`;
    return prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  }
}

export const samaSourceService = new SamaSourceService();
