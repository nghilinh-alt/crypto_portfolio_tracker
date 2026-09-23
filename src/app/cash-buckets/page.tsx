import Link from "next/link";
import { getAllTokensWithLadder } from "@/lib/data";
import { getPortfolioCashPoolBalance, getPortfolioCashTransactions } from "@/lib/cashPool";
import TokenAvatar from "@/components/TokenAvatar";
import PortfolioCashPool from "@/components/PortfolioCashPool";
import { formatUsd, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CashBucketsPage() {
  const [tokens, poolBalance, poolTransactions] = await Promise.all([
    getAllTokensWithLadder(),
    getPortfolioCashPoolBalance(),
    getPortfolioCashTransactions(50),
  ]);

  const totals = tokens.reduce(
    (acc, t) => {
      acc.cashBucket += t.ladder.cashBucket;
      acc.contributions += t.ladder.cashBucketContributions;
      acc.taxReserved += t.ladder.taxReserved;
      return acc;
    },
    { cashBucket: 0, contributions: 0, taxReserved: 0 }
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-2 border-b border-border pb-6 thin-rule">
        <h1 className="text-4xl font-display font-semibold tracking-tight md:text-5xl text-foreground">
          Cash Buckets
        </h1>
        <p className="text-sm text-muted-foreground">
          Every token&apos;s spendable cash, the portfolio-wide pool, and where it&apos;s all moved.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile
          label="Total Cash Bucket"
          value={formatUsd(totals.cashBucket)}
          sub={`From ${formatUsd(totals.contributions)} contributions`}
        />
        <SummaryTile
          label="Total Tax Reserved"
          value={formatUsd(totals.taxReserved)}
          sub="Withheld from realized profit"
        />
        <PortfolioCashPool
          balance={poolBalance}
          tokens={tokens.map((t) => ({ id: t.id, symbol: t.symbol }))}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-display font-medium text-foreground">Per-Token Buckets</h2>
        {tokens.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No tokens tracked yet.
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
              {tokens.map((t) => (
                <Link
                  key={t.id}
                  href={`/tokens/${t.id}`}
                  className="grid grid-cols-2 items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(200px,2fr)_1fr_1fr_1fr]"
                >
                  <div className="flex items-center gap-3">
                    <TokenAvatar symbol={t.symbol} iconUrl={t.iconUrl} className="h-8 w-8 text-xs" />
                    <span className="font-medium text-foreground">{t.symbol}</span>
                  </div>
                  <div className="text-right font-mono text-sm text-foreground">
                    {formatUsd(t.ladder.cashBucket)}
                  </div>
                  <div className="text-right font-mono text-sm text-muted-foreground">
                    {formatUsd(t.ladder.cashBucketContributions)}
                  </div>
                  <div className="text-right font-mono text-sm text-muted-foreground">
                    {formatUsd(t.ladder.taxReserved)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

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
                  <span
                    className={
                      tx.direction === "IN"
                        ? "font-medium text-emerald-500"
                        : "font-medium text-destructive"
                    }
                  >
                    {tx.direction}
                  </span>
                  <span className="text-right font-mono text-foreground">{formatUsd(tx.amount)}</span>
                  <span className="text-muted-foreground">{tx.token?.symbol ?? "—"}</span>
                  <span className="truncate text-muted-foreground">{tx.note ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
