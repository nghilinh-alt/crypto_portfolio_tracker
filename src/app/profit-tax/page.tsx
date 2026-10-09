import { getPortfolioOverview } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { buildCashLedger, toCashOverview } from "@/lib/portfolioCash";
import { getTotalTaxPaid, getTaxPayments } from "@/lib/tax";
import { getPortfolioSettings } from "@/lib/settings";
import ProfitTaxTabs from "@/components/ProfitTaxTabs";

export const dynamic = "force-dynamic";

export default async function ProfitTaxPage() {
  const [{ tokens, cash }, cashRows, totalTaxPaid, taxPayments, settings] = await Promise.all([
    getPortfolioOverview(),
    prisma.portfolioCashTransaction.findMany(),
    getTotalTaxPaid(),
    getTaxPayments(50),
    getPortfolioSettings(),
  ]);
  const overview = toCashOverview(cash, totalTaxPaid);

  const ledger = buildCashLedger(
    tokens.map((t) => ({ symbol: t.symbol, transactions: t.transactions })),
    cashRows
  );
  const cashRowById = new Map(cashRows.map((r) => [r.id, r]));

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-2 border-b border-border pb-6 thin-rule">
        <h1 className="text-4xl font-display font-semibold tracking-tight md:text-5xl text-foreground">
          Profit &amp; Tax
        </h1>
        <p className="text-sm text-muted-foreground">
          Your cash balance, what your sells have earned, the tax set aside on it, and every cash movement behind
          the numbers.
        </p>
      </header>

      <ProfitTaxTabs
        tokens={tokens.map((t) => ({
          id: t.id,
          symbol: t.symbol,
          iconUrl: t.iconUrl,
          assetType: t.assetType,
          realizedProfit: t.ladder.realizedProfit,
          taxReserved: t.ladder.taxReserved,
          rebuyCashShare: t.ladder.rebuyCashShare,
          rebuyWeightPct: t.ladder.rebuyWeightPct,
        }))}
        cash={overview.cash}
        taxOwing={overview.taxOwing}
        estAccountCash={overview.estAccountCash}
        totalTaxPaid={totalTaxPaid}
        taxPayments={taxPayments.map((p) => ({
          id: p.id,
          occurredAt: p.occurredAt.toISOString(),
          amount: p.amount,
          note: p.note,
        }))}
        ledger={ledger.map((r) => {
          const row = r.source === "CASH" ? cashRowById.get(r.sourceId) : undefined;
          return {
            key: r.key,
            kind: r.kind,
            occurredAt: r.occurredAt.toISOString(),
            delta: r.delta,
            balance: r.balance,
            tokenSymbol: r.tokenSymbol,
            note: r.note,
            quantity: r.quantity,
            grossUsd: r.grossUsd,
            taxUsd: r.taxUsd,
            movement: row
              ? {
                  id: row.id,
                  direction: row.direction,
                  amount: row.amount,
                  note: row.note,
                  occurredAt: row.occurredAt.toISOString(),
                  isAdjustment: row.isAdjustment,
                }
              : null,
          };
        })}
        lastReconciledAt={settings?.lastReconciledAt?.toISOString() ?? null}
        lastReconciledBalance={settings?.lastReconciledBalance ?? null}
      />
    </div>
  );
}
