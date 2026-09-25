"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TokenAvatar from "./TokenAvatar";
import DeleteButton from "./DeleteButton";
import SortableHeader from "./SortableHeader";
import { formatPrice, formatPct } from "@/lib/format";
import { assetDetailHref } from "@/lib/assetRoute";

export type WatchlistItem = {
  id: string;
  symbol: string;
  name: string;
  assetType: "CRYPTO" | "STOCK" | "BULLION";
  iconUrl: string | null;
  currentPrice: number;
  dayChangePct: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  targetBuyPrice: number | null;
};

type Tab = "ALL" | "CRYPTO" | "STOCK" | "BULLION";
type SortKey = "symbol" | "price" | "change" | "targetBuy" | "toTarget";

/** How close (in %) the price needs to be to the target before it's flagged as a near-term buy opportunity. */
const NEAR_TARGET_THRESHOLD_PCT = 10;

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "CRYPTO", label: "Crypto" },
  { key: "STOCK", label: "Stocks" },
  { key: "BULLION", label: "Bullion" },
];

/** % the price still needs to drop to reach the target — negative once
 * current price is already at or below it (i.e. the target's been hit). */
function targetDistancePct(currentPrice: number, targetBuyPrice: number): number | null {
  if (currentPrice <= 0) return null;
  return ((currentPrice - targetBuyPrice) / currentPrice) * 100;
}

function toTargetDistance(item: WatchlistItem): number {
  return item.targetBuyPrice === null ? Infinity : (targetDistancePct(item.currentPrice, item.targetBuyPrice) ?? Infinity);
}

function sortItems(items: WatchlistItem[], sortKey: SortKey, sortDir: "asc" | "desc"): WatchlistItem[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const copy = [...items];
  switch (sortKey) {
    case "symbol":
      return copy.sort((a, b) => dir * a.symbol.localeCompare(b.symbol));
    case "price":
      return copy.sort((a, b) => dir * (a.currentPrice - b.currentPrice));
    case "targetBuy":
      return copy.sort((a, b) => dir * ((a.targetBuyPrice ?? -Infinity) - (b.targetBuyPrice ?? -Infinity)));
    case "toTarget":
      return copy.sort((a, b) => dir * (toTargetDistance(a) - toTargetDistance(b)));
    case "change":
      return copy.sort((a, b) => dir * ((a.dayChangePct ?? -Infinity) - (b.dayChangePct ?? -Infinity)));
  }
}

export default function WatchlistTable({ items }: { items: WatchlistItem[] }) {
  const [tab, setTab] = useState<Tab>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("change");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" || key === "toTarget" ? "asc" : "desc");
    }
  }

  const filtered = useMemo(
    () => (tab === "ALL" ? items : items.filter((i) => i.assetType === tab)),
    [items, tab]
  );
  const sorted = useMemo(() => sortItems(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:flex sm:w-fit">
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

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Nothing in this filter.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden md:grid grid-cols-[minmax(200px,1.8fr)_.6fr_.8fr_.8fr_1fr_.8fr_1fr_auto] gap-4 border-b border-border/60 bg-muted/30 px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <SortableHeader label="Asset" sortKey="symbol" activeKey={sortKey} dir={sortDir} onClick={toggleSort} />
            <span>Type</span>
            <SortableHeader label="Price" sortKey="price" activeKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
            <SortableHeader label="Day Change" sortKey="change" activeKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
            <span className="text-right">Day Range</span>
            <SortableHeader label="Target Buy" sortKey="targetBuy" activeKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
            <SortableHeader label="To Target" sortKey="toTarget" activeKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
            <span />
          </div>
          <div className="divide-y divide-border/50">
            {sorted.map((item) => {
              const change = item.dayChangePct;
              const changeTone = change === null ? "text-muted-foreground" : change >= 0 ? "text-emerald-500" : "text-destructive";
              const distance = item.targetBuyPrice !== null ? targetDistancePct(item.currentPrice, item.targetBuyPrice) : null;
              const targetHit = distance !== null && distance <= 0;
              const isNearTarget = distance !== null && distance > 0 && distance <= NEAR_TARGET_THRESHOLD_PCT;

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-2 items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(200px,1.8fr)_.6fr_.8fr_.8fr_1fr_.8fr_1fr_auto]"
                >
                  <Link href={assetDetailHref(item.assetType, item.id)} className="flex items-center gap-3">
                    <TokenAvatar symbol={item.symbol} iconUrl={item.iconUrl} className="h-9 w-9 text-xs" />
                    <div>
                      <div className="font-medium text-foreground">{item.symbol}</div>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                    </div>
                  </Link>
                  <div>
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {item.assetType === "STOCK" ? "Stock" : item.assetType === "BULLION" ? "Bullion" : "Crypto"}
                    </span>
                  </div>
                  <div className="text-right font-mono text-sm text-foreground">{formatPrice(item.currentPrice)}</div>
                  <div className={`text-right font-mono text-sm font-medium ${changeTone}`}>
                    {change === null ? "—" : `${change >= 0 ? "+" : ""}${formatPct(change)}`}
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    {item.dayHigh === null || item.dayLow === null
                      ? "—"
                      : `${formatPrice(item.dayLow)} – ${formatPrice(item.dayHigh)}`}
                  </div>
                  <div className="text-right font-mono text-sm text-muted-foreground">
                    {item.targetBuyPrice === null ? "—" : formatPrice(item.targetBuyPrice)}
                  </div>
                  <div className="text-right">
                    {distance === null ? (
                      <span className="text-sm font-medium text-muted-foreground">—</span>
                    ) : targetHit ? (
                      <span className="text-sm font-medium text-emerald-500">Target reached</span>
                    ) : isNearTarget ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-500"
                        title={`Within ${formatPct(NEAR_TARGET_THRESHOLD_PCT)} of your Target Buy Price`}
                      >
                        🛒 {formatPct(distance)} above
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{formatPct(distance)} above</span>
                    )}
                  </div>
                  <div className="flex items-center justify-end">
                    <DeleteButton
                      url={`/api/tokens/${item.id}`}
                      confirmText={`Remove ${item.symbol} from the watchlist? This deletes it and its transaction history — this can't be undone.`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground/70">
        Day change/range come from each asset&apos;s price provider at its last refresh — CoinGecko-sourced
        crypto only reports change%, not high/low. &quot;To Target&quot; is how far the current price still
        needs to drop to reach your Target Buy Price.
      </p>
    </div>
  );
}
