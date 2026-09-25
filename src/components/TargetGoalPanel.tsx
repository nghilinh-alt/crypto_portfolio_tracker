"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatUsd } from "@/lib/format";

export default function TargetGoalPanel({
  currentValue,
  initialTargetValueUsd,
}: {
  currentValue: number;
  initialTargetValueUsd: number | null;
}) {
  const router = useRouter();
  const [target, setTarget] = useState(initialTargetValueUsd);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(initialTargetValueUsd ? String(initialTargetValueUsd) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const value = input.trim() ? Number(input) : null;
    if (input.trim() && (!value || value <= 0)) {
      setError("Enter a positive number");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetValueUsd: value }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to save");
        return;
      }
      setTarget(body.targetValueUsd);
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const progressPct = target && target > 0 ? Math.min(100, (currentValue / target) * 100) : 0;
  const remaining = target !== null ? target - currentValue : null;
  const reached = target !== null && currentValue >= target;

  return (
    <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Target Goal</span>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setInput(target ? String(target) : "");
              setError(null);
              setEditing(true);
            }}
            className="text-xs font-medium text-primary hover:text-primary/80"
          >
            {target === null ? "Set target" : "Edit"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <input
            type="number"
            step="any"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 1000000"
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : target === null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Set a target to see how {formatUsd(currentValue, { compact: true })} stacks up against where you want to be.
        </p>
      ) : (
        <div className="mt-2">
          <div className="flex items-end justify-between gap-3">
            <div className="text-3xl font-display font-semibold tracking-tight text-foreground">
              {formatUsd(currentValue, { compact: true })}
            </div>
            <div className="whitespace-nowrap text-sm text-muted-foreground">of {formatUsd(target, { compact: true })}</div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${reached ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className={reached ? "font-medium text-emerald-500" : "text-muted-foreground"}>
              {reached ? "Target reached" : `${progressPct.toFixed(1)}% there`}
            </span>
            {!reached && remaining !== null && (
              <span className="text-muted-foreground">{formatUsd(remaining, { compact: true })} to go</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
