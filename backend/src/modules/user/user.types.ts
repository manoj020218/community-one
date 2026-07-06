export type UserRoleCode =
  | 'JENIX_SUPER_ADMIN'
  | 'JENIX_SUPPORT'
  | 'SOCIETY_ADMIN'
  | 'COMMITTEE_MEMBER'
  | 'ACCOUNTANT'
  | 'SECURITY_GUARD'
  | 'FACILITY_MANAGER'
  | 'OWNER'
  | 'TENANT'
  | 'FAMILY_MEMBER'
  | 'VENDOR'
  | 'STAFF';

export interface IUser {
  name: string;
  email: string;
  mobile: string;
  passwordHash: string;
  roleCode: UserRoleCode;
  permissions: string[];
  societyId?: string;
  flatId?: string;
  photoUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  lastLoginAt?: Date;
  refreshToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserDto {
  name: string;
  email: string;
  mobile: string;
  password: string;
  roleCode: UserRoleCode;
  societyId?: string;
  flatId?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  mobile?: string;
  photoUrl?: string;
  societyId?: string;
  flatId?: string;
}

export interface UserPublicDto {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  roleCode: string;
  permissions: string[];
  societyId?: string;
  flatId?: string;
  photoUrl?: string;
  isActive: boolean;
  lastLoginAt?: Date;
}
