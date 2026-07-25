export function withSocietyQuery(path: string, societyId?: string): string {
  if (!societyId) return path;
  return `${path}${path.includes('?') ? '&' : '?'}societyId=${societyId}`;
}

export function getRequestStatusTone(status?: string): string {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'APPROVED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'REJECTED':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'ENTRY_CONFIRMED':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'EXPIRED':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-slate-200 bg-white text-slate-700';
  }
}
