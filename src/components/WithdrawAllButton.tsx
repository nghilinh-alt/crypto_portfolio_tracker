"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatUsd } from "@/lib/format";

export default function WithdrawAllButton({
  totalCashBucket,
  poolBalance,
  tokenCount,
}: {
  totalCashBucket: number;
  poolBalance: number;
  tokenCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = totalCashBucket + poolBalance;
  const requested = amount.trim() ? Number(amount) : total;
  const isPartial = amount.trim() !== "" && requested < total;

  async function withdrawAll() {
    if (!requested || requested <= 0 || requested > total) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cash-pool/withdraw-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: requested }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to withdraw");
        return;
      }
      setOpen(false);
      setAmount("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-5">
      <span className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">Withdraw Everything</span>
      <div className="text-3xl font-display font-medium tracking-tight text-foreground">{formatUsd(total)}</div>
      <span className="mt-1 text-xs text-muted-foreground">
        {formatUsd(totalCashBucket)} across {tokenCount} token{tokenCount === 1 ? "" : "s"} + {formatUsd(poolBalance)} pool
      </span>

      <div className="mt-3">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            disabled={total <= 0}
            className="text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
          >
            {total > 0 ? "Withdraw all at once" : "Nothing to withdraw right now"}
          </button>
        ) : (
          <div className="space-y-2 rounded-lg border border-border bg-background p-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Amount (USD) — up to {formatUsd(total)}
              </span>
              <input
                type="number"
                step="any"
                placeholder={String(total)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {isPartial
                ? `Withdraws ${formatUsd(requested)} — ${((requested / total) * 100).toFixed(1)}% of every token's Cash Bucket and the pool, taken proportionally from each.`
                : `Logs a WITHDRAW for every token's full Cash Bucket and empties the pool — ${formatUsd(total)} total.`}{" "}
              Tax Reserved is untouched. This can&apos;t be undone.
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={withdrawAll}
                disabled={busy || !requested || requested <= 0 || requested > total}
                className="flex-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {busy ? "Withdrawing…" : `Confirm — withdraw ${formatUsd(requested)}`}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
