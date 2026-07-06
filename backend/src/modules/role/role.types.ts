export interface IRole {
  code: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateRoleDto {
  code: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: string[];
}
