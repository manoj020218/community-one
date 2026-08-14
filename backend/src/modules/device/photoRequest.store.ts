import { randomUUID } from 'crypto';

/**
 * Deliberately NOT a Mongoose model — photos requested on-demand (e.g. for an audit or incident
 * lookup) must never touch the database or disk. Held in process memory only, for a short window,
 * and deleted the moment they've been read once. If the process restarts, in-flight requests are
 * simply lost — acceptable for an on-demand lookup, not meant to be a reliable delivery queue.
 */
type PhotoRequestStatus = 'PENDING' | 'READY';

interface PhotoRequestEntry {
  apiKey: string;
  deviceExternalUserId: string;
  checkinTime: string;
  status: PhotoRequestStatus;
  photoBase64?: string;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const store = new Map<string, PhotoRequestEntry>();

function sweepExpired(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt < now) store.delete(id);
  }
}
setInterval(sweepExpired, 60_000).unref();

export function createPhotoRequest(apiKey: string, deviceExternalUserId: string, checkinTime: string): string {
  const requestId = randomUUID();
  store.set(requestId, { apiKey, deviceExternalUserId, checkinTime, status: 'PENDING', expiresAt: Date.now() + TTL_MS });
  return requestId;
}

/** Called by the gateway's regular poll — at most one pending request surfaced per poll, so a device is never asked to fetch more than one photo at a time. */
export function getPendingRequestForDevice(apiKey: string): { requestId: string; deviceExternalUserId: string; checkinTime: string } | null {
  for (const [requestId, entry] of store) {
    if (entry.apiKey === apiKey && entry.status === 'PENDING') {
      return { requestId, deviceExternalUserId: entry.deviceExternalUserId, checkinTime: entry.checkinTime };
    }
  }
  return null;
}

export function fulfillPhotoRequest(requestId: string, apiKey: string, photoBase64: string): boolean {
  const entry = store.get(requestId);
  if (!entry || entry.apiKey !== apiKey) return false;
  entry.status = 'READY';
  entry.photoBase64 = photoBase64;
  entry.expiresAt = Date.now() + TTL_MS;
  return true;
}

/** One-time read: returns the photo if ready, then immediately deletes the entry so it's never held any longer than necessary. */
export function consumePhotoRequest(requestId: string): { status: 'PENDING' | 'READY' | 'NOT_FOUND'; photoBase64?: string } {
  const entry = store.get(requestId);
  if (!entry) return { status: 'NOT_FOUND' };
  if (entry.status === 'PENDING') return { status: 'PENDING' };
  store.delete(requestId);
  return { status: 'READY', photoBase64: entry.photoBase64 };
}
