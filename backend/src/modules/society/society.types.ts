export type SocietyStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ONBOARDING';
export type BillingStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED';
export type PlanCode = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE';

export interface ISociety {
  name: string;
  code: string;
  logoUrl?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  contactPersonName: string;
  contactMobile: string;
  contactEmail: string;
  planCode: PlanCode;
  enabledModules: string[];
  status: SocietyStatus;
  billingStatus: BillingStatus;
  onboardingComplete: boolean;
  selfOnboarded?: boolean;
  agentCode?: string;
  trialEndsAt?: Date;
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSocietyDto {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPersonName: string;
  contactMobile: string;
  contactEmail: string;
  planCode?: PlanCode;
  logoUrl?: string;
  country?: string;
}

export interface UpdateSocietyDto {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactPersonName?: string;
  contactMobile?: string;
  contactEmail?: string;
  logoUrl?: string;
  planCode?: PlanCode;
  status?: SocietyStatus;
}
