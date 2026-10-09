"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TokenAvatar from "./TokenAvatar";
import TaxPaymentPanel from "./TaxPaymentPanel";
import ReconcileCash from "./ReconcileCash";
import CashLedger, { type CashLedgerDto } from "./CashLedger";
import { formatUsd, formatDate, formatPct } from "@/lib/format";
import { assetDetailHref } from "@/lib/assetRoute";

export type ProfitTaxToken = {
  id: string;
  symbol: string;
  iconUrl: string | null;
  assetType: "CRYPTO" | "STOCK" | "BULLION";
  realizedProfit: number;
  taxReserved: number;
  /** This token's slice of portfolio cash for rebuying, and its weight as a % of all tokens'. */
  rebuyCashShare: number;
  rebuyWeightPct: number;
};

export type TaxPaymentRow = {
  id: string;
  occurredAt: string; // ISO
  amount: number;
  note: string | null;
};

type Tab = "ALL" | "CRYPTO" | "STOCK" | "BULLION";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "CRYPTO", label: "Crypto" },
  { key: "STOCK", label: "Stocks" },
  { key: "BULLION", label: "Bullion" },
];

export default function ProfitTaxTabs({
  tokens,
  cash,
  taxOwing,
  estAccountCash,
  totalTaxPaid,
  taxPayments,
  ledger,
  lastReconciledAt,
  lastReconciledBalance,
}: {
  tokens: ProfitTaxToken[];
  cash: number;
  taxOwing: number;
  estAccountCash: number;
  totalTaxPaid: number;
  taxPayments: TaxPaymentRow[];
  ledger: CashLedgerDto[];
  lastReconciledAt: string | null;
  lastReconciledBalance: number | null;
}) {
  const [tab, setTab] = useState<Tab>("CRYPTO");

  const filtered = useMemo(
    () => (tab === "ALL" ? tokens : tokens.filter((t) => t.assetType === tab)),
    [tokens, tab]
  );

  const sortedByProfit = useMemo(
    () => filtered.slice().sort((a, b) => b.realizedProfit - a.realizedProfit),
    [filtered]
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, t) => {
          acc.taxReserved += t.taxReserved;
          acc.realizedProfit += t.realizedProfit;
          return acc;
        },
        { taxReserved: 0, realizedProfit: 0 }
      ),
    [filtered]
  );

  // What's been logged since the last reconcile — a nudge to re-check, not a forecast.
  const since = useMemo(() => {
    if (!lastReconciledAt) return { count: 0, net: 0 };
    const cutoff = new Date(lastReconciledAt).getTime();
    const after = ledger.filter((r) => new Date(r.occurredAt).getTime() > cutoff && r.kind !== "ADJUSTMENT");
    return { count: after.length, net: after.reduce((sum, r) => sum + r.delta, 0) };
  }, [ledger, lastReconciledAt]);

  return (
    <div className="space-y-10">
      <div className="flex justify-end">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:flex">
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

      {/* Row 1: the cash. Row 2: what it earned and what's owed on it. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tab === "ALL" && (
          <>
            <SummaryTile
              label="Portfolio Cash"
              value={formatUsd(cash)}
              sub="Spendable — excludes the tax set aside"
            />
            <SummaryTile
              label="Est. Cash in Account"
              value={formatUsd(estAccountCash)}
              sub={`Cash + ${formatUsd(taxOwing)} tax owing — compare this to your real balance`}
            />
            <ReconcileCash
              cash={cash}
              taxOwing={taxOwing}
              estAccountCash={estAccountCash}
              lastReconciledAt={lastReconciledAt}
              lastReconciledBalance={lastReconciledBalance}
              sinceCount={since.count}
              sinceNet={since.net}
            />
          </>
        )}
        <SummaryTile
          label="Realised Profits"
          value={formatUsd(totals.realizedProfit)}
          sub="Pre-tax gain from sells"
        />
        <SummaryTile
          label={tab === "ALL" ? "Total Tax Reserved" : "Tax Reserved"}
          value={formatUsd(totals.taxReserved)}
          sub="Withheld from realized profit"
        />
        {tab === "ALL" && <TaxPaymentPanel totalReserved={totals.taxReserved} totalPaid={totalTaxPaid} />}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-display font-medium text-foreground">Profit by Token</h2>
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            {tab === "ALL"
              ? "No tokens tracked yet."
              : `No ${tab === "STOCK" ? "stocks" : tab === "BULLION" ? "bullion" : "tokens"} tracked yet.`}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="hidden md:grid grid-cols-[minmax(200px,2fr)_1fr_1fr_1fr] gap-4 border-b border-border/60 bg-muted/30 px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <span>Token</span>
              <span className="text-right">Realised Profit</span>
              <span className="text-right">Tax Reserved</span>
              <span
                className="text-right"
                title="This token's share of portfolio cash for rebuys, split by rebuy weight (net sell proceeds plus any top-up). Each rung's Deploy % applies to this."
              >
                Rebuy Share
              </span>
            </div>
            <div className="divide-y divide-border/50">
              {sortedByProfit.map((t) => (
                <Link
                  key={t.id}
                  href={assetDetailHref(t.assetType, t.id)}
                  className="grid grid-cols-2 items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(200px,2fr)_1fr_1fr_1fr]"
                >
                  <div className="flex items-center gap-3">
                    <TokenAvatar symbol={t.symbol} iconUrl={t.iconUrl} className="h-8 w-8 text-xs" />
                    <span className="font-medium text-foreground">{t.symbol}</span>
                  </div>
                  <div
                    className={`text-right font-mono text-sm ${
                      t.realizedProfit > 0 ? "text-emerald-500" : t.realizedProfit < 0 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {formatUsd(t.realizedProfit)}
                  </div>
                  <div className="text-right font-mono text-sm text-muted-foreground">{formatUsd(t.taxReserved)}</div>
                  <div className="text-right font-mono text-sm text-muted-foreground">
                    {formatUsd(t.rebuyCashShare)}
                    <div className="text-[10px] text-muted-foreground/70">{formatPct(t.rebuyWeightPct)} weight</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {tab === "ALL" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-display font-medium text-foreground">Cash Ledger</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every movement in Portfolio Cash with the running balance — deposits, withdrawals, sells (after tax set
              aside), buys paid from cash, and reconcile adjustments.
            </p>
          </div>
          <CashLedger rows={ledger} />
        </div>
      )}

      {tab === "ALL" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-medium text-foreground">Tax Payments</h2>
          {taxPayments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              No tax payments logged yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="hidden md:grid grid-cols-[1.4fr_1fr_2fr] gap-4 border-b border-border/60 bg-muted/30 px-6 py-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <span>Date</span>
                <span className="text-right">Amount</span>
                <span>Note</span>
              </div>
              <div className="divide-y divide-border/50">
                {taxPayments.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-2 items-center gap-4 px-6 py-3 text-sm md:grid-cols-[1.4fr_1fr_2fr]"
                  >
                    <span className="text-muted-foreground">{formatDate(p.occurredAt)}</span>
                    <span className="text-right font-mono text-foreground">{formatUsd(p.amount)}</span>
                    <span className="truncate text-muted-foreground">{p.note ?? "—"}</span>
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
