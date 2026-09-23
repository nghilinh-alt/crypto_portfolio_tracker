"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatUsd } from "@/lib/format";

type Mode = "transfer" | "pool";

export default function CashBucketActions({
  tokenId,
  cashBucket,
  otherTokens,
}: {
  tokenId: string;
  cashBucket: number;
  otherTokens: Array<{ id: string; symbol: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("transfer");
  const [toTokenId, setToTokenId] = useState(otherTokens[0]?.id ?? "");
  const [amount, setAmount] = useState(cashBucket > 0 ? String(cashBucket) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (cashBucket <= 0) return null;

  async function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const url = mode === "transfer" ? `/api/tokens/${tokenId}/transfer-cash` : `/api/tokens/${tokenId}/move-to-pool`;
      const payload = mode === "transfer" ? { toTokenId, amount: amt } : { amount: amt };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Transfer failed");
        return;
      }
      setSuccess(mode === "transfer" ? "Transferred." : "Moved to portfolio pool.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        Move this cash elsewhere
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-border bg-background p-3 text-sm">
      <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("transfer")}
          className={`flex-1 rounded-md px-2 py-1.5 font-medium transition-colors ${mode === "transfer" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          To another token
        </button>
        <button
          type="button"
          onClick={() => setMode("pool")}
          className={`flex-1 rounded-md px-2 py-1.5 font-medium transition-colors ${mode === "pool" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          To portfolio pool
        </button>
      </div>

      {mode === "transfer" && (
        <label className="block space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Destination token</span>
          <select
            value={toTokenId}
            onChange={(e) => setToTokenId(e.target.value)}
            className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          >
            {otherTokens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Amount (USD) — up to {formatUsd(cashBucket)}
        </span>
        <input
          type="number"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        />
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-emerald-500">{success}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={busy || (mode === "transfer" && !toTokenId)}
          className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Moving…" : "Move"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
        >
          Close
        </button>
      </div>
    </div>
  );
}
