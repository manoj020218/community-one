export type ZoneType = 'GATE' | 'GYM' | 'POOL' | 'SPA' | 'ROOM_BLOCK' | 'OTHER';
export type CredentialStatus = 'ACTIVE' | 'REVOKED';
export type AccessMode = 'ALWAYS' | 'SCHEDULED';
export type PolicyStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
export type MatchStatus = 'MATCHED' | 'UNRESOLVED_CREDENTIAL';

export interface CreateZoneDto {
  societyId: string;
  name: string;
  zoneType: ZoneType;
  description?: string;
  linkedGateId?: string;
}

export interface UpdateZoneDto {
  name?: string;
  zoneType?: ZoneType;
  description?: string;
  linkedGateId?: string;
}

export interface BindDeviceDto {
  deviceId: string;
}

export interface CreateCredentialDto {
  societyId: string;
  residentId: string;
  deviceId: string;
  deviceExternalUserId: string;
  label?: string;
}

export interface CreatePolicyDto {
  societyId: string;
  name: string;
  residentId: string;
  zoneIds: string[];
  accessMode?: AccessMode;
  allowedDaysOfWeek?: string[];
  dailyStartTime?: string;
  dailyEndTime?: string;
  validFrom?: Date;
  validUntil?: Date;
}

export interface UpdatePolicyDto {
  name?: string;
  zoneIds?: string[];
  accessMode?: AccessMode;
  allowedDaysOfWeek?: string[];
  dailyStartTime?: string;
  dailyEndTime?: string;
  validFrom?: Date;
  validUntil?: Date;
  status?: PolicyStatus;
}

export interface ResolveEventDto {
  residentId: string;
}
