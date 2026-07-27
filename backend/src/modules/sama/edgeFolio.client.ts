import { AppError } from '../../common/errors/AppError';

export interface EdgeFolioClientConfig {
  baseUrl: string;
  apiPrefix: string;
  accessToken: string;
}

export interface EdgeFolioEmployeeRecord {
  id: string;
  empCode?: string;
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  joiningDate?: string;
  salary?: number;
  status?: string;
  workType?: string;
  appRole?: string;
  allowRemoteAttendance?: boolean;
  paymentMode?: string;
  updatedAt?: string;
}

export interface EdgeFolioAttendanceRecord {
  eventId?: string;
  memberId?: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  hoursWorked?: number;
  faceMatch?: boolean;
  employeeName?: string;
  department?: string;
  updatedAt?: string;
}

export interface EdgeFolioShiftRecord {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  employees?: number;
  updatedAt?: string;
}

export interface EdgeFolioLeaveRecord {
  leaveId: string;
  employeeId: string;
  employeeName?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days?: number;
  reason?: string;
  status?: string;
  requestDate?: string;
  approvedBy?: string;
  updatedAt?: string;
}

export interface EdgeFolioPayrollRunRecord {
  runId: string;
  monthKey: string;
  monthLabel?: string;
  year?: number;
  status?: string;
  totalEmployees?: number;
  processed?: number;
  totalAmount?: number;
  processedDate?: string;
  processedBy?: string;
  updatedAt?: string;
}

export interface EdgeFolioPayslipRecord {
  payslipId: string;
  empCode?: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  employeePhone?: string;
  month: string;
  basicSalary?: number;
  earnings?: Record<string, unknown>;
  deductions?: Record<string, unknown>;
  gross?: number;
  netSalary?: number;
  bankAccount?: string;
  status?: string;
  dispute?: Record<string, unknown> | null;
  updatedAt?: string;
}

export interface EdgeFolioPayrollRunDetail {
  run: EdgeFolioPayrollRunRecord;
  payslips: EdgeFolioPayslipRecord[];
}

function normalizeList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === 'object') {
    const data = (body as Record<string, unknown>).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

export class EdgeFolioClient {
  constructor(private readonly config: EdgeFolioClientConfig) {}

  async listEmployees(): Promise<EdgeFolioEmployeeRecord[]> {
    return this.request<EdgeFolioEmployeeRecord>('/employees');
  }

  async listAttendance(date?: string): Promise<EdgeFolioAttendanceRecord[]> {
    return this.request<EdgeFolioAttendanceRecord>('/attendance', date ? { date } : undefined);
  }

  async listShifts(): Promise<EdgeFolioShiftRecord[]> {
    return this.request<EdgeFolioShiftRecord>('/shifts');
  }

  async listLeaves(): Promise<EdgeFolioLeaveRecord[]> {
    return this.request<EdgeFolioLeaveRecord>('/leaves');
  }

  async listPayrollRuns(): Promise<EdgeFolioPayrollRunRecord[]> {
    return this.request<EdgeFolioPayrollRunRecord>('/payroll/runs');
  }

  async getPayrollRunDetails(runId: string): Promise<EdgeFolioPayrollRunDetail> {
    const body = await this.requestObject(`/payroll/run/${runId}`);
    return {
      run: body.run as EdgeFolioPayrollRunRecord,
      payslips: Array.isArray(body.payslips) ? (body.payslips as EdgeFolioPayslipRecord[]) : [],
    };
  }

  private async request<T>(path: string, query?: Record<string, string | undefined>): Promise<T[]> {
    const url = new URL(`${this.normalizePrefix()}${path}`, this.normalizeBaseUrl());
    if (query) {
      Object.entries(query).forEach(([key, value]) => value && url.searchParams.set(key, value));
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });
    } catch {
      throw new AppError('EdgeFolio is unreachable', 502, 'EDGEFOLIO_UNREACHABLE');
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const payload = body as Record<string, unknown>;
      const message = payload.message || payload.error || 'EdgeFolio request failed';
      throw new AppError(String(message), 502, 'EDGEFOLIO_ERROR');
    }

    return normalizeList<T>(body);
  }

  private async requestObject(path: string): Promise<Record<string, unknown>> {
    const response = await this.fetchPath(path);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const payload = body as Record<string, unknown>;
      const message = payload.message || payload.error || 'EdgeFolio request failed';
      throw new AppError(String(message), 502, 'EDGEFOLIO_ERROR');
    }
    if (body && typeof body === 'object') {
      const data = (body as Record<string, unknown>).data;
      if (data && typeof data === 'object') {
        return data as Record<string, unknown>;
      }
    }
    return body as Record<string, unknown>;
  }

  private async fetchPath(path: string, query?: Record<string, string | undefined>): Promise<Response> {
    const url = new URL(`${this.normalizePrefix()}${path}`, this.normalizeBaseUrl());
    if (query) {
      Object.entries(query).forEach(([key, value]) => value && url.searchParams.set(key, value));
    }

    try {
      return await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });
    } catch {
      throw new AppError('EdgeFolio is unreachable', 502, 'EDGEFOLIO_UNREACHABLE');
    }
  }

  private normalizeBaseUrl(): string {
    return this.config.baseUrl.endsWith('/') ? this.config.baseUrl : `${this.config.baseUrl}/`;
  }

  private normalizePrefix(): string {
    const prefix = this.config.apiPrefix.startsWith('/') ? this.config.apiPrefix : `/${this.config.apiPrefix}`;
    return prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  }
}
