import { AppError } from '../../common/errors/AppError';
import { SamaSourceClientConfig } from './samaSource.service';

export interface EdgeFolioM68DeviceRecord {
  id?: number | string;
  devId: string;
  name?: string;
  location?: string;
  enabled?: boolean;
  online?: boolean;
  lastSeenAt?: string;
}

export interface EdgeFolioU5DeviceRecord {
  id?: number | string;
  deviceName: string;
  deviceSn: string;
  connectionMode?: string;
  status?: string;
  lastSeen?: string;
  lastPolledAt?: string;
}

export interface EdgeFolioM68EventRecord {
  id: number | string;
  devId: string;
  kind: string;
  hasPayload?: boolean;
  receivedAt?: string;
}

function normalizeList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === 'object' && Array.isArray((body as Record<string, unknown>).data)) {
    return (body as Record<string, unknown>).data as T[];
  }
  return [];
}

export class EdgeFolioAccessClient {
  constructor(private readonly config: SamaSourceClientConfig) {}

  async listM68Devices(): Promise<EdgeFolioM68DeviceRecord[]> {
    return this.request<EdgeFolioM68DeviceRecord>('/m68/devices');
  }

  async listU5Devices(): Promise<EdgeFolioU5DeviceRecord[]> {
    return this.request<EdgeFolioU5DeviceRecord>('/u5/devices');
  }

  async listM68Events(limit?: number): Promise<EdgeFolioM68EventRecord[]> {
    return this.request<EdgeFolioM68EventRecord>('/m68/events', limit ? { limit: String(limit) } : undefined);
  }

  private async request<T>(path: string, query?: Record<string, string>): Promise<T[]> {
    const url = new URL(`${this.normalizePrefix()}${path}`, this.normalizeBaseUrl());
    Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, value));

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
      throw new AppError(String(payload.message || payload.error || 'EdgeFolio request failed'), 502, 'EDGEFOLIO_ERROR');
    }
    return normalizeList<T>(body);
  }

  private normalizeBaseUrl(): string {
    return this.config.baseUrl.endsWith('/') ? this.config.baseUrl : `${this.config.baseUrl}/`;
  }

  private normalizePrefix(): string {
    const prefix = this.config.apiPrefix.startsWith('/') ? this.config.apiPrefix : `/${this.config.apiPrefix}`;
    return prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  }
}
