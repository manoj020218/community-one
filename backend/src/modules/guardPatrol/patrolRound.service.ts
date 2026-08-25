import { PatrolRound, IPatrolRoundDocument } from './patrolRound.model';
import { PatrolScan, IPatrolScanDocument, PatrolScanMethod } from './patrolScan.model';
import { PatrolRoute } from './patrolRoute.model';
import { PatrolCheckpoint } from './patrolCheckpoint.model';
import { patrolSettingsService } from './patrolSettings.service';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors/AppError';

export interface ScanCheckpointDto {
  token: string;
  lat: number;
  lng: number;
  gpsAccuracyM?: number;
  method: PatrolScanMethod;
}

export interface RoundProgress {
  round: IPatrolRoundDocument;
  scans: IPatrolScanDocument[];
  expectedCheckpointIds: string[];
  remainingCheckpointIds: string[];
  alertThresholdMinutes: number;
}

export class PatrolRoundService {
  async startRound(societyId: string, guardUserId: string, routeId: string): Promise<IPatrolRoundDocument> {
    const route = await PatrolRoute.findOne({ _id: routeId, societyId, isActive: true });
    if (!route) throw new ValidationError('Route does not belong to this society');

    const existing = await PatrolRound.findOne({ societyId, guardUserId, status: 'IN_PROGRESS' });
    if (existing) throw new ConflictError('You already have a round in progress — finish or end it before starting a new one');

    return PatrolRound.create({ societyId, routeId, guardUserId, startedAt: new Date() });
  }

  async getProgress(societyId: string, roundId: string, guardUserId: string): Promise<RoundProgress> {
    const round = await PatrolRound.findOne({ _id: roundId, societyId, guardUserId });
    if (!round) throw new NotFoundError('Round');
    const route = await PatrolRoute.findById(round.routeId);
    if (!route) throw new NotFoundError('Route');
    const scans = await PatrolScan.find({ roundId }).sort({ scannedAt: 1 });
    const scannedIds = new Set(scans.map((s) => s.checkpointId.toString()));
    const expectedCheckpointIds = route.checkpointIds.map((id) => id.toString());
    const remainingCheckpointIds = expectedCheckpointIds.filter((id) => !scannedIds.has(id));
    const settings = await patrolSettingsService.getSettings(societyId);
    const alertThresholdMinutes = route.alertThresholdMinutes ?? settings.defaultAlertThresholdMinutes;
    return { round, scans, expectedCheckpointIds, remainingCheckpointIds, alertThresholdMinutes };
  }

  async scanCheckpoint(societyId: string, roundId: string, guardUserId: string, dto: ScanCheckpointDto): Promise<IPatrolScanDocument> {
    const round = await PatrolRound.findOne({ _id: roundId, societyId, guardUserId });
    if (!round) throw new NotFoundError('Round');
    if (round.status !== 'IN_PROGRESS') throw new ConflictError('This round has already ended');

    const checkpoint = await PatrolCheckpoint.findOne({ token: dto.token, societyId, isActive: true });
    if (!checkpoint) throw new ValidationError('Unknown checkpoint code');

    const route = await PatrolRoute.findById(round.routeId);
    if (!route) throw new NotFoundError('Route');
    const checkpointId = (checkpoint._id as any).toString();
    if (!route.checkpointIds.map((id) => id.toString()).includes(checkpointId)) {
      throw new ValidationError('This checkpoint is not part of your assigned route');
    }

    const alreadyScanned = await PatrolScan.findOne({ roundId, checkpointId });
    if (alreadyScanned) throw new ConflictError('This checkpoint was already scanned in this round');

    const settings = await patrolSettingsService.getSettings(societyId);
    const thresholdMinutes = route.alertThresholdMinutes ?? settings.defaultAlertThresholdMinutes;

    const lastScan = await PatrolScan.findOne({ roundId }).sort({ scannedAt: -1 });
    const referenceTime = lastScan ? lastScan.scannedAt : round.startedAt;
    const now = new Date();
    const elapsedMinutes = (now.getTime() - referenceTime.getTime()) / 60000;
    const status = elapsedMinutes <= thresholdMinutes ? 'HIT' : 'LATE';

    const scan = await PatrolScan.create({
      societyId,
      roundId,
      checkpointId,
      scannedAt: now,
      status,
      method: dto.method,
      lat: dto.lat,
      lng: dto.lng,
      gpsAccuracyM: dto.gpsAccuracyM,
    });

    // Auto-complete once every checkpoint on the route has been scanned — the guard doesn't
    // have to remember to tap "End Round" for the common case of a fully-completed round.
    const totalScanned = await PatrolScan.countDocuments({ roundId });
    if (totalScanned >= route.checkpointIds.length) {
      await PatrolRound.findByIdAndUpdate(roundId, { status: 'COMPLETED', completedAt: now });
    }

    return scan;
  }

  async endRound(societyId: string, roundId: string, guardUserId: string): Promise<IPatrolRoundDocument> {
    const round = await PatrolRound.findOneAndUpdate(
      { _id: roundId, societyId, guardUserId, status: 'IN_PROGRESS' },
      { status: 'COMPLETED', completedAt: new Date() },
      { new: true }
    );
    if (!round) throw new NotFoundError('Round');
    return round;
  }

  async findActiveForGuard(societyId: string, guardUserId: string): Promise<IPatrolRoundDocument | null> {
    return PatrolRound.findOne({ societyId, guardUserId, status: 'IN_PROGRESS' }).populate('routeId', 'name checkpointIds alertThresholdMinutes');
  }

  async findLiveRounds(societyId: string): Promise<IPatrolRoundDocument[]> {
    return PatrolRound.find({ societyId, status: 'IN_PROGRESS' })
      .populate('guardUserId', 'name mobile')
      .populate('routeId', 'name checkpointIds')
      .sort({ startedAt: 1 });
  }

  // Background sweep — rounds left IN_PROGRESS well past any reasonable shift shouldn't
  // linger forever and skew Hit/Miss stats. Mirrors visitorExpiryWorker's convention.
  async abandonStaleRounds(maxAgeHours = 12): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeHours * 3600000);
    const result = await PatrolRound.updateMany(
      { status: 'IN_PROGRESS', startedAt: { $lt: cutoff } },
      { status: 'ABANDONED', completedAt: new Date() }
    );
    return result.modifiedCount;
  }
}

export const patrolRoundService = new PatrolRoundService();
