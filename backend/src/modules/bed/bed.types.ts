export type BedStatus = 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';

export interface CreateBedDto {
  societyId: string;
  flatId: string;
  bedNumber: string;
}

export interface GenerateBedsDto {
  societyId: string;
  flatId: string;
  count: number;
}

export interface UpdateBedDto {
  bedNumber?: string;
  status?: BedStatus;
}

export interface AssignBedDto {
  residentId: string;
}
