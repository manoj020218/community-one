export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'DISABLE' | 'ENABLE'
  | 'LOGIN' | 'LOGOUT' | 'MODULE_ENABLED' | 'MODULE_DISABLED'
  | 'DEVICE_MAPPED' | 'PAYMENT_CREATED' | 'RECEIPT_GENERATED'
  | 'FILE_UPLOADED' | 'ROLE_ASSIGNED';

export interface IAuditLog {
  societyId?: string;
  actorUserId: string;
  actorRole: string;
  moduleCode: string;
  action: AuditAction | string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

export interface CreateAuditLogDto {
  societyId?: string;
  actorUserId: string;
  actorRole: string;
  moduleCode: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  societyId?: string;
  actorUserId?: string;
  moduleCode?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
}
