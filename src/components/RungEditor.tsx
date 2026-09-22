"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, formatDate } from "@/lib/format";

export type RungRow = {
  id: string;
  order: number;
  pct: number;
  portionPct: number;
  triggerPrice: number;
  status: "PENDING" | "TRIGGERED";
  triggeredAt: string | null;
  isEligible: boolean;
  extraLabel: string;
  extraValue: string;
};

export default function RungEditor({
  tokenId,
  kind,
  portionLabel,
  rungs,
}: {
  tokenId: string;
  kind: "sell" | "rebuy";
  portionLabel: string;
  rungs: RungRow[];
}) {
  const router = useRouter();
  const rungBase = kind === "sell" ? "/api/sell-rungs" : "/api/rebuy-rungs";
  const portionField = kind === "sell" ? "sellPortionPct" : "deployPct";
  const pctLabel = kind === "sell" ? "Gain %" : "Drop %";
  const pctSign = kind === "sell" ? "+" : "-";
  const accentColor = kind === "sell" ? "text-destructive" : "text-emerald-500";

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/50">
            <tr>
              <th className="py-2 pr-3 font-medium">{pctLabel}</th>
              <th className="py-2 pr-3 font-medium">Trigger Price</th>
              <th className="py-2 pr-3 font-medium">{portionLabel}</th>
              <th className="py-2 pr-3 font-medium">{rungs[0]?.extraLabel ?? ""}</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {rungs.map((rung) => (
              <RungRowEditor
                key={rung.id}
                rung={rung}
                apiUrl={`${rungBase}/${rung.id}`}
                portionField={portionField}
                pctSign={pctSign}
                accentColor={accentColor}
                onChanged={() => router.refresh()}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 pt-4 border-t border-border/50">
        <AddRungForm
          tokenId={tokenId}
          kind={kind}
          portionLabel={portionLabel}
          pctLabel={pctLabel}
          onAdded={() => router.refresh()}
        />
      </div>
    </div>
  );
}

function RungRowEditor({
  rung,
  apiUrl,
  portionField,
  pctSign,
  accentColor,
  onChanged,
}: {
  rung: RungRow;
  apiUrl: string;
  portionField: string;
  pctSign: string;
  accentColor: string;
  onChanged: () => void;
}) {
  const [pct, setPct] = useState(String(rung.pct));
  const [portion, setPortion] = useState(String(rung.portionPct));
  const [busy, setBusy] = useState(false);
  const dirty = Number(pct) !== rung.pct || Number(portion) !== rung.portionPct;

  async function save() {
    setBusy(true);
    try {
      await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pct: Number(pct), [portionField]: Number(portion) }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    setBusy(true);
    try {
      await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: rung.status === "PENDING" ? "TRIGGERED" : "PENDING",
        }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this rung?")) return;
    setBusy(true);
    try {
      await fetch(apiUrl, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className={`${rung.isEligible ? "bg-accent/30" : ""} group transition-colors`}>
      <td className="py-3 pr-3">
        <div className="flex items-center gap-1 font-mono">
          <span className={`${accentColor} font-bold`}>{pctSign}</span>
          <input
            type="number"
            step="any"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="w-14 rounded-md border border-input bg-background/50 px-1.5 py-1 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      </td>
      <td className="py-3 pr-3 font-mono tabular-nums text-foreground">
        {formatPrice(rung.triggerPrice)}
      </td>
      <td className="py-3 pr-3">
        <div className="flex items-center gap-1 font-mono">
          <input
            type="number"
            step="any"
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
            className="w-14 rounded-md border border-input bg-background/50 px-1.5 py-1 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      </td>
      <td className="py-3 pr-3 font-mono tabular-nums text-foreground">{rung.extraValue}</td>
      <td className="py-3 pr-3">
        <button
          onClick={toggleStatus}
          disabled={busy}
          className={`rounded-md px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold ring-1 ring-inset transition-colors ${
            rung.status === "TRIGGERED"
              ? "bg-secondary text-secondary-foreground ring-border"
              : "bg-background text-muted-foreground ring-border hover:bg-muted"
          }`}
          title={rung.triggeredAt ? `Triggered ${formatDate(rung.triggeredAt)}` : undefined}
        >
          {rung.status}
        </button>
      </td>
      <td className="py-3 pr-3 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {dirty && (
            <button
              onClick={save}
              disabled={busy}
              className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save
            </button>
          )}
          <button
            onClick={remove}
            disabled={busy}
            aria-label="Delete rung"
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddRungForm({
  tokenId,
  kind,
  portionLabel,
  pctLabel,
  onAdded,
}: {
  tokenId: string;
  kind: "sell" | "rebuy";
  portionLabel: string;
  pctLabel: string;
  onAdded: () => void;
}) {
  const [pct, setPct] = useState("");
  const [portion, setPortion] = useState("");
  const [busy, setBusy] = useState(false);
  const portionField = kind === "sell" ? "sellPortionPct" : "deployPct";
  const endpoint =
    kind === "sell" ? `/api/tokens/${tokenId}/sell-rungs` : `/api/tokens/${tokenId}/rebuy-rungs`;

  async function submit() {
    if (!pct || !portion) return;
    setBusy(true);
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pct: Number(pct), [portionField]: Number(portion) }),
      });
      setPct("");
      setPortion("");
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        step="any"
        placeholder={pctLabel}
        value={pct}
        onChange={(e) => setPct(e.target.value)}
        className="w-24 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors placeholder:text-muted-foreground/50"
      />
      <input
        type="number"
        step="any"
        placeholder={portionLabel}
        value={portion}
        onChange={(e) => setPortion(e.target.value)}
        className="w-28 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors placeholder:text-muted-foreground/50"
      />
      <button
        onClick={submit}
        disabled={busy || !pct || !portion}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors inline-flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Add
      </button>
    </div>
  );
}
