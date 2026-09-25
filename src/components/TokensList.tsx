"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteButton from "./DeleteButton";
import TokenAvatar from "./TokenAvatar";
import SortableHeader from "./SortableHeader";
import { formatPrice } from "@/lib/format";
import type { TokenStatus } from "@/lib/ladder";
import { assetDetailHref } from "@/lib/assetRoute";

export type TokenCard = {
  id: string;
  symbol: string;
  name: string;
  assetType: "CRYPTO" | "STOCK" | "BULLION";
  categoryName: string | null;
  iconUrl: string | null;
  currentPrice: number;
  recentHigh: number;
  /** Pre-formatted per-asset-type footer text, e.g. "CG: bitcoin | BY: BTCUSDT" or "NASDAQ · AAPL". */
  meta: string;
  holdingsValueUsd: number;
  status: TokenStatus;
};

type SortKey = "status" | "value" | "az";

const STATUS_PRIORITY: Record<TokenStatus, number> = { SELL: 0, BUY: 1, WATCH: 2, HOLD: 3 };

function sortTokens(tokens: TokenCard[], sortKey: SortKey, sortDir: "asc" | "desc"): TokenCard[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const copy = [...tokens];
  switch (sortKey) {
    case "az":
      return copy.sort((a, b) => dir * a.symbol.localeCompare(b.symbol));
    case "value":
      return copy.sort((a, b) => dir * (a.holdingsValueUsd - b.holdingsValueUsd));
    case "status":
      return copy.sort(
        (a, b) => dir * (STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]) || a.symbol.localeCompare(b.symbol)
      );
  }
}

export default function TokensList({
  tokens,
  marketClosed = false,
}: {
  tokens: TokenCard[];
  /** Stocks only trade during market hours — show a hint next to their price when the market's shut. */
  marketClosed?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "value" ? "desc" : "asc");
    }
  }

  const sorted = sortTokens(tokens, sortKey, sortDir);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-4 text-xs font-medium text-muted-foreground">
        <SortableHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onClick={toggleSort} fullWidth={false} />
        <SortableHeader label="Value" sortKey="value" activeKey={sortKey} dir={sortDir} onClick={toggleSort} fullWidth={false} />
        <SortableHeader label="Name" sortKey="az" activeKey={sortKey} dir={sortDir} onClick={toggleSort} fullWidth={false} />
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
                      href={assetDetailHref(token.assetType, token.id)}
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
                  {token.assetType === "STOCK" && marketClosed && (
                    <div className="mt-1 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                      Market closed
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-border/50 bg-background/50 p-3">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Recent High</div>
                  <div className="font-mono text-sm text-foreground">{formatPrice(token.recentHigh)}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
                <div className="font-mono text-xs text-muted-foreground">{token.meta}</div>
                <Link
                  href={assetDetailHref(token.assetType, token.id)}
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
