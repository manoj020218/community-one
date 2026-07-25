export function normalizeGateCode(name: string, code?: string): string {
  const raw = code?.trim() || name.trim();
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function normalizeGateName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
