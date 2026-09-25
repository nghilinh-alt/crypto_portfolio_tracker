"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import PortfolioProgress, { type SnapshotPoint } from "./PortfolioProgress";
import PortfolioCashPool from "./PortfolioCashPool";
import TokenAvatar from "./TokenAvatar";
import { formatUsd, formatPrice, formatPct, formatQty } from "@/lib/format";
import type { TokenStatus } from "@/lib/ladder";
import { assetDetailHref } from "@/lib/assetRoute";

export type DashboardToken = {
  id: string;
  symbol: string;
  name: string;
  iconUrl: string | null;
  assetType: "CRYPTO" | "STOCK" | "BULLION";
  categoryName: string | null;
  baseHoldings: number;
  basePrice: number;
  basePriceSetAt: string; // ISO
  status: TokenStatus;
  currentPrice: number;
  recentHigh: number;
  dayChangePct: number | null;
  holdings: number;
  holdingsValueUsd: number;
  cashBucket: number;
  cashBucketContributions: number;
  taxReserved: number;
  gainFromBasePct: number;
  drawdownPct: number;
};

type Tab = "ALL" | "CRYPTO" | "STOCK" | "BULLION";

/** Day change threshold (either direction) to flag a position as "on fire" or "icy" in the Active Positions list. */
const ON_FIRE_THRESHOLD_PCT = 8;

type PositionSortKey = "symbol" | "currentPrice" | "basePrice" | "recentHigh" | "value";

const POSITION_GRID_COLS =
  "grid-cols-[minmax(240px,1.6fr)_minmax(110px,.8fr)_minmax(145px,1fr)_minmax(145px,1fr)_minmax(130px,.9fr)]";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "CRYPTO", label: "Crypto" },
  { key: "STOCK", label: "Stocks" },
  { key: "BULLION", label: "Bullion" },
];

