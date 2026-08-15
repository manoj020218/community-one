export type ZoneType = 'GATE' | 'GYM' | 'POOL' | 'SPA' | 'ROOM_BLOCK' | 'OTHER';

export const ZONE_TYPES: ZoneType[] = ['GATE', 'GYM', 'POOL', 'SPA', 'ROOM_BLOCK', 'OTHER'];

export interface Zone {
  _id: string;
  societyId: string;
  name: string;
  zoneType: ZoneType;
  description?: string;
  deviceCount: number;
}

export interface ZoneDeviceBinding {
  _id: string;
  zoneId: string;
  deviceId: { _id: string; deviceName: string; deviceType: string; make?: string } | string;
}

export interface AccessCredential {
  _id: string;
  residentId: { _id: string; name: string; mobile: string } | string;
  deviceId: { _id: string; deviceName: string } | string;
  deviceExternalUserId: string;
  label?: string;
  status: 'ACTIVE' | 'REVOKED';
}

export interface AccessPolicy {
  _id: string;
  name: string;
  residentId: { _id: string; name: string; mobile: string } | string;
  zoneIds: Array<{ _id: string; name: string; zoneType: ZoneType } | string>;
  accessMode: 'ALWAYS' | 'SCHEDULED';
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
}

export interface AccessEvent {
  _id: string;
  zoneId: { _id: string; name: string; zoneType: ZoneType } | string;
  residentId?: { _id: string; name: string; mobile: string } | string;
  deviceExternalUserId: string;
  occurredAt: string;
  passed: boolean;
  matchStatus: 'MATCHED' | 'UNRESOLVED_CREDENTIAL';
}
