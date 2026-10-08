"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatUsd, formatDate } from "@/lib/format";

/**
 * Deposit / Withdraw shortcuts and "Reconcile cash": type what your real
 * account shows and Rekt records the difference from its own estimate as one
 * visible adjustment, then remembers when you last did it.
 */
export default function ReconcileCash({
  cash,
  taxOwing,
  estAccountCash,
  lastReconciledAt,
  lastReconciledBalance,
  sinceCount,
  sinceNet,
}: {
  cash: number;
  taxOwing: number;
  estAccountCash: number;
  lastReconciledAt: string | null;
  lastReconciledBalance: number | null;
  /** Cash-affecting entries logged since the last reconcile. */
  sinceCount: number;
  /** Net change in portfolio cash from those entries. */
  sinceNet: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [actual, setActual] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const actualNum = actual.trim() === "" ? null : Number(actual);
  const diff = actualNum === null || Number.isNaN(actualNum) ? null : actualNum - estAccountCash;

  async function submit() {
    if (actualNum === null || Number.isNaN(actualNum) || actualNum < 0) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/cash/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualBalance: actualNum }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to reconcile");
        return;
      }
      setSuccess(
        Math.abs(body.adjustment) < 0.005
          ? "Already matched — nothing to adjust."
          : `Recorded an adjustment of ${body.adjustment > 0 ? "+" : "−"}${formatUsd(Math.abs(body.adjustment))}.`
      );
      setActual("");
      router.refresh();
    } catch {
      setError("Failed to reconcile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-5">
      <span className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">Move or check cash</span>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/transactions?type=DEPOSIT"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Deposit
        </Link>
        <Link
          href="/transactions?type=WITHDRAW"
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          Withdraw
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          Reconcile cash
        </button>
      </div>
      <span className="mt-2 text-xs text-muted-foreground">
        {lastReconciledAt && lastReconciledBalance !== null ? (
          <>
            Last reconciled {formatDate(lastReconciledAt)} at {formatUsd(lastReconciledBalance)}.
            {sinceCount > 0
              ? ` Since then: ${sinceCount} cash ${sinceCount === 1 ? "entry" : "entries"}, net ${sinceNet >= 0 ? "+" : "−"}${formatUsd(Math.abs(sinceNet))}.`
              : " Nothing logged since."}
          </>
        ) : (
          "Never reconciled — compare Est. cash in account with your real balance."
        )}
      </span>

      {open && (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">
            Rekt estimates your account holds <strong className="text-foreground">{formatUsd(estAccountCash)}</strong>{" "}
            ({formatUsd(cash)} spendable + {formatUsd(taxOwing)} tax set aside).
          </p>
          <label className="block space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Your account shows (USD)
            </span>
            <input
              type="number"
              step="any"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm font-mono"
            />
          </label>
          {diff !== null && (
            <p className="text-xs text-muted-foreground">
              {Math.abs(diff) < 0.005
                ? "Matches Rekt's estimate — nothing to adjust."
                : `Rekt will record an adjustment of ${diff > 0 ? "+" : "−"}${formatUsd(Math.abs(diff))} so spendable cash becomes ${formatUsd(cash + diff)}.`}
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-emerald-500">{success}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy || diff === null}
              className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Reconciling…" : "Reconcile"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
