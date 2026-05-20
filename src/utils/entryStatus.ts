import type { WeekEntry } from '../store/projectStore';

export type EntryStatus = 'paid' | 'overdue' | 'pending' | 'no-date';

export function daysFromWorkDate(entry: WeekEntry): number | null {
  if (!entry.workDate) return null;
  const work = new Date(entry.workDate);
  // Compare date-only (no time component drift)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  work.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - work.getTime()) / 86_400_000);
}

export function getEntryStatus(entry: WeekEntry): EntryStatus {
  const allPaid = entry.workCodes.length > 0 && entry.workCodes.every(w => w.paid);
  if (allPaid) return 'paid';

  const days = daysFromWorkDate(entry);
  if (days === null) return 'no-date';
  if (days > 30) return 'overdue';

  return 'pending';
}

export function isOverdue(entry: WeekEntry): boolean {
  return getEntryStatus(entry) === 'overdue';
}
