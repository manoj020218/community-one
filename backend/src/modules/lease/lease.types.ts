export type LeaseStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED';

export interface CreateLeaseDto {
  societyId: string;
  flatId: string;
  residentId: string;
  rentAmount: number;
  depositAmount?: number;
  billingDay: number;
  startDate: Date;
  endDate: Date;
  noticePeriodDays?: number;
  remarks?: string;
}

export interface UpdateLeaseDto {
  rentAmount?: number;
  depositAmount?: number;
  billingDay?: number;
  startDate?: Date;
  endDate?: Date;
  noticePeriodDays?: number;
  remarks?: string;
}

export interface RenewLeaseDto {
  newEndDate: Date;
  newRentAmount?: number;
}

export interface TerminateLeaseDto {
  terminationDate: Date;
  reason?: string;
  depositRefundAmount?: number;
}
