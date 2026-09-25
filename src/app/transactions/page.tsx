import Link from "next/link";
import { getAllTokensWithLadder } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import LogTransactionForm, { type TokenOption } from "@/components/LogTransactionForm";
import DeleteButton from "@/components/DeleteButton";
import { formatUsd, formatPrice, formatQty, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tokenId?: string; type?: string }>;
}) {
  const { tokenId, type } = await searchParams;
  const tokens = await getAllTokensWithLadder();

  const tokenOptions: TokenOption[] = tokens.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    name: t.name,
    currentPrice: t.currentPrice,
    cashBucket: t.ladder.cashBucket,
    taxReserved: t.ladder.taxReserved,
    pendingSellRungs: t.ladder.sellRungs
      .filter((r) => r.status === "PENDING")
      .map((r) => ({
        id: r.id,
        pct: r.pct,
        portionPct: r.sellPortionPct,
        isEligible: r.isEligible,
        triggerPrice: r.triggerPrice,
        suggestedQty: r.suggestedSellQty,
      })),
    pendingRebuyRungs: t.ladder.rebuyRungs
      .filter((r) => r.status === "PENDING")
      .map((r) => ({
        id: r.id,
        pct: r.pct,
        portionPct: r.deployPct,
        isEligible: r.isEligible,
        triggerPrice: r.triggerPrice,
      })),
  }));

  const recentTransactions = await prisma.transaction.findMany({
    include: { token: { select: { symbol: true } } },
    orderBy: { occurredAt: "desc" },
    take: 50,
  });

  const initialType =
    type === "BUY" || type === "SELL" || type === "DEPOSIT" || type === "WITHDRAW"
      ? type
      : undefined;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-5 border-b border-border pb-6 thin-rule md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-display font-semibold tracking-tight md:text-5xl text-foreground">Transactions</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every BUY, SELL, and DEPOSIT — the source of truth for the Cash Bucket and rung state.
          </p>
        </div>
      </header>

      <section>
        <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-4">
          <h2 className="text-2xl font-display font-medium flex items-center gap-3 text-foreground">
            <span className="text-sm font-mono text-muted-foreground">01</span>
            Log Transaction
          </h2>
        </div>
        <LogTransactionForm tokens={tokenOptions} initialTokenId={tokenId} initialType={initialType} />
      </section>

      <section>
        <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-4">
          <h2 className="text-2xl font-display font-medium flex items-center gap-3 text-foreground">
            <span className="text-sm font-mono text-muted-foreground">02</span>
            Recent Transactions
          </h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          {recentTransactions.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground bg-muted/10">Nothing logged yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-border/50 text-sm">
              <thead className="bg-muted/30 text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Token</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Funded By</th>
                  <th className="px-6 py-3 text-right">Qty</th>
                  <th className="px-6 py-3 text-right">Price/Unit</th>
                  <th className="px-6 py-3 text-right">USD</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground font-mono text-xs">
                      {formatDate(tx.occurredAt)}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/tokens/${tx.tokenId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {tx.token.symbol}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold ring-1 ring-inset ${tx.type === 'SELL' ? 'bg-destructive/20 text-destructive ring-destructive/30' : tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30' : 'bg-secondary text-secondary-foreground ring-border'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{tx.fundedBy ?? "—"}</td>
                    <td className="px-6 py-4 text-right font-mono text-foreground">
                      {tx.quantity !== null ? formatQty(tx.quantity) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-foreground">
                      {tx.pricePerUnit !== null ? formatPrice(tx.pricePerUnit) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-foreground">
                      {formatUsd(tx.usdAmount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DeleteButton
                        url={`/api/transactions/${tx.id}`}
                        confirmText="Delete this transaction? Any rung it triggered will stay triggered."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
