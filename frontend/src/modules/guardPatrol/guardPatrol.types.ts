export interface PatrolCheckpoint {
  _id: string;
  name: string;
  method: 'QR' | 'NFC';
  token: string;
  towerId?: { _id: string; name: string; code: string } | string;
  isActive: boolean;
}

export interface PatrolRoute {
  _id: string;
  name: string;
  checkpointIds: Array<{ _id: string; name: string; method: string }> | string[];
  alertThresholdMinutes?: number;
  isActive: boolean;
}

export interface PatrolAssignment {
  _id: string;
  userId: { _id: string; name: string; mobile: string; roleCode: string } | string;
  routeId: { _id: string; name: string } | string;
  shiftStart?: string;
  shiftEnd?: string;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

export interface PatrolRound {
  _id: string;
  routeId: { _id: string; name: string; checkpointIds: string[] } | string;
  guardUserId: { _id: string; name: string; mobile: string } | string;
  startedAt: string;
  completedAt?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
}

export interface PatrolScan {
  _id: string;
  roundId: string;
  checkpointId: string;
  scannedAt: string;
  status: 'HIT' | 'LATE';
  method: 'QR' | 'NFC';
  lat: number;
  lng: number;
  gpsAccuracyM?: number;
}

export interface RoundProgress {
  round: PatrolRound;
  scans: PatrolScan[];
  expectedCheckpointIds: string[];
  remainingCheckpointIds: string[];
  alertThresholdMinutes: number;
}

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

export interface PatrolSettings {
  defaultAlertThresholdMinutes: number;
  defaultAlertSoundKey: string;
}

export const ALERT_SOUNDS = [
  { key: 'chime', label: 'Chime' },
  { key: 'beep', label: 'Beep' },
  { key: 'siren', label: 'Siren' },
] as const;
