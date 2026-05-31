import { buildStreakCalendar, computeBenchmark, daysEarly } from './portal-stats.util';

describe('buildStreakCalendar', () => {
  const now = new Date('2025-05-15T00:00:00Z');

  it('returns one dot per month in the trailing window, oldest first', () => {
    const dots = buildStreakCalendar([], 6, now);
    expect(dots).toHaveLength(6);
    expect(dots[0].month).toBe('2024-12');
    expect(dots[5].month).toBe('2025-05');
    expect(dots.every((d) => d.status === 'empty')).toBe(true);
  });

  it('marks months with a paid charge as paid (via billingMonth)', () => {
    const dots = buildStreakCalendar(
      [{ billingMonth: '2025-04', dueDate: '2025-04-08', status: 'PAID', paidAt: '2025-04-02' }],
      6,
      now,
    );
    expect(dots.find((d) => d.month === '2025-04')!.status).toBe('paid');
  });

  it('falls back to the due-date month when billingMonth is absent', () => {
    const dots = buildStreakCalendar(
      [{ dueDate: '2025-03-10T00:00:00Z', status: 'PAID' }],
      6,
      now,
    );
    expect(dots.find((d) => d.month === '2025-03')!.status).toBe('paid');
  });

  it('classifies a past-due unpaid charge as missed and a future one as upcoming', () => {
    const dots = buildStreakCalendar(
      [
        { billingMonth: '2025-03', dueDate: '2025-03-08', status: 'OVERDUE' },
        { billingMonth: '2025-05', dueDate: '2025-05-28', status: 'PENDING' },
      ],
      6,
      now,
    );
    expect(dots.find((d) => d.month === '2025-03')!.status).toBe('missed');
    expect(dots.find((d) => d.month === '2025-05')!.status).toBe('upcoming');
  });
});

describe('daysEarly', () => {
  it('is positive when paid before the due date', () => {
    expect(daysEarly('2025-05-10', '2025-05-04')).toBe(6);
  });
  it('is negative when paid after the due date', () => {
    expect(daysEarly('2025-05-10', '2025-05-13')).toBe(-3);
  });
});

describe('computeBenchmark', () => {
  it('reports insufficient data when arrays are empty', () => {
    const b = computeBenchmark([], []);
    expect(b.memberAvgDaysEarly).toBeNull();
    expect(b.note).toMatch(/not enough/i);
  });

  it('computes averages and flags a member ahead of the network average', () => {
    const b = computeBenchmark([8, 10], [8, 10, 0, 2, 1, -3]);
    expect(b.memberAvgDaysEarly).toBe(9);
    expect(b.sampleSize).toBe(6);
    expect(b.note).toMatch(/earlier than the average/i);
  });

  it('recognises a top payer', () => {
    const b = computeBenchmark([12], [12, 1, 0, -2]);
    expect(b.topPayerAvgDaysEarly).toBe(12);
    expect(b.note).toMatch(/top payers/i);
  });
});
