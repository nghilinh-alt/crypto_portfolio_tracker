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
    pendingSellRungs: t.ladder.sellRungs
      .filter((r) => r.status === "PENDING")
      .map((r) => ({
        id: r.id,
        pct: r.pct,
        portionPct: r.sellPortionPct,
        isEligible: r.isEligible,
        triggerPrice: r.triggerPrice,
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
    type === "BUY" || type === "SELL" || type === "DEPOSIT" ? type : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Transactions</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Every BUY, SELL, and DEPOSIT — the source of truth for the Cash Bucket and rung state.
        </p>
      </div>

      <LogTransactionForm tokens={tokenOptions} initialTokenId={tokenId} initialType={initialType} />

      <section>
        <h2 className="text-sm font-semibold text-neutral-900">Recent Transactions</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          {recentTransactions.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">Nothing logged yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Token</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Funded By</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Price/Unit</th>
                  <th className="px-4 py-2 text-right">USD</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-neutral-500">
                      {formatDate(tx.occurredAt)}
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/tokens/${tx.tokenId}`} className="font-medium hover:underline">
                        {tx.token.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-2 font-medium">{tx.type}</td>
                    <td className="px-4 py-2 text-neutral-500">{tx.fundedBy ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {tx.quantity !== null ? formatQty(tx.quantity) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {tx.pricePerUnit !== null ? formatPrice(tx.pricePerUnit) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatUsd(tx.usdAmount)}
                    </td>
                    <td className="px-4 py-2 text-right">
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