function getTokenColor(symbol: string) {
  const colors = [
    "from-blue-600 to-indigo-600",
    "from-emerald-500 to-teal-700",
    "from-purple-500 to-fuchsia-700",
    "from-orange-500 to-red-600",
    "from-cyan-500 to-blue-700",
    "from-zinc-600 to-zinc-900",
  ];
  const index = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

export default function DashboardTabs({
  tokens,
  snapshots,
  poolBalance,
}: {
  tokens: DashboardToken[];
  snapshots: SnapshotPoint[];
  poolBalance: number;
}) {
  const [tab, setTab] = useState<Tab>("ALL");
  const [sortKey, setSortKey] = useState<PositionSortKey>("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: PositionSortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(
    () => (tab === "ALL" ? tokens : tokens.filter((t) => t.assetType === tab)),
    [tokens, tab]
  );

  const sortedPositions = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.slice().sort((a, b) => {
      switch (sortKey) {
        case "symbol":
          return dir * a.symbol.localeCompare(b.symbol);
        case "currentPrice":
          return dir * (a.currentPrice - b.currentPrice);
        case "basePrice":
          return dir * (a.basePrice - b.basePrice);
        case "recentHigh":
          return dir * (a.recentHigh - b.recentHigh);
        case "value":
          return dir * (a.holdingsValueUsd - b.holdingsValueUsd);
      }
    });
  }, [filtered, sortKey, sortDir]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, t) => {
          acc.holdingsValue += t.holdingsValueUsd;
          acc.cashBucket += t.cashBucket;
          acc.contributions += t.cashBucketContributions;
          acc.taxReserved += t.taxReserved;
          acc.valueAtBase += t.baseHoldings * t.basePrice;
          return acc;
        },
        { holdingsValue: 0, cashBucket: 0, contributions: 0, taxReserved: 0, valueAtBase: 0 }
      ),
    [filtered]
  );

  // The Portfolio Cash Pool is untethered to any single asset type, so it
  // only counts toward the true whole-portfolio total (ALL) — folding it
  // into the Crypto or Stocks totals would misattribute it to one type and
  // double-count it if you compared the two type-scoped totals side by side.
  const totalValue = totals.holdingsValue + totals.cashBucket + (tab === "ALL" ? poolBalance : 0);
  const gainUsd = totalValue - totals.valueAtBase;
  const gainPct = totals.valueAtBase > 0 ? (gainUsd / totals.valueAtBase) * 100 : 0;

  const categoryCounts = new Map<string, number>();
  for (const t of filtered) {
    const key = t.categoryName ?? "Uncategorized";
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
  }
  const categoryBreakdown = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `${count} ${label}`)
    .join(" · ");

  const actionable = filtered.filter((t) => t.status === "SELL" || t.status === "BUY");

  const assetNounPlural =
    tab === "CRYPTO" ? "tokens" : tab === "STOCK" ? "stocks" : tab === "BULLION" ? "bullion" : "positions";
  const addHref = tab === "STOCK" ? "/stocks" : tab === "BULLION" ? "/bullion" : "/tokens";

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-foreground">Command Center</h1>
          <p className="text-muted-foreground text-sm">Decisive action, measured execution.</p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:flex">
          {TABS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setTab(option.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === option.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl bg-card border border-border p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider">
                {tab === "ALL"
                  ? "Total Portfolio Value"
                  : tab === "CRYPTO"
                    ? "Total Crypto Value"
                    : tab === "STOCK"
                      ? "Total Stocks Value"
                      : "Total Bullion Value"}
              </span>
              <div className="text-5xl md:text-6xl font-display font-semibold mt-2 tracking-tight">{formatUsd(totalValue)}</div>
            </div>
            <div className="mt-8 flex items-center gap-4 relative z-10">
              <div className={`flex items-center gap-1 font-medium ${gainPct >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                {gainPct >= 0 ? "+" : ""}
                {formatPct(gainPct)} vs base
              </div>
              <span className="text-muted-foreground/60 text-sm">
                {gainUsd >= 0 ? "+" : ""}
                {formatUsd(gainUsd)} all time
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex-1 rounded-2xl bg-card border border-border p-5 flex flex-col justify-center">
              <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-1">Cash Bucket</span>
              <div className="text-3xl font-display font-medium text-foreground tracking-tight">{formatUsd(totals.cashBucket)}</div>
              <span className="text-xs text-muted-foreground mt-1">From {formatUsd(totals.contributions)} contributions</span>
            </div>
            <div className="flex-1 rounded-2xl bg-card border border-border p-5 flex flex-col justify-center">
              <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-1">Tax Reserved</span>
              <div className="text-3xl font-display font-medium text-foreground tracking-tight">{formatUsd(totals.taxReserved)}</div>
              <span className="text-xs text-muted-foreground mt-1">Ready for withholding</span>
            </div>
            {tab === "ALL" && (
              <PortfolioCashPool
                balance={poolBalance}
                tokens={tokens.map((t) => ({ id: t.id, symbol: t.symbol }))}
              />
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState assetNounPlural={assetNounPlural} href={addHref} />
      ) : (
        <div className="space-y-8">
          <PortfolioProgress
            snapshots={snapshots}
            tokens={filtered.map((t) => ({ id: t.id, symbol: t.symbol, name: t.name }))}
            mode={tab === "ALL" ? "total" : "sum-tokens"}
          />

          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div>
                <h2 className="text-2xl font-display font-medium flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground">02</span>
                  Active Positions
                  <span className="text-base font-normal text-muted-foreground">({filtered.length})</span>
                </h2>
                {categoryBreakdown && (
                  <p className="mt-1 pl-7 text-xs text-muted-foreground">{categoryBreakdown}</p>
                )}
              </div>
              <Link href={addHref} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Manage all
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className={`hidden xl:grid ${POSITION_GRID_COLS} gap-6 border-b border-border/60 bg-muted/30 px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground`}>
                <PositionSortHeader
                  label={tab === "STOCK" ? "Stock" : tab === "BULLION" ? "Bullion" : "Token"}
                  sortKey="symbol"
                  activeKey={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                />
                <PositionSortHeader label="Current price" sortKey="currentPrice" activeKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <PositionSortHeader label="Base price" sortKey="basePrice" activeKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <PositionSortHeader label="Recent high" sortKey="recentHigh" activeKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                <PositionSortHeader label="Value" sortKey="value" activeKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
              </div>

              <div className="divide-y divide-border/50">
                {sortedPositions.map((token) => {
                    const value = token.holdingsValueUsd;
                    const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;
                    const gain = token.gainFromBasePct;
                    const drawdown = token.drawdownPct;
                    const gradient = getTokenColor(token.symbol);
                    const isOnFire = token.dayChangePct !== null && token.dayChangePct >= ON_FIRE_THRESHOLD_PCT;
                    const isIcy = token.dayChangePct !== null && token.dayChangePct <= -ON_FIRE_THRESHOLD_PCT;
                    const priceColorClass =
                      token.currentPrice > token.basePrice
                        ? "text-emerald-500"
                        : token.currentPrice < token.basePrice
                          ? "text-destructive"
                          : "text-foreground";

                    return (
                      <Link key={token.id} href={assetDetailHref(token.assetType, token.id)} className="block group hover:bg-muted/40 transition-colors">
                        <div className={`p-4 xl:grid ${POSITION_GRID_COLS} xl:items-center xl:gap-6 xl:px-6 xl:py-4`}>
                          <div className="flex items-center gap-4">
                            <TokenAvatar
                              symbol={token.symbol}
                              iconUrl={token.iconUrl}
                              gradient={gradient}
                              className="h-10 w-10 text-xs shadow-inner"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium flex items-center gap-2 text-foreground">
                                {token.symbol}
                                <span className="text-xs text-muted-foreground font-normal">{token.name}</span>
                                {isOnFire && (
                                  <span
                                    className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-500"
                                    title={`Up ${formatPct(token.dayChangePct!)} since last check`}
                                  >
                                    🔥 +{formatPct(token.dayChangePct!)}
                                  </span>
                                )}
                                {isIcy && (
                                  <span
                                    className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-500"
                                    title={`Down ${formatPct(Math.abs(token.dayChangePct!))} since last check`}
                                  >
                                    🧊 {formatPct(token.dayChangePct!)}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-3 xl:block">
                                <span className="text-sm text-muted-foreground">
                                  {formatQty(token.holdings)} {token.symbol}
                                </span>
                                <span className={`whitespace-nowrap font-medium tabular-nums xl:hidden ${priceColorClass}`}>
                                  {formatPrice(token.currentPrice)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="hidden xl:block xl:text-right">
                            <span className={`font-medium tabular-nums ${priceColorClass}`}>{formatPrice(token.currentPrice)}</span>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/40 pt-3 xl:contents">
                            <StackedPositionMetric
                              label="Base price"
                              primary={formatPrice(token.basePrice)}
                              secondary={`+${formatPct(gain)} gain`}
                              secondaryTone={gain > 0 ? "positive" : gain < 0 ? "negative" : "neutral"}
                            />
                            <StackedPositionMetric
                              label="Recent high"
                              primary={formatPrice(token.recentHigh)}
                              secondary={`${formatPct(-drawdown)} drawdown`}
                              secondaryTone={drawdown > 0 ? "negative" : "neutral"}
                            />
                            <div className="col-span-3 mt-1 flex items-end justify-between border-t border-border/40 pt-3 text-right xl:col-span-1 xl:mt-0 xl:block xl:border-0 xl:pt-0">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground xl:hidden">Value</span>
                              <div>
                                <div className="font-medium text-foreground">{formatUsd(value)}</div>
                                <div className="mt-0.5 flex items-center justify-end gap-2">
                                  <span className="text-xs text-muted-foreground font-mono">{allocation.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h2 className="text-2xl font-display font-medium flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground">03</span>
                Attention Required
              </h2>
              <div className="flex items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-mono px-2 py-0.5">
                {actionable.length}
              </div>
            </div>

            {actionable.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {actionable.map((token) => (
                  <div key={token.id} className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <StatusBadge status={token.status} />
                      <span className="text-xs text-muted-foreground font-mono">{token.symbol}</span>
                    </div>
                    <div className="font-display font-medium text-xl mb-1 text-foreground">Action needed</div>
                    <div className="text-sm text-muted-foreground mb-6">Rungs eligible for execution</div>
                    <div className="mt-auto">
                      <Link href="/action-centre" className="inline-flex w-full items-center justify-center rounded-md bg-secondary text-secondary-foreground px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors">
                        Review Actions
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 flex flex-col items-center justify-center text-center text-muted-foreground bg-card/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 mb-3 opacity-20"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                <p className="text-sm font-medium text-foreground">No immediate targets approaching.</p>
                <p className="text-xs mt-1">Enjoy the calm.</p>
              </div>
            )}

            <div className="pt-4">
              <Link href="/transactions" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Log Transaction
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PositionSortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  sortKey: PositionSortKey;
  activeKey: PositionSortKey;
  dir: "asc" | "desc";
  onClick: (key: PositionSortKey) => void;
  align?: "left" | "right";
}) {
  const active = activeKey === sortKey;
  const arrow = <span className="text-[8px]">{dir === "asc" ? "▲" : "▼"}</span>;

  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={`flex w-full items-center gap-1 transition-colors hover:text-foreground ${
        align === "right" ? "justify-end" : "justify-start"
      } ${active ? "text-foreground" : ""}`}
    >
      {align === "right" && active && arrow}
      <span>{label}</span>
      {align === "left" && active && arrow}
    </button>
  );
}

function StackedPositionMetric({
  label,
  primary,
  secondary,
  secondaryTone,
}: {
  label: string;
  primary: string;
  secondary: string;
  secondaryTone: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    secondaryTone === "positive" ? "text-emerald-500" : secondaryTone === "negative" ? "text-destructive" : "text-foreground";

  return (
    <div className="text-right">
      <div className="mb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground xl:hidden">{label}</div>
      <div className="font-medium tabular-nums text-foreground">{primary}</div>
      <div className={`mt-1 text-xs font-medium tabular-nums ${toneClass}`}>{secondary}</div>
    </div>
  );
}

function EmptyState({ assetNounPlural, href }: { assetNounPlural: string; href: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center flex flex-col items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 mb-4 text-muted-foreground opacity-50"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
      <h3 className="text-lg font-medium text-foreground">No {assetNounPlural} yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Start tracking by adding {assetNounPlural === "bullion" ? "some bullion" : `your first ${assetNounPlural === "stocks" ? "stock" : "token"}`} and
        configuring its sell and rebuy ladders.
      </p>
      <Link
        href={href}
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        {assetNounPlural === "bullion" ? "Add bullion" : `Add your first ${assetNounPlural === "stocks" ? "stock" : "token"}`}
      </Link>
    </div>
  );
}
