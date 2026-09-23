"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteButton from "./DeleteButton";
import TokenAvatar from "./TokenAvatar";
import { formatPrice } from "@/lib/format";
import type { TokenStatus } from "@/lib/ladder";

export type TokenCard = {
  id: string;
  symbol: string;
  name: string;
  categoryName: string | null;
  iconUrl: string | null;
  currentPrice: number;
  recentHigh: number;
  coingeckoId: string | null;
  bybitSymbol: string | null;
  holdingsValueUsd: number;
  status: TokenStatus;
};

type SortKey = "status" | "value" | "az";

const STATUS_PRIORITY: Record<TokenStatus, number> = { SELL: 0, BUY: 1, WATCH: 2, HOLD: 3 };

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "status", label: "Status (default)" },
  { key: "value", label: "Holdings Value (high → low)" },
  { key: "az", label: "Name (A → Z)" },
];

function sortTokens(tokens: TokenCard[], sortKey: SortKey): TokenCard[] {
  const copy = [...tokens];
  if (sortKey === "az") return copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
  if (sortKey === "value") return copy.sort((a, b) => b.holdingsValueUsd - a.holdingsValueUsd);
  return copy.sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || a.symbol.localeCompare(b.symbol)
  );
}

export default function TokensList({ tokens }: { tokens: TokenCard[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const sorted = sortTokens(tokens, sortKey);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <label htmlFor="token-sort" className="text-xs text-muted-foreground">
          Sort by
        </label>
        <select
          id="token-sort"
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((token) => (
          <div
            key={token.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <TokenAvatar symbol={token.symbol} iconUrl={token.iconUrl} className="h-10 w-10 text-xs shadow-inner" />
                  <div>
                    <Link
                      href={`/tokens/${token.id}`}
                      className="text-lg font-display font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {token.symbol}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {token.name}
                      {token.categoryName && ` · ${token.categoryName}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <DeleteButton
                    url={`/api/tokens/${token.id}`}
                    confirmText={`Delete ${token.symbol} and all its transactions? This can't be undone.`}
                  />
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Current</div>
                  <div className="font-mono text-sm text-foreground">{formatPrice(token.currentPrice)}</div>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recent High</div>
                  <div className="font-mono text-sm text-foreground">{formatPrice(token.recentHigh)}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                <div className="font-mono text-xs text-muted-foreground">
                  <span className="opacity-50">CG:</span> {token.coingeckoId ?? "—"}{" "}
                  <span className="mx-1 opacity-20">|</span> <span className="opacity-50">BY:</span>{" "}
                  {token.bybitSymbol ?? "—"}
                </div>
                <Link
                  href={`/tokens/${token.id}`}
                  className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Manage →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
