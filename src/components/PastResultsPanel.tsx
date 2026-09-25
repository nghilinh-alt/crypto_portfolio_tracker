import { formatUsd, formatPct } from "@/lib/format";
import type { PeriodChange, PeriodPerformance } from "@/lib/periodPerformance";

const ROWS: Array<{ key: keyof PeriodPerformance; label: string }> = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "allTime", label: "All time" },
];

export default function PastResultsPanel({ performance }: { performance: PeriodPerformance }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Past Results</span>
      <div className="mt-2 divide-y divide-border/50">
        {ROWS.map(({ key, label }) => (
          <ResultRow key={key} label={label} change={performance[key]} />
        ))}
      </div>
    </div>
  );
}

function ResultRow({ label, change }: { label: string; change: PeriodChange | null }) {
  const tone = change === null ? "text-muted-foreground" : change.changeUsd >= 0 ? "text-emerald-500" : "text-destructive";
  return (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {change === null ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : (
        <div className="text-right">
          <div className={`text-sm font-medium tabular-nums ${tone}`}>
            {change.changeUsd >= 0 ? "+" : ""}
            {formatUsd(change.changeUsd, { compact: true })}
          </div>
          <div className={`text-xs tabular-nums ${tone}`}>
            {change.changePct >= 0 ? "+" : ""}
            {formatPct(change.changePct)}
          </div>
        </div>
      )}
    </div>
  );
}
