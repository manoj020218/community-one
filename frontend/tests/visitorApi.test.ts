import { describe, expect, it } from 'vitest';
import { getRequestStatusTone, withSocietyQuery } from '../src/modules/visitor/visitorApi';

describe('visitorApi helpers', () => {
  it('adds society query parameters safely', () => {
    expect(withSocietyQuery('/api/visitor/context', 'soc-1')).toBe('/api/visitor/context?societyId=soc-1');
    expect(withSocietyQuery('/api/visitor/requests?limit=5', 'soc-1')).toBe('/api/visitor/requests?limit=5&societyId=soc-1');
  });

  it('returns stable request status tone classes', () => {
    expect(getRequestStatusTone('APPROVED')).toContain('emerald');
    expect(getRequestStatusTone('REJECTED')).toContain('rose');
  });
});
