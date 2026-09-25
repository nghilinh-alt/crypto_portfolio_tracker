"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUsd, formatPct, formatShortDate, formatShortDateTime } from "@/lib/format";

export type SnapshotPoint = {
  capturedAt: string; // ISO
  totalValueUsd: number;
  perToken: Record<string, number>; // tokenId -> holdingsValueUsd at that snapshot
};

export type TokenOption = { id: string; symbol: string; name: string; holdingsValueUsd: number };

type Timeframe = "week" | "month" | "year" | "all";

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
  all: "All",
};

const TIMEFRAME_DAYS: Record<Timeframe, number | null> = {
  week: 7,
  month: 30,
  year: 365,
  all: null,
};

export default function PortfolioProgress({
  snapshots,
  tokens,
  mode = "total",
}: {
  snapshots: SnapshotPoint[];
  tokens: TokenOption[];
  /**
   * "total" (default): the "All portfolio" line uses the snapshot's stored
   * totalValueUsd (full net worth — holdings + Cash Bucket + pool). "sum-
   * tokens": the "All portfolio" line instead sums each of `tokens`' own
   * perToken value — used for the per-asset-type (Crypto/Stock) dashboard
   * views, since there's no historical per-asset-type net-worth figure to
   * fall back on, only per-token holdings value.
   */
  mode?: "total" | "sum-tokens";
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [selectedTokenId, setSelectedTokenId] = useState<string>("all");

  const selectedToken = tokens.find((t) => t.id === selectedTokenId);

  // Highest-value asset first, so opening the dropdown surfaces the
  // position that matters most for whichever tab/asset-type it's showing.
  const sortedTokenOptions = useMemo(
    () => tokens.slice().sort((a, b) => b.holdingsValueUsd - a.holdingsValueUsd),
    [tokens]
  );

  // Short timeframes are granular enough that two points can share a
  // calendar day (e.g. testing, or refreshing more than once a week) — the
  // date-only axis label would print the same thing twice with no way to
  // tell them apart, so those views get time-of-day in the label too.
  const includeTimeInLabel = timeframe === "week" || timeframe === "month";

  const filtered = useMemo(() => {
    const days = TIMEFRAME_DAYS[timeframe];
    // Cutoff is relative to the latest snapshot, not wall-clock time — pure
    // function of props (no Date.now()), and it means "last week" still
    // shows data if you haven't refreshed in a while, instead of going blank.
    const latestTs = snapshots.length
      ? Math.max(...snapshots.map((s) => new Date(s.capturedAt).getTime()))
      : 0;
    const cutoff = days ? latestTs - days * 24 * 60 * 60 * 1000 : -Infinity;

    // A token (or, in sum-tokens mode, the whole filtered set) only has real
    // history from the point it was first snapshotted onward — treating
    // earlier gaps as $0 would draw a fake "always worth nothing" flat line.
    const relevant =
      selectedTokenId !== "all"
        ? snapshots.filter((s) => selectedTokenId in s.perToken)
        : mode === "total"
          ? snapshots
          : snapshots.filter((s) => tokens.some((t) => t.id in s.perToken));

    return relevant
      .filter((s) => new Date(s.capturedAt).getTime() >= cutoff)
      .map((s) => ({
        date: includeTimeInLabel ? formatShortDateTime(s.capturedAt) : formatShortDate(s.capturedAt),
        value:
          selectedTokenId !== "all"
            ? s.perToken[selectedTokenId]
            : mode === "total"
              ? s.totalValueUsd
              : tokens.reduce((sum, t) => sum + (s.perToken[t.id] ?? 0), 0),
      }));
  }, [snapshots, timeframe, selectedTokenId, includeTimeInLabel, mode, tokens]);

  const hasAnyHistory =
    selectedTokenId !== "all"
      ? snapshots.some((s) => selectedTokenId in s.perToken)
      : mode === "total"
        ? snapshots.length > 0
        : snapshots.some((s) => tokens.some((t) => t.id in s.perToken));

  const startingValue = filtered[0]?.value ?? 0;
  const latestValue = filtered[filtered.length - 1]?.value ?? 0;
  const periodChange = latestValue - startingValue;
  const periodChangePct = startingValue > 0 ? (periodChange / startingValue) * 100 : 0;
  const periodHigh = filtered.length ? Math.max(...filtered.map((p) => p.value)) : 0;
  const periodLow = filtered.length ? Math.min(...filtered.map((p) => p.value)) : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-4 border-b border-border/60 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">01</span>
            <h2 className="text-2xl font-display font-medium text-foreground">
              Portfolio Progress
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            One point per weekly price check — track value across each review period.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2 sm:min-w-56">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Showing
            </span>
            <select
              value={selectedTokenId}
              onChange={(e) => setSelectedTokenId(e.target.value)}
              className="min-w-0 bg-transparent text-right text-sm font-medium text-foreground outline-none"
              aria-label="Filter progress by token"
            >
              <option value="all">All portfolio</option>
              {sortedTokenOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.symbol} · {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1 sm:flex">
            {(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTimeframe(option)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  timeframe === option
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {TIMEFRAME_LABELS[option]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_3fr]">
        <div className="grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-1">
          <ProgressStat label="Starting value" value={formatUsd(startingValue)} />
          <ProgressStat
            label="Period change"
            value={`${periodChange >= 0 ? "+" : ""}${formatUsd(periodChange)}`}
            sub={`${periodChangePct >= 0 ? "+" : ""}${formatPct(periodChangePct)}`}
            tone={periodChange >= 0 ? "positive" : "negative"}
          />
          <ProgressStat label="Period high" value={formatUsd(periodHigh)} />
          <ProgressStat label="Period low" value={formatUsd(periodLow)} />
        </div>

        <div className="h-[260px] min-w-0">
          {filtered.length < 2 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/60 text-center">
              <p className="text-sm text-muted-foreground">
                {!hasAnyHistory
                  ? selectedToken
                    ? `${selectedToken.symbol} was added after the last price check.`
                    : mode === "sum-tokens"
                      ? "Nothing here yet — add one to start tracking its progress."
                      : "This token was added after the last price check."
                  : filtered.length === 0
                    ? "No snapshots in this range yet."
                    : "Only one check so far."}
              </p>
              <p className="text-xs text-muted-foreground/70">
                A trend line appears once more weekly refreshes have run.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filtered} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={58}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(value) => formatUsd(value, { compact: true })}
                  domain={["dataMin", "dataMax"]}
                />
                <Tooltip
                  cursor={{ stroke: "var(--primary)", strokeDasharray: "3 3" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                  }}
                  formatter={(value) => [
                    formatUsd(Number(value)),
                    selectedToken ? `${selectedToken.symbol} value` : "Portfolio value",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#portfolioValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

function ProgressStat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneColor =
    tone === "positive" ? "text-emerald-500" : tone === "negative" ? "text-destructive" : "text-foreground";
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-xl font-display font-medium tracking-tight ${toneColor}`}>
        {value}
      </div>
      {sub && <div className={`text-xs ${toneColor}`}>{sub}</div>}
    </div>
  );
}
