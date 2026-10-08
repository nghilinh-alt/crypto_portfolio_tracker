"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DeleteButton from "./DeleteButton";
import { formatUsd } from "@/lib/format";
import { cashMovementLabel } from "@/lib/labels";

export type EditableCashMovement = {
  id: string;
  direction: "IN" | "OUT";
  amount: number;
  note: string | null;
  occurredAt: string; // ISO
  isAdjustment: boolean;
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

/** Edit / delete for one portfolio cash ledger entry (deposit, withdrawal or adjustment). */
export default function CashMovementActions({ movement }: { movement: EditableCashMovement }) {
  const kind = cashMovementLabel(movement).toLowerCase();
  return (
    <div className="flex items-center justify-end gap-3">
      <EditCashMovementDialog movement={movement} />
      <DeleteButton
        url={`/api/cash/${movement.id}`}
        confirmText={`Delete this ${kind} of ${formatUsd(movement.amount)}? Portfolio cash will ${
          movement.direction === "IN" ? "drop" : "rise"
        } by that amount.`}
      />
    </div>
  );
}

function EditCashMovementDialog({ movement }: { movement: EditableCashMovement }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(movement.amount));
  const [note, setNote] = useState(movement.note ?? "");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocal(new Date(movement.occurredAt)));
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
    setAmount(String(movement.amount));
    setNote(movement.note ?? "");
    setOccurredAt(toDatetimeLocal(new Date(movement.occurredAt)));
    setError(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cash/${movement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          note: note.trim() === "" ? null : note,
          occurredAt: new Date(occurredAt).toISOString(),
        }),
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
        title="Edit"
        aria-label={`Edit ${cashMovementLabel(movement).toLowerCase()}`}
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
            aria-label={`Edit ${cashMovementLabel(movement)}`}
            className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-6 text-left shadow-xl"
          >
            <div>
              <h3 className="text-lg font-display font-medium text-foreground">
                Edit {cashMovementLabel(movement).toLowerCase()}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {movement.direction === "IN" ? "Adds to" : "Takes from"} portfolio cash.
              </p>
            </div>
            <label className="block space-y-1.5">
              <span className={labelClass}>Amount (USD)</span>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>When</span>
              <input
                type="datetime-local"
                required
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Note (Optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} font-sans`} />
            </label>
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
