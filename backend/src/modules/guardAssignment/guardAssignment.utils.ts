import { IGuardAssignmentDocument } from './guardAssignment.model';

export function isAssignmentActiveNow(assignment: IGuardAssignmentDocument, now: Date = new Date()): boolean {
  if (!assignment.isActive) return false;
  if (assignment.validFrom && assignment.validFrom > now) return false;
  if (assignment.validUntil && assignment.validUntil < now) return false;
  if (!assignment.shiftStart || !assignment.shiftEnd) return true;

  const [startHour, startMinute] = assignment.shiftStart.split(':').map(Number);
  const [endHour, endMinute] = assignment.shiftEnd.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return true;
  if (startMinutes <= endMinutes) return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
  return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
}
