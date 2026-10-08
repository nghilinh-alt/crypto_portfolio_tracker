"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DeleteButton from "./DeleteButton";
import { formatUsd } from "@/lib/format";

export type EditableTransaction = {
  id: string;
  symbol: string;
  type: "BUY" | "SELL" | "DEPOSIT" | "WITHDRAW";
  fundedBy: "CASH_BUCKET" | "EXTERNAL" | null;
  quantity: number | null;
  pricePerUnit: number | null;
  usdAmount: number;
  note: string | null;
  occurredAt: string;
};

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const inputClass =
  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-10";
const labelClass = "text-[10px] font-mono uppercase tracking-wider text-muted-foreground";

export default function TransactionActions({ tx }: { tx: EditableTransaction }) {
  // Only trades are editable here; cash movements are edited from the cash ledger.
  const isTrade = tx.type === "BUY" || tx.type === "SELL";
  return (
    <div className="flex items-center justify-end gap-3">
      {isTrade && <EditTransactionDialog tx={tx} />}
      <DeleteButton
        url={`/api/transactions/${tx.id}`}
        confirmText={`Delete this ${tx.type} for ${tx.symbol}? Any rung it triggered will stay triggered.`}
      />
    </div>
  );
}

function EditTransactionDialog({ tx }: { tx: EditableTransaction }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fundedBy, setFundedBy] = useState<"CASH_BUCKET" | "EXTERNAL">(tx.fundedBy ?? "EXTERNAL");
  const [quantity, setQuantity] = useState(tx.quantity !== null ? String(tx.quantity) : "");
  const [pricePerUnit, setPricePerUnit] = useState(tx.pricePerUnit !== null ? String(tx.pricePerUnit) : "");
  const [note, setNote] = useState(tx.note ?? "");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocal(new Date(tx.occurredAt)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openDialog() {
    // Start from the latest saved values each time, not stale edits.
    setFundedBy(tx.fundedBy ?? "EXTERNAL");
    setQuantity(tx.quantity !== null ? String(tx.quantity) : "");
    setPricePerUnit(tx.pricePerUnit !== null ? String(tx.pricePerUnit) : "");
    setNote(tx.note ?? "");
    setOccurredAt(toDatetimeLocal(new Date(tx.occurredAt)));
    setError(null);
    setOpen(true);
  }

  const total = Number(quantity) * Number(pricePerUnit);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      note: note.trim() === "" ? null : note,
      occurredAt: new Date(occurredAt).toISOString(),
      quantity: Number(quantity),
      pricePerUnit: Number(pricePerUnit),
    };
    if (tx.type === "BUY") payload.fundedBy = fundedBy;
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to save changes");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to save changes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        title="Edit transaction"
        aria-label={`Edit ${tx.type} for ${tx.symbol}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        Edit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form
            onSubmit={save}
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${tx.type} for ${tx.symbol}`}
            className="w-full max-w-lg space-y-5 rounded-2xl border border-border bg-card p-6 text-left shadow-xl"
          >
            <div>
              <h3 className="text-lg font-display font-medium text-foreground">
                Edit {tx.type} · {tx.symbol}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                The type and token can&apos;t change — delete and re-log for that. Rungs this transaction
                triggered stay triggered.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {tx.type === "BUY" && (
                <label className="col-span-2 block space-y-1.5">
                  <span className={labelClass}>Funded By</span>
                  <select
                    value={fundedBy}
                    onChange={(e) => setFundedBy(e.target.value as "CASH_BUCKET" | "EXTERNAL")}
                    className={inputClass}
                  >
                    <option value="CASH_BUCKET">Portfolio cash</option>
                    <option value="EXTERNAL">Outside Rekt</option>
                  </select>
                  <span className="text-[10px] text-muted-foreground/70">
                    Portfolio cash takes the total out of your cash balance. Outside Rekt means you paid from somewhere Rekt
                    doesn&apos;t track, so cash is unchanged.
                  </span>
                </label>
              )}

              <label className="block space-y-1.5">
                <span className={labelClass}>Quantity</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={labelClass}>Price / Unit (USD)</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  className={inputClass}
                />
              </label>

              <div className="col-span-2 flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm">
                <span className={labelClass}>Total (USD)</span>
                <span className="font-mono text-foreground">
                  {Number.isFinite(total) && total > 0 ? formatUsd(total) : "—"}
                </span>
              </div>

              <label className="col-span-2 block space-y-1.5">
                <span className={labelClass}>When</span>
                <input
                  type="datetime-local"
                  required
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="col-span-2 block space-y-1.5">
                <span className={labelClass}>Note (Optional)</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`${inputClass} font-sans`}
                  placeholder="Add any context or reasoning here..."
                />
              </label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-3 border-t border-border/50 pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
