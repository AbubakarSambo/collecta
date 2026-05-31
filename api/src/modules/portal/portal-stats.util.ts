/**
 * Pure, Prisma-free helpers that power the payer-portal engagement layer:
 * the per-month streak calendar and the peer benchmark. Kept side-effect free
 * so they can be unit tested in isolation (see portal-stats.util.spec.ts).
 */

export type StreakDotStatus = 'paid' | 'missed' | 'upcoming' | 'empty';

export interface StreakDot {
  /** Month key, e.g. "2025-05" */
  month: string;
  /** Short month label, e.g. "May" */
  label: string;
  status: StreakDotStatus;
}

export interface StreakCharge {
  billingMonth?: string | null;
  dueDate: Date | string;
  status: string;
  paidAt?: Date | string | null;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

const PAID_STATUSES = new Set(['PAID', 'WAIVED']);

/**
 * Builds an oldest-to-newest array of month dots for the trailing `months`
 * window (inclusive of the current month), classifying each month as paid,
 * missed, upcoming, or empty based on that month's charges.
 */
export function buildStreakCalendar(
  charges: StreakCharge[],
  months = 18,
  now: Date = new Date(),
): StreakDot[] {
  // Group charges by their billing month (fall back to the due-date month).
  const byMonth = new Map<string, StreakCharge[]>();
  for (const charge of charges) {
    const due = new Date(charge.dueDate);
    const key = charge.billingMonth || monthKey(due);
    const list = byMonth.get(key);
    if (list) list.push(charge);
    else byMonth.set(key, [charge]);
  }

  const dots: StreakDot[] = [];
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
    const key = monthKey(d);
    const monthCharges = byMonth.get(key) ?? [];

    let status: StreakDotStatus;
    if (monthCharges.length === 0) {
      status = 'empty';
    } else if (monthCharges.some((c) => PAID_STATUSES.has(c.status))) {
      status = 'paid';
    } else {
      // Unpaid charge(s) this month: missed if any is already past due, else upcoming.
      const anyPastDue = monthCharges.some((c) => new Date(c.dueDate).getTime() <= now.getTime());
      status = anyPastDue ? 'missed' : 'upcoming';
    }

    dots.push({ month: key, label: MONTH_LABELS[d.getUTCMonth()], status });
  }

  return dots;
}

export interface Benchmark {
  /** Average days the member pays before the due date (negative = late). */
  memberAvgDaysEarly: number | null;
  /** Network-wide average days early. */
  networkAvgDaysEarly: number | null;
  /** Average days early of the earliest-paying cohort (~top 10%). */
  topPayerAvgDaysEarly: number | null;
  /** Number of network payments the benchmark is based on. */
  sampleSize: number;
  /** Human-readable summary for the UI. */
  note: string;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/**
 * Computes a peer benchmark from per-payment "days early" figures
 * (dueDate - paidAt, in whole days; positive means paid before the due date).
 *
 * @param memberDaysEarly  the member's own per-payment days-early values
 * @param networkDaysEarly every network payment's days-early values (incl. the member's)
 */
export function computeBenchmark(
  memberDaysEarly: number[],
  networkDaysEarly: number[],
): Benchmark {
  const memberAvg = average(memberDaysEarly);
  const networkAvg = average(networkDaysEarly);

  // Top payers = earliest ~10% of network payments (at least one).
  const sorted = [...networkDaysEarly].sort((a, b) => b - a);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.1));
  const topAvg = average(sorted.slice(0, topCount));

  let note: string;
  if (memberAvg === null || networkAvg === null) {
    note = 'Not enough payment history yet to compare.';
  } else if (topAvg !== null && memberAvg >= topAvg) {
    note = 'You are among the top payers in this organisation.';
  } else {
    const diff = Math.round(memberAvg - networkAvg);
    if (diff > 0) {
      note = `You pay ${diff} day${diff === 1 ? '' : 's'} earlier than the average member.`;
    } else if (diff < 0) {
      note = `You pay ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} later than the average member.`;
    } else {
      note = 'You pay right around the same time as the average member.';
    }
  }

  return {
    memberAvgDaysEarly: memberAvg,
    networkAvgDaysEarly: networkAvg,
    topPayerAvgDaysEarly: topAvg,
    sampleSize: networkDaysEarly.length,
    note,
  };
}

/** Whole-day difference between a due date and when it was paid (positive = early). */
export function daysEarly(dueDate: Date | string, paidAt: Date | string): number {
  const due = new Date(dueDate).getTime();
  const paid = new Date(paidAt).getTime();
  return Math.round((due - paid) / (1000 * 60 * 60 * 24));
}
