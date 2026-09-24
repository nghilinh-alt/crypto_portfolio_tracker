"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TokenAvatar from "./TokenAvatar";
import { formatPrice, formatPct } from "@/lib/format";

export type WatchlistItem = {
  id: string;
  symbol: string;
  name: string;
  assetType: "CRYPTO" | "STOCK";
  iconUrl: string | null;
  currentPrice: number;
  dayChangePct: number | null;
  dayHigh: number | null;
  dayLow: number | null;
};

type SortKey = "az" | "change" | "price";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "az", label: "Name (A → Z)" },
  { key: "change", label: "Day Change (high → low)" },
  { key: "price", label: "Price (high → low)" },
];

function sortItems(items: WatchlistItem[], sortKey: SortKey): WatchlistItem[] {
  const copy = [...items];
  if (sortKey === "az") return copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
  if (sortKey === "price") return copy.sort((a, b) => b.currentPrice - a.currentPrice);
  return copy.sort((a, b) => (b.dayChangePct ?? -Infinity) - (a.dayChangePct ?? -Infinity));
}

export default function WatchlistTable({ items }: { items: WatchlistItem[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("change");
  const sorted = useMemo(() => sortItems(items, sortKey), [items, sortKey]);

  return (
    <div className="space-y-4">
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

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden md:grid grid-cols-[minmax(220px,2fr)_.7fr_1fr_1fr_1fr_1fr] gap-4 border-b border-border/60 bg-muted/30 px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <span>Asset</span>
          <span>Type</span>
          <span className="text-right">Price</span>
          <span className="text-right">Day Change</span>
          <span className="text-right">Day High</span>
          <span className="text-right">Day Low</span>
        </div>
        <div className="divide-y divide-border/50">
          {sorted.map((item) => {
            const change = item.dayChangePct;
            const changeTone = change === null ? "text-muted-foreground" : change >= 0 ? "text-emerald-500" : "text-destructive";
            return (
              <Link
                key={item.id}
                href={`/tokens/${item.id}`}
                className="grid grid-cols-2 items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(220px,2fr)_.7fr_1fr_1fr_1fr_1fr]"
              >
                <div className="flex items-center gap-3">
                  <TokenAvatar symbol={item.symbol} iconUrl={item.iconUrl} className="h-9 w-9 text-xs" />
                  <div>
                    <div className="font-medium text-foreground">{item.symbol}</div>
                    <div className="text-xs text-muted-foreground">{item.name}</div>
                  </div>
                </div>
                <div>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {item.assetType === "STOCK" ? "Stock" : "Crypto"}
                  </span>
                </div>
                <div className="text-right font-mono text-sm text-foreground">{formatPrice(item.currentPrice)}</div>
                <div className={`text-right font-mono text-sm font-medium ${changeTone}`}>
                  {change === null ? "—" : `${change >= 0 ? "+" : ""}${formatPct(change)}`}
                </div>
                <div className="text-right font-mono text-sm text-muted-foreground">
                  {item.dayHigh === null ? "—" : formatPrice(item.dayHigh)}
                </div>
                <div className="text-right font-mono text-sm text-muted-foreground">
                  {item.dayLow === null ? "—" : formatPrice(item.dayLow)}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground/70">
        Day change/high/low come from each asset&apos;s price provider at its last refresh — CoinGecko-sourced
        crypto only reports change%, not high/low.
      </p>
    </div>
  );
}
