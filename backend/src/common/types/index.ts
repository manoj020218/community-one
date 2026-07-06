import { Request } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  mobile: string;
  roleCode: string;
  permissions: string[];
  societyId?: string;
  flatId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface BaseEntity {
  societyId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export type SortOrder = 'asc' | 'desc';

export interface FilterQuery {
  societyId?: string;
  isActive?: boolean;
  search?: string;
}
