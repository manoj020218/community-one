export interface ProvisionSocietyDto {
  societyName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPersonName: string;
  email: string;
  mobile: string;
  agentCode?: string;
  trialEndsAt?: string; // ISO date; defaults to +6 months if omitted
}

export interface ProvisionSocietyResult {
  ok: true;
  societyId: string;
  adminUserId: string;
  societyCode: string;
  adminEmail: string;
  tempPassword: string;
  loginUrl: string;
  trialEndsAt: string;
}
