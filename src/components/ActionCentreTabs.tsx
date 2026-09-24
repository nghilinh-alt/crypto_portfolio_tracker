"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import TokenAvatar from "./TokenAvatar";
import { formatUsd, formatPrice, formatPct, formatQty } from "@/lib/format";
import type { TokenStatus, NearestWatchTarget } from "@/lib/ladder";

export type ActionCentreToken = {
  id: string;
  symbol: string;
  name: string;
  iconUrl: string | null;
  assetType: "CRYPTO" | "STOCK";
  status: TokenStatus;
  currentPrice: number;
  gainFromBasePct: number;
  drawdownPct: number;
  suggestedRebuyDeployUsd: number;
  eligibleSellRungs: Array<{
    id: string;
    pct: number;
    sellPortionPct: number;
    triggerPrice: number;
    suggestedSellQty: number;
  }>;
  eligibleRebuyRungs: Array<{
    id: string;
    pct: number;
    deployPct: number;
    triggerPrice: number;
    rawDeployUsd: number;
  }>;
  nearestWatch: NearestWatchTarget | null;
};

type Tab = "ALL" | "CRYPTO" | "STOCK";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "CRYPTO", label: "Crypto" },
  { key: "STOCK", label: "Stocks" },
];

export default function ActionCentreTabs({
  tokens,
  taxReserveRatePct,
}: {
  tokens: ActionCentreToken[];
  taxReserveRatePct: number;
}) {
  const [tab, setTab] = useState<Tab>("ALL");

  const filtered = useMemo(
    () => (tab === "ALL" ? tokens : tokens.filter((t) => t.assetType === tab)),
    [tokens, tab]
  );
  const actionable = filtered.filter((t) => t.status === "SELL" || t.status === "BUY");
  const watching = filtered.filter((t) => t.status === "WATCH");

  return (
    <>
      <div className="flex justify-end">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 sm:flex">
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
      </div>

      <section className="bg-card border border-border overflow-hidden rounded-2xl">
        <div className="grid gap-6 p-6 md:grid-cols-3 md:items-end">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Review status
            </div>
            <div className="mt-2 text-3xl font-display text-foreground tracking-tight">
              {actionable.length
                ? `${actionable.length} ${actionable.length === 1 ? "token needs" : "tokens need"} attention`
                : "No targets crossed"}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Tokens watching
            </div>
            <div className="mt-1 text-2xl font-display text-foreground tracking-tight">{watching.length}</div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">01</span>
              <h2 className="text-2xl font-display font-medium text-foreground">Action required</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Targets crossed at current prices.</p>
          </div>
          <div className="flex items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-mono px-2 py-0.5">
            {actionable.length}
          </div>
        </div>

        {actionable.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Nothing needs action right now.
          </div>
        ) : (
          <div className="space-y-4">
            {actionable.map((token) => (
              <div key={token.id} className="overflow-hidden rounded-2xl border border-border bg-card transition-colors">
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <TokenAvatar symbol={token.symbol} iconUrl={token.iconUrl} className="h-11 w-11 text-xs" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/tokens/${token.id}`} className="text-xl font-display font-medium text-foreground hover:underline">
                          {token.symbol}
                        </Link>
                        <StatusBadge status={token.status} />
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {formatPrice(token.currentPrice)} ·
                        <span className={token.gainFromBasePct >= 0 ? "text-emerald-500" : "text-destructive"}> {token.gainFromBasePct >= 0 ? "+" : ""}{formatPct(token.gainFromBasePct)}</span> from base ·
                        <span className={token.drawdownPct > 0 ? "text-destructive" : "text-muted-foreground"}> {formatPct(-token.drawdownPct)}</span> off high
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60 bg-muted/15 px-4 py-3 md:px-5 space-y-4">
                  {token.eligibleSellRungs.length > 0 && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                      <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-destructive mb-3">
                        Sell rungs eligible
                      </div>
                      <ul className="space-y-2 text-sm text-foreground">
                        {token.eligibleSellRungs.map((r) => (
                          <li key={r.id} className="flex justify-between items-center bg-background/50 rounded-lg p-3 border border-border/50">
                            <span className="text-muted-foreground">
                              <strong className="text-foreground">+{r.pct}%</strong> ({formatPrice(r.triggerPrice)}) — sell {r.sellPortionPct}% of base
                            </span>
                            <span className="font-mono text-foreground font-medium">≈ {formatQty(r.suggestedSellQty)} {token.symbol}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex justify-end">
                        <Link
                          href={`/transactions?tokenId=${token.id}&type=SELL`}
                          className="inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:bg-destructive/90 transition-colors"
                        >
                          Log Sell
                        </Link>
                      </div>
                    </div>
                  )}

                  {token.eligibleRebuyRungs.length > 0 && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-500 mb-3">
                        Rebuy rungs eligible
                      </div>
                      <ul className="space-y-2 text-sm text-foreground">
                        {token.eligibleRebuyRungs.map((r) => (
                          <li key={r.id} className="flex justify-between items-center bg-background/50 rounded-lg p-3 border border-border/50">
                            <span className="text-muted-foreground">
                              <strong className="text-foreground">-{r.pct}%</strong> ({formatPrice(r.triggerPrice)}) — deploy {r.deployPct}% of contribs
                            </span>
                            <span className="font-mono text-foreground font-medium">{formatUsd(r.rawDeployUsd)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between border-t border-emerald-500/20 pt-3 text-sm font-medium text-foreground">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-mono">Suggested deploy (capped at Cash Bucket)</span>
                        <span className="text-emerald-400 text-lg font-mono">{formatUsd(token.suggestedRebuyDeployUsd)}</span>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Link
                          href={`/transactions?tokenId=${token.id}&type=BUY`}
                          className="inline-flex items-center justify-center rounded-md bg-emerald-600 text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          Log Buy
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">02</span>
              <h2 className="text-2xl font-display font-medium text-foreground">Watching</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Within 10% of the next untriggered rung — shown below with what it needs to trigger and what
              would happen. Forecasts use today&apos;s Cash Bucket and cost basis, so the real amount may
              shift a little by the time a rung actually fires.
            </p>
          </div>
          <div className="flex items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-mono px-2 py-0.5">
            {watching.length}
          </div>
        </div>

        {watching.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No tokens are within 10% of a target right now.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="divide-y divide-border/50">
              {watching.map((token) => {
                const w = token.nearestWatch;
                const isSell = w?.kind === "sell";
                return (
                  <div key={token.id} className="flex flex-col gap-3 p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <TokenAvatar
                          symbol={token.symbol}
                          iconUrl={token.iconUrl}
                          gradient="from-primary/80 to-indigo-600/80"
                          className="h-8 w-8 text-[10px]"
                        />
                        <div>
                          <Link href={`/tokens/${token.id}`} className="font-medium text-foreground hover:underline">
                            {token.symbol}
                          </Link>
                          <span className="ml-2 text-xs text-muted-foreground">{token.name}</span>
                          <div className="text-xs text-muted-foreground">{formatPrice(token.currentPrice)} now</div>
                        </div>
                      </div>
                      {w && (
                        <div
                          className={`flex items-center gap-3 rounded-lg border px-3 py-1.5 text-sm ${
                            isSell
                              ? "border-destructive/20 bg-destructive/5 text-destructive"
                              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
                          }`}
                        >
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
                            {isSell ? "Sell" : "Rebuy"} {isSell ? "+" : "-"}
                            {w.pct}%
                          </span>
                          <span className="w-px h-3 bg-current opacity-20" />
                          <span className="font-mono text-foreground">{formatPrice(w.triggerPrice)}</span>
                          <span className="w-px h-3 bg-current opacity-20" />
                          <span className="font-medium">{formatPct(w.distancePct)} to go</span>
                        </div>
                      )}
                    </div>
                    {w && (
                      <div className="pl-11 text-xs text-muted-foreground sm:text-right">
                        {w.kind === "sell"
                          ? `→ sell ~${formatQty(w.forecastQty)} ${token.symbol} (${formatUsd(w.forecastProceedsUsd)}) — net ${formatUsd(w.forecastNetToCashBucketUsd)} to Cash Bucket after ~${formatPct(taxReserveRatePct, 0)} tax`
                          : w.forecastDeployUsd > 0
                            ? `→ deploy ${formatUsd(w.forecastDeployUsd)} → +${formatQty(w.forecastQtyBought)} ${token.symbol}`
                            : `→ would deploy $0 — Cash Bucket is empty right now`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
