import { PatrolRound } from './patrolRound.model';
import { PatrolScan } from './patrolScan.model';
import { PatrolRoute } from './patrolRoute.model';
import { User } from '../user/user.model';

export interface GuardHitMissSummary {
  guardUserId: string;
  guardName: string;
  roundsCompleted: number;
  hit: number;
  late: number;
  missed: number;
  totalExpected: number;
  hitRatePercent: number;
}

// Only COMPLETED/ABANDONED rounds contribute a "missed" count — an IN_PROGRESS round's
// not-yet-scanned checkpoints aren't misses yet, the guard may still reach them.
const CLOSED_STATUSES = ['COMPLETED', 'ABANDONED'];

export class PatrolReportService {
  async getHitMissSummary(societyId: string, startDate: Date, endDate: Date): Promise<GuardHitMissSummary[]> {
    const rounds = await PatrolRound.find({ societyId, startedAt: { $gte: startDate, $lte: endDate } });
    if (!rounds.length) return [];

    const routeIds = [...new Set(rounds.map((r) => r.routeId.toString()))];
    const routes = await PatrolRoute.find({ _id: { $in: routeIds } });
    const routeCheckpointCount = new Map(routes.map((r) => [r._id!.toString(), r.checkpointIds.length]));

    const roundIds = rounds.map((r) => r._id!.toString());
    const scans = await PatrolScan.find({ roundId: { $in: roundIds } });
    const scansByRound = new Map<string, typeof scans>();
    for (const scan of scans) {
      const key = scan.roundId.toString();
      scansByRound.set(key, [...(scansByRound.get(key) || []), scan]);
    }

    const byGuard = new Map<string, { roundsCompleted: number; hit: number; late: number; missed: number }>();
    for (const round of rounds) {
      const guardId = round.guardUserId.toString();
      const bucket = byGuard.get(guardId) || { roundsCompleted: 0, hit: 0, late: 0, missed: 0 };
      const roundScans = scansByRound.get(round._id!.toString()) || [];
      bucket.hit += roundScans.filter((s) => s.status === 'HIT').length;
      bucket.late += roundScans.filter((s) => s.status === 'LATE').length;
      if (CLOSED_STATUSES.includes(round.status)) {
        bucket.roundsCompleted += 1;
        const expected = routeCheckpointCount.get(round.routeId.toString()) || 0;
        bucket.missed += Math.max(0, expected - roundScans.length);
      }
      byGuard.set(guardId, bucket);
    }

    const guardIds = [...byGuard.keys()];
    const guards = await User.find({ _id: { $in: guardIds } }).select('name');
    const guardNames = new Map(guards.map((g) => [g._id!.toString(), g.name]));

    return guardIds.map((guardUserId) => {
      const b = byGuard.get(guardUserId)!;
      const totalExpected = b.hit + b.late + b.missed;
      return {
        guardUserId,
        guardName: guardNames.get(guardUserId) || 'Unknown',
        roundsCompleted: b.roundsCompleted,
        hit: b.hit,
        late: b.late,
        missed: b.missed,
        totalExpected,
        hitRatePercent: totalExpected > 0 ? Math.round((b.hit / totalExpected) * 1000) / 10 : 0,
      };
    }).sort((a, b) => b.hitRatePercent - a.hitRatePercent);
  }

  private toCsv(rows: GuardHitMissSummary[]): string {
    const header = ['Guard', 'Rounds Completed', 'Hit', 'Late', 'Missed', 'Total Expected', 'Hit Rate %'];
    const lines = rows.map((r) => [r.guardName, r.roundsCompleted, r.hit, r.late, r.missed, r.totalExpected, r.hitRatePercent]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    return [header.join(','), ...lines].join('\n');
  }

  async exportMonthlyReport(societyId: string, year: number, month: number): Promise<{ fileName: string; content: string }> {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const rows = await this.getHitMissSummary(societyId, startDate, endDate);
    return {
      fileName: `guard-patrol-hit-miss-${year}-${String(month).padStart(2, '0')}.csv`,
      content: this.toCsv(rows),
    };
  }
}

export const patrolReportService = new PatrolReportService();
