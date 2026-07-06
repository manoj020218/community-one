export type TowerType = 'TOWER' | 'BLOCK' | 'VILLA_ROW' | 'SHOP_BLOCK' | 'OTHER';

export interface ITower {
  societyId: string;
  name: string;
  code: string;
  type: TowerType;
  numberOfFloors: number;
  totalFlats: number;
  hasLift: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTowerDto {
  societyId: string;
  name: string;
  code?: string;
  type?: TowerType;
  numberOfFloors: number;
  totalFlats?: number;
  hasLift?: boolean;
}

export interface UpdateTowerDto {
  name?: string;
  type?: TowerType;
  numberOfFloors?: number;
  totalFlats?: number;
  hasLift?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface GenerateTowersDto {
  societyId: string;
  count: number;
  prefix?: string;
  type?: TowerType;
  numberOfFloors?: number;
  hasLift?: boolean;
}
