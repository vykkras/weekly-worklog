import type { WeekEntry } from '../store/projectStore';

export type EntryStatus = 'paid' | 'overdue' | 'pending' | 'no-date';

export function daysFromApproved(entry: WeekEntry): number | null {
  if (!entry.approvedDate) return null;
  const d = new Date(entry.approvedDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / 86_400_000);
}

export function getEntryStatus(entry: WeekEntry, net: 14 | 30 = 30): EntryStatus {
  const allPaid = entry.workCodes.length > 0 && entry.workCodes.every(w => w.paid);
  if (allPaid) return 'paid';
  if (!entry.approvedDate) return 'no-date';
  const days = daysFromApproved(entry);
  if (days === null) return 'no-date';
  if (days > net) return 'overdue';
  return 'pending';
}
