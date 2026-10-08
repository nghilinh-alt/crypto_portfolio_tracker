import Link from "next/link";
import { getPortfolioOverview } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import LogTransactionForm, { type TokenOption } from "@/components/LogTransactionForm";
import TransactionActions from "@/components/TransactionActions";
import CashMovementActions from "@/components/CashMovementActions";
import { formatUsd, formatPrice, formatQty, formatDate } from "@/lib/format";
import { fundedByLabel, cashMovementLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

const RECENT_LIMIT = 50;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tokenId?: string; type?: string }>;
}) {
  const { tokenId, type } = await searchParams;
  const { tokens, cash } = await getPortfolioOverview();

  const tokenOptions: TokenOption[] = tokens.map((t) => ({
    id: t.id,
    symbol: t.symbol,
    name: t.name,
    currentPrice: t.currentPrice,
    holdingsValueUsd: t.ladder.holdingsValueUsd,
    suggestedRebuyDeployUsd: t.ladder.suggestedRebuyDeployUsd,
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

  // Trades and portfolio cash movements live in different tables; take the
  // newest of each, merge, and show the newest overall.
  const [trades, cashMovements] = await Promise.all([
    prisma.transaction.findMany({
      include: { token: { select: { symbol: true } } },
      orderBy: { occurredAt: "desc" },
      take: RECENT_LIMIT,
    }),
    prisma.portfolioCashTransaction.findMany({ orderBy: { occurredAt: "desc" }, take: RECENT_LIMIT }),
  ]);

  type Row =
    | { kind: "trade"; at: Date; tx: (typeof trades)[number] }
    | { kind: "cash"; at: Date; m: (typeof cashMovements)[number] };
  const rows: Row[] = [
    ...trades.map((tx): Row => ({ kind: "trade", at: tx.occurredAt, tx })),
    ...cashMovements.map((m): Row => ({ kind: "cash", at: m.occurredAt, m })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, RECENT_LIMIT);

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
            Every BUY and SELL, plus cash deposits and withdrawals — the source of truth for portfolio cash and rung
            state.
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
        <LogTransactionForm
          tokens={tokenOptions}
          portfolioCash={cash.cash}
          initialTokenId={tokenId}
          initialType={initialType}
        />
      </section>

      <section>
        <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-4">
          <h2 className="text-2xl font-display font-medium flex items-center gap-3 text-foreground">
            <span className="text-sm font-mono text-muted-foreground">02</span>
            Recent Transactions
          </h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground bg-muted/10">Nothing logged yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-border/50 text-sm">
              <thead className="bg-muted/30 text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Token</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Paid From</th>
                  <th className="px-6 py-3 text-right">Qty</th>
                  <th className="px-6 py-3 text-right">Price/Unit</th>
                  <th className="px-6 py-3 text-right">USD</th>
                  <th className="px-6 py-3">Note</th>
                  <th className="sticky right-0 z-10 bg-card p-0">
                    <div className="bg-muted/30 px-6 py-3 text-right">Actions</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((row) =>
                  row.kind === "trade" ? (
                    <tr key={`tx:${row.tx.id}`} className="group hover:bg-muted/40 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-muted-foreground font-mono text-xs">
                        {formatDate(row.tx.occurredAt)}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/tokens/${row.tx.tokenId}`} className="font-medium text-foreground hover:text-primary transition-colors">
                          {row.tx.token.symbol}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold ring-1 ring-inset ${row.tx.type === 'SELL' ? 'bg-destructive/20 text-destructive ring-destructive/30' : row.tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30' : 'bg-secondary text-secondary-foreground ring-border'}`}>
                          {row.tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{fundedByLabel(row.tx.fundedBy)}</td>
                      <td className="px-6 py-4 text-right font-mono text-foreground">
                        {row.tx.quantity !== null ? formatQty(row.tx.quantity) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-foreground">
                        {row.tx.pricePerUnit !== null ? formatPrice(row.tx.pricePerUnit) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-foreground">
                        {formatUsd(row.tx.usdAmount)}
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-4 text-muted-foreground">{row.tx.note ?? "—"}</td>
                      <td className="sticky right-0 z-10 bg-card p-0 shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.35)]">
                        <div className="px-6 py-4 transition-colors group-hover:bg-muted/40">
                          <TransactionActions
                            tx={{
                              id: row.tx.id,
                              symbol: row.tx.token.symbol,
                              type: row.tx.type,
                              fundedBy: row.tx.fundedBy,
                              quantity: row.tx.quantity,
                              pricePerUnit: row.tx.pricePerUnit,
                              usdAmount: row.tx.usdAmount,
                              note: row.tx.note,
                              occurredAt: row.tx.occurredAt.toISOString(),
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={`cash:${row.m.id}`} className="group hover:bg-muted/40 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-muted-foreground font-mono text-xs">
                        {formatDate(row.m.occurredAt)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">Portfolio</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold ring-1 ring-inset ${
                            row.m.isAdjustment
                              ? "bg-amber-500/20 text-amber-400 ring-amber-500/30"
                              : row.m.direction === "IN"
                                ? "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30"
                                : "bg-destructive/20 text-destructive ring-destructive/30"
                          }`}
                        >
                          {cashMovementLabel(row.m)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">—</td>
                      <td className="px-6 py-4 text-right font-mono text-foreground">—</td>
                      <td className="px-6 py-4 text-right font-mono text-foreground">—</td>
                      <td
                        className={`px-6 py-4 text-right font-mono ${
                          row.m.direction === "IN" ? "text-emerald-500" : "text-destructive"
                        }`}
                      >
                        {row.m.direction === "IN" ? "+" : "−"}
                        {formatUsd(row.m.amount)}
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-4 text-muted-foreground">{row.m.note ?? "—"}</td>
                      <td className="sticky right-0 z-10 bg-card p-0 shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.35)]">
                        <div className="px-6 py-4 transition-colors group-hover:bg-muted/40">
                          <CashMovementActions
                            movement={{
                              id: row.m.id,
                              direction: row.m.direction,
                              amount: row.m.amount,
                              note: row.m.note,
                              occurredAt: row.m.occurredAt.toISOString(),
                              isAdjustment: row.m.isAdjustment,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
