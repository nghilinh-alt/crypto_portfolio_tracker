"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TokenAvatar from "./TokenAvatar";
import PortfolioCashPool from "./PortfolioCashPool";
import { formatUsd, formatDate } from "@/lib/format";

export type CashBucketToken = {
  id: string;
  symbol: string;
  iconUrl: string | null;
  assetType: "CRYPTO" | "STOCK";
  cashBucket: number;
  cashBucketContributions: number;
  taxReserved: number;
};

export type PoolTransaction = {
  id: string;
  occurredAt: string; // ISO
  direction: "IN" | "OUT";
  amount: number;
  tokenSymbol: string | null;
  note: string | null;
};

type Tab = "ALL" | "CRYPTO" | "STOCK";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "CRYPTO", label: "Crypto" },
  { key: "STOCK", label: "Stocks" },
];

export default function CashBucketsTabs({
  tokens,
  poolBalance,
  poolTransactions,
}: {
  tokens: CashBucketToken[];
  poolBalance: number;
  poolTransactions: PoolTransaction[];
}) {
  const [tab, setTab] = useState<Tab>("ALL");

  const filtered = useMemo(
    () => (tab === "ALL" ? tokens : tokens.filter((t) => t.assetType === tab)),
    [tokens, tab]
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, t) => {
          acc.cashBucket += t.cashBucket;
          acc.contributions += t.cashBucketContributions;
          acc.taxReserved += t.taxReserved;
          return acc;
        },
        { cashBucket: 0, contributions: 0, taxReserved: 0 }
      ),
    [filtered]
  );

  return (
    <div className="space-y-10">
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

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile
          label={tab === "ALL" ? "Total Cash Bucket" : "Cash Bucket"}
          value={formatUsd(totals.cashBucket)}
          sub={`From ${formatUsd(totals.contributions)} contributions`}
        />
        <SummaryTile
          label={tab === "ALL" ? "Total Tax Reserved" : "Tax Reserved"}
          value={formatUsd(totals.taxReserved)}
          sub="Withheld from realized profit"
        />
        {tab === "ALL" && (
          <PortfolioCashPool
            balance={poolBalance}
            tokens={tokens.map((t) => ({ id: t.id, symbol: t.symbol }))}
          />
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-display font-medium text-foreground">Per-Token Buckets</h2>
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            {tab === "ALL" ? "No tokens tracked yet." : `No ${tab === "STOCK" ? "stocks" : "tokens"} tracked yet.`}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="hidden md:grid grid-cols-[minmax(200px,2fr)_1fr_1fr_1fr] gap-4 border-b border-border/60 bg-muted/30 px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <span>Token</span>
              <span className="text-right">Cash Bucket</span>
              <span className="text-right">Contributions</span>
              <span className="text-right">Tax Reserved</span>
            </div>
            <div className="divide-y divide-border/50">
              {filtered.map((t) => (
                <Link
                  key={t.id}
                  href={`/tokens/${t.id}`}
                  className="grid grid-cols-2 items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(200px,2fr)_1fr_1fr_1fr]"
                >
                  <div className="flex items-center gap-3">
                    <TokenAvatar symbol={t.symbol} iconUrl={t.iconUrl} className="h-8 w-8 text-xs" />
                    <span className="font-medium text-foreground">{t.symbol}</span>
                  </div>
                  <div className="text-right font-mono text-sm text-foreground">{formatUsd(t.cashBucket)}</div>
                  <div className="text-right font-mono text-sm text-muted-foreground">
                    {formatUsd(t.cashBucketContributions)}
                  </div>
                  <div className="text-right font-mono text-sm text-muted-foreground">{formatUsd(t.taxReserved)}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {tab === "ALL" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-medium text-foreground">Portfolio Pool Activity</h2>
          {poolTransactions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              No pool movements yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="hidden md:grid grid-cols-[1.4fr_.6fr_1fr_.8fr_1.6fr] gap-4 border-b border-border/60 bg-muted/30 px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <span>Date</span>
                <span>Direction</span>
                <span className="text-right">Amount</span>
                <span>Token</span>
                <span>Note</span>
              </div>
              <div className="divide-y divide-border/50">
                {poolTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-2 items-center gap-4 px-6 py-3 text-sm md:grid-cols-[1.4fr_.6fr_1fr_.8fr_1.6fr]"
                  >
                    <span className="text-muted-foreground">{formatDate(tx.occurredAt)}</span>
                    <span className={tx.direction === "IN" ? "font-medium text-emerald-500" : "font-medium text-destructive"}>
                      {tx.direction}
                    </span>
                    <span className="text-right font-mono text-foreground">{formatUsd(tx.amount)}</span>
                    <span className="text-muted-foreground">{tx.tokenSymbol ?? "—"}</span>
                    <span className="truncate text-muted-foreground">{tx.note ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-5">
      <span className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="text-3xl font-display font-medium tracking-tight text-foreground">{value}</div>
      <span className="mt-1 text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}
