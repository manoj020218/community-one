export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code: string; message: string; details?: any };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  roleCode: string;
  permissions: string[];
  societyId?: string;
  societyName?: string;
  flatId?: string;
  linkedGoogleEmail?: string;
  photoUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface Society {
  _id: string;
  name: string;
  code: string;
  logoUrl?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPersonName: string;
  contactMobile: string;
  contactEmail: string;
  planCode: string;
  vertical?: 'COMMUNITY' | 'HOSTEL';
  enabledModules: string[];
  status: string;
  billingStatus: string;
  onboardingComplete: boolean;
  timezone?: string;
  currency?: string;
  createdAt: string;
}

export interface Tower {
  _id: string; societyId: string; name: string; code: string; type: string;
  numberOfFloors: number; hasGroundFloor?: boolean; basementCount?: number;
  totalFlats: number; hasLift: boolean; status: string;
}

export interface Floor {
  _id: string; societyId: string; towerId: string; floorNumber: number;
  floorName: string; floorType?: 'BASEMENT' | 'GROUND' | 'TYPICAL' | 'TERRACE' | 'OTHER';
  flatNumberPrefix?: string; totalFlats: number; status: string;
}

export interface Flat {
  _id: string; societyId: string; towerId: any; floorId: any;
  flatNo: string; flatType: string; areaSqFt?: number;
  occupancyStatus: string; parkingSlots: number; status: string;
}

export interface Resident {
  _id: string; societyId: string; flatId: any; name: string;
  mobile: string; email?: string; photoUrl?: string;
  memberType: string; loginAllowed: boolean; primaryContact: boolean;
  userId?: string;
  kycStatus: string;
  kycVerifiedBy?: { _id: string; name: string };
  kycVerifiedAt?: string;
  kycPhysicalLocation?: string;
  kycNotes?: string;
  status: string;
}

export interface Bed {
  _id: string; societyId: string; flatId: any; bedNumber: string;
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
  assignedResidentId?: { _id: string; name: string; mobile: string } | string;
}

export interface Vehicle {
  _id: string; societyId: string; flatId: any; vehicleNo: string;
  vehicleType: string; brand?: string; model?: string; color?: string;
  parkingSlot?: string; entryAllowed: boolean; isBlacklisted: boolean; status: string;
}

export interface Pet {
  _id: string; societyId: string; residentId: any; petName: string;
  petType: string; breed?: string; aggressiveFlag: boolean;
  vaccinationExpiryDate?: string; vaccinationRecordUrl?: string; status: string;
}

export interface Module {
  _id: string; code: string; name: string; description: string;
  version: string; status: string; icon: string; isEnabled?: boolean;
}

export interface Notification {
  _id: string; title: string; message: string; type: string;
  moduleCode: string; readAt?: string; priority: string;
  deliveryStatus: string; createdAt: string;
}

export interface AuditLog {
  _id: string; actorUserId: any; actorRole: string; moduleCode: string;
  action: string; entityType: string; entityId?: string; createdAt: string;
}

export interface PaymentRecord {
  _id: string; societyId: string; flatId: any; amount: number;
  paymentPurpose: string; paymentMode: string; paymentStatus: string;
  paymentDate: string; createdAt: string;
}

export interface Receipt {
  _id: string; societyId: string; receiptNo: string; flatId: any;
  amount: number; purpose: string; paymentMode: string;
  receiptDate: string; verificationCode: string; status: string;
}

export interface Device {
  _id: string; societyId: string; deviceName: string; deviceType: string;
  deviceCode: string; gateName?: string; location?: string; ipAddress?: string;
  apiKey: string; make?: string; firmwareVersion?: string; lastHeartbeatAt?: string;
  onlineStatus: boolean; status: string;
}

export interface DeviceEventLog {
  _id: string; deviceId: string; make: string; rawBody: unknown;
  parsedEvents: Array<{ deviceExternalUserId: string; personName?: string; timestamp: string; method: string; passed: boolean }>;
  warning?: string; receivedAt: string;
}

export interface Role {
  _id: string; code: string; name: string; permissions: string[]; isSystemRole: boolean;
}

export type UserRole = 'JENIX_SUPER_ADMIN' | 'JENIX_SUPPORT' | 'SOCIETY_ADMIN' | 'COMMITTEE_MEMBER' | 'ACCOUNTANT' | 'SECURITY_GUARD' | 'FACILITY_MANAGER' | 'OWNER' | 'TENANT' | 'FAMILY_MEMBER';

export type LeaseStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

export interface Lease {
  _id: string; societyId: string;
  flatId: any; residentId: any;
  rentAmount: number; depositAmount: number;
  depositRefundAmount?: number; depositRefundedAt?: string;
  billingDay: number;
  startDate: string; endDate: string;
  noticePeriodDays: number;
  status: LeaseStatus;
  terminationDate?: string; terminationReason?: string;
  remarks?: string;
  createdAt: string;
}
