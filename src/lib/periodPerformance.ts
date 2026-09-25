import { startOfBrisbaneWeek, startOfBrisbaneMonth } from "./timezone";

export type PeriodChange = {
  startValue: number;
  endValue: number;
  changeUsd: number;
  changePct: number;
};

export type PeriodPerformance = {
  week: PeriodChange | null;
  month: PeriodChange | null;
  allTime: PeriodChange | null;
};

type Snapshot = { capturedAt: Date; totalValueUsd: number };

/** Change from the first snapshot at/after `periodStart` to the latest snapshot overall. */
function changeSince(snapshots: Snapshot[], periodStart: Date): PeriodChange | null {
  const inPeriod = snapshots.filter((s) => s.capturedAt >= periodStart);
  if (inPeriod.length === 0) return null;
  const startValue = inPeriod[0].totalValueUsd;
  const endValue = inPeriod[inPeriod.length - 1].totalValueUsd;
  const changeUsd = endValue - startValue;
  const changePct = startValue > 0 ? (changeUsd / startValue) * 100 : 0;
  return { startValue, endValue, changeUsd, changePct };
}

/**
 * Week/Month are calendar periods in Brisbane time (Sunday 00:00 – Saturday
 * 23:59 for week, 1st-of-month for month) rather than a rolling window, so
 * "this week" always means the same thing regardless of when you check.
 * `snapshots` must be sorted ascending by capturedAt.
 */
export function computePeriodPerformance(snapshots: Snapshot[], now: Date = new Date()): PeriodPerformance {
  if (snapshots.length === 0) return { week: null, month: null, allTime: null };
  return {
    week: changeSince(snapshots, startOfBrisbaneWeek(now)),
    month: changeSince(snapshots, startOfBrisbaneMonth(now)),
    allTime: changeSince(snapshots, new Date(0)),
  };
}
