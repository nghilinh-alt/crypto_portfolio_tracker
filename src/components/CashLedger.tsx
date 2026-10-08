"use client";

import { useState } from "react";
import Link from "next/link";
import CashMovementActions, { type EditableCashMovement } from "./CashMovementActions";
import { formatUsd, formatDate, formatQty } from "@/lib/format";

export type CashLedgerDto = {
  key: string;
  kind: "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT" | "SELL" | "BUY";
  occurredAt: string; // ISO
  delta: number;
  balance: number;
  tokenSymbol: string | null;
  note: string | null;
  quantity: number | null;
  grossUsd: number | null;
  taxUsd: number | null;
  /** Set for ledger entries (deposit/withdrawal/adjustment), which can be edited here. */
  movement: EditableCashMovement | null;
};

const INITIAL_ROWS = 25;

const KIND_LABEL: Record<CashLedgerDto["kind"], string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  ADJUSTMENT: "Adjustment",
  SELL: "Sell",
  BUY: "Buy",
};

const KIND_STYLE: Record<CashLedgerDto["kind"], string> = {
  DEPOSIT: "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30",
  WITHDRAWAL: "bg-destructive/20 text-destructive ring-destructive/30",
  ADJUSTMENT: "bg-amber-500/20 text-amber-400 ring-amber-500/30",
  SELL: "bg-secondary text-secondary-foreground ring-border",
  BUY: "bg-secondary text-secondary-foreground ring-border",
};

function detail(r: CashLedgerDto): string {
  switch (r.kind) {
    case "SELL":
      return `Sold ${formatQty(r.quantity ?? 0)} ${r.tokenSymbol} for ${formatUsd(r.grossUsd ?? 0)} · ${formatUsd(r.taxUsd ?? 0)} set aside for tax`;
    case "BUY":
      return `Bought ${formatQty(r.quantity ?? 0)} ${r.tokenSymbol} with portfolio cash`;
    default:
      return r.note ?? "—";
  }
}

export default function CashLedger({ rows }: { rows: CashLedgerDto[] }) {
  const [showAll, setShowAll] = useState(false);
  // Newest first for reading; the running balance was computed oldest-first.
  const newestFirst = rows.slice().reverse();
  const visible = showAll ? newestFirst : newestFirst.slice(0, INITIAL_ROWS);

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        No cash movements yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="min-w-full divide-y divide-border/50 text-sm">
          <thead className="bg-muted/30 text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Detail</th>
              <th className="px-6 py-3 text-right">Change</th>
              <th className="px-6 py-3 text-right">Balance</th>
              <th className="sticky right-0 z-10 bg-card p-0">
                <div className="bg-muted/30 px-6 py-3 text-right">Actions</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {visible.map((r) => (
              <tr key={r.key} className="group transition-colors hover:bg-muted/40">
                <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-muted-foreground">
                  {formatDate(r.occurredAt)}
                </td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider ring-1 ring-inset ${KIND_STYLE[r.kind]}`}
                  >
                    {KIND_LABEL[r.kind]}
                  </span>
                </td>
                <td className="max-w-[360px] truncate px-6 py-3 text-muted-foreground" title={detail(r)}>
                  {detail(r)}
                </td>
                <td
                  className={`whitespace-nowrap px-6 py-3 text-right font-mono ${
                    r.delta >= 0 ? "text-emerald-500" : "text-destructive"
                  }`}
                >
                  {r.delta >= 0 ? "+" : "−"}
                  {formatUsd(Math.abs(r.delta))}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-right font-mono text-foreground">
                  {formatUsd(r.balance)}
                </td>
                <td className="sticky right-0 z-10 bg-card p-0 shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.35)]">
                  <div className="px-6 py-3 text-right transition-colors group-hover:bg-muted/40">
                    {r.movement ? (
                      <CashMovementActions movement={r.movement} />
                    ) : (
                      <Link
                        href="/transactions"
                        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Transactions
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {newestFirst.length > INITIAL_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {showAll ? "Show fewer" : `Show all ${newestFirst.length} entries`}
        </button>
      )}
    </div>
  );
}
