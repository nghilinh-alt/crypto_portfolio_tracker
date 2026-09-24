"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TokenAvatar from "./TokenAvatar";
import DeleteButton from "./DeleteButton";
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
type SortKey = "az" | "change" | "price" | "target";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "CRYPTO", label: "Crypto" },
  { key: "STOCK", label: "Stocks" },
  { key: "BULLION", label: "Bullion" },
];

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "az", label: "Name (A → Z)" },
  { key: "change", label: "Day Change (high → low)" },
  { key: "price", label: "Price (high → low)" },
  { key: "target", label: "Closest to Target" },
];

/** % the price still needs to drop to reach the target — negative once
 * current price is already at or below it (i.e. the target's been hit). */
function targetDistancePct(currentPrice: number, targetBuyPrice: number): number | null {
  if (currentPrice <= 0) return null;
  return ((currentPrice - targetBuyPrice) / currentPrice) * 100;
}

function sortItems(items: WatchlistItem[], sortKey: SortKey): WatchlistItem[] {
  const copy = [...items];
  if (sortKey === "az") return copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
  if (sortKey === "price") return copy.sort((a, b) => b.currentPrice - a.currentPrice);
  if (sortKey === "target") {
    const dist = (i: WatchlistItem) =>
      i.targetBuyPrice === null ? Infinity : (targetDistancePct(i.currentPrice, i.targetBuyPrice) ?? Infinity);
    return copy.sort((a, b) => dist(a) - dist(b));
  }
  return copy.sort((a, b) => (b.dayChangePct ?? -Infinity) - (a.dayChangePct ?? -Infinity));
}

export default function WatchlistTable({ items }: { items: WatchlistItem[] }) {
  const [tab, setTab] = useState<Tab>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("change");

  const filtered = useMemo(
    () => (tab === "ALL" ? items : items.filter((i) => i.assetType === tab)),
    [items, tab]
  );
  const sorted = useMemo(() => sortItems(filtered, sortKey), [filtered, sortKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex items-center justify-end gap-2">
          <label htmlFor="watchlist-sort" className="text-xs text-muted-foreground">
            Sort by
          </label>
          <select
            id="watchlist-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          Nothing in this filter.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden md:grid grid-cols-[minmax(200px,1.8fr)_.6fr_.8fr_.8fr_1fr_.8fr_1fr_auto] gap-4 border-b border-border/60 bg-muted/30 px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <span>Asset</span>
            <span>Type</span>
            <span className="text-right">Price</span>
            <span className="text-right">Day Change</span>
            <span className="text-right">Day Range</span>
            <span className="text-right">Target Buy</span>
            <span className="text-right">To Target</span>
            <span />
          </div>
          <div className="divide-y divide-border/50">
            {sorted.map((item) => {
              const change = item.dayChangePct;
              const changeTone = change === null ? "text-muted-foreground" : change >= 0 ? "text-emerald-500" : "text-destructive";
              const distance = item.targetBuyPrice !== null ? targetDistancePct(item.currentPrice, item.targetBuyPrice) : null;
              const targetHit = distance !== null && distance <= 0;

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
                  <div className={`text-right text-sm font-medium ${targetHit ? "text-emerald-500" : "text-muted-foreground"}`}>
                    {distance === null ? "—" : targetHit ? "Target reached" : `${formatPct(distance)} above`}
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
