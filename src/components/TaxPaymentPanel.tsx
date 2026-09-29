"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatUsd } from "@/lib/format";

export default function TaxPaymentPanel({
  totalReserved,
  totalPaid,
}: {
  totalReserved: number;
  totalPaid: number;
}) {
  const router = useRouter();
  const owing = Math.max(0, totalReserved - totalPaid);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(owing > 0 ? String(owing) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/tax-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, note: note || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to log payment");
        return;
      }
      setSuccess("Logged.");
      setNote("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-5">
      <span className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">Tax Owing</span>
      <div className="text-3xl font-display font-medium tracking-tight text-foreground">{formatUsd(owing)}</div>
      <span className="mt-1 text-xs text-muted-foreground">
        {formatUsd(totalReserved)} reserved − {formatUsd(totalPaid)} paid
      </span>

      <div className="mt-3">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2"
          >
            Log a tax payment
          </button>
        ) : (
          <div className="space-y-2 rounded-lg border border-border bg-background p-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Amount (USD)
              </span>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Note (optional)
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. EOFY 2026 payment"
                className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {success && <p className="text-xs text-emerald-500">{success}</p>}
            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={busy}
                className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "Logging…" : "Log Payment"}
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
    </div>
  );
}
