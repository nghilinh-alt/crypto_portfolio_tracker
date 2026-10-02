"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUsd } from "@/lib/format";

type Mode = "assign" | "withdraw";

export default function PortfolioCashPool({
  balance,
  tokens,
}: {
  balance: number;
  tokens: Array<{ id: string; symbol: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("assign");
  const sortedTokens = useMemo(
    () => tokens.slice().sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [tokens]
  );
  const [tokenId, setTokenId] = useState(sortedTokens[0]?.id ?? "");
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    if (mode === "assign" && !tokenId) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const url = mode === "assign" ? "/api/cash-pool/assign" : "/api/cash-pool/withdraw";
      const payload = mode === "assign" ? { tokenId, amount: amt } : { amount: amt };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed");
        return;
      }
      setSuccess(mode === "assign" ? "Assigned." : "Withdrawn.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-5 flex flex-col justify-center">
      <span className="text-muted-foreground font-mono text-xs uppercase tracking-wider mb-1">
        Portfolio Cash Pool
      </span>
      <div className="text-3xl font-display font-medium text-foreground tracking-tight">
        {formatUsd(balance)}
      </div>
      <span className="text-xs text-muted-foreground mt-1">Unassigned to any token</span>

      <div className="mt-3">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2"
          >
            Move this cash
          </button>
        ) : (
          <div className="space-y-2 rounded-lg border border-border bg-background p-3">
            <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
              <button
                type="button"
                onClick={() => setMode("assign")}
                className={`flex-1 rounded-md px-2 py-1.5 font-medium transition-colors ${mode === "assign" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Assign to a token
              </button>
              <button
                type="button"
                onClick={() => setMode("withdraw")}
                className={`flex-1 rounded-md px-2 py-1.5 font-medium transition-colors ${mode === "withdraw" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Withdraw
              </button>
            </div>

            {mode === "assign" && (
              <label className="block space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Token
                </span>
                <select
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                >
                  {sortedTokens.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.symbol}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Amount (USD) — up to {formatUsd(balance)}
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
                disabled={busy || (mode === "assign" && !tokenId)}
                className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "Working…" : mode === "assign" ? "Assign" : "Withdraw"}
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
