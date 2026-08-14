/**
 * Strips photo/image data out of a device push body before it's stored. Applied regardless of
 * device brand or firmware behavior — a defense-in-depth backstop for the explicit requirement
 * that photos never persist on the Jenix side, even if a gateway's own filtering (e.g. the U5
 * ESP32 gateway) hasn't been implemented or has a bug. Only affects what gets STORED; the
 * original rawBody is still what gets parsed for normalized fields.
 */
const KNOWN_IMAGE_FIELDS = new Set([
  'pic_large', 'picLarge', 'noteImg', 'noteImgName', 'noteLiveMax', 'noteLiveMin', 'photo', 'image',
]);

// Any legitimate device field (IDs, names, timestamps, small enums) is well under this. A string
// longer than this in a push body is almost certainly base64 image data under a field name we
// haven't seen yet.
const MAX_STRING_LENGTH = 2000;

export function sanitizeRawBody(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeRawBody);

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (KNOWN_IMAGE_FIELDS.has(key)) {
        out[key] = '[stripped: image data not stored]';
      } else if (typeof v === 'string' && v.length > MAX_STRING_LENGTH) {
        out[key] = `[stripped: string too long (${v.length} chars)]`;
      } else {
        out[key] = sanitizeRawBody(v);
      }
    }
    return out;
  }

  return value;
}
