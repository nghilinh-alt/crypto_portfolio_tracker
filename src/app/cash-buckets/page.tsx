import { getAllTokensWithLadder } from "@/lib/data";
import { getPortfolioCashPoolBalance, getPortfolioCashTransactions } from "@/lib/cashPool";
import CashBucketsTabs from "@/components/CashBucketsTabs";

export const dynamic = "force-dynamic";

export default async function CashBucketsPage() {
  const [tokens, poolBalance, poolTransactions] = await Promise.all([
    getAllTokensWithLadder(),
    getPortfolioCashPoolBalance(),
    getPortfolioCashTransactions(50),
  ]);

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

      <CashBucketsTabs
        tokens={tokens.map((t) => ({
          id: t.id,
          symbol: t.symbol,
          iconUrl: t.iconUrl,
          assetType: t.assetType,
          cashBucket: t.ladder.cashBucket,
          cashBucketContributions: t.ladder.cashBucketContributions,
          taxReserved: t.ladder.taxReserved,
        }))}
        poolBalance={poolBalance}
        poolTransactions={poolTransactions.map((tx) => ({
          id: tx.id,
          occurredAt: tx.occurredAt.toISOString(),
          direction: tx.direction,
          amount: tx.amount,
          tokenSymbol: tx.token?.symbol ?? null,
          note: tx.note,
        }))}
      />
    </div>
  );
}
