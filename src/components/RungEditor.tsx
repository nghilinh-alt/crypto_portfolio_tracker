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
  // Sell rungs are a % GAIN above basePrice; rebuy rungs are a % DROP below recentHigh.
  const pctLabel = kind === "sell" ? "Gain %" : "Drop %";
  const pctSign = kind === "sell" ? "+" : "-";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200 text-sm">
        <thead className="text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="py-2 pr-3">{pctLabel}</th>
            <th className="py-2 pr-3">Trigger Price</th>
            <th className="py-2 pr-3">{portionLabel}</th>
            <th className="py-2 pr-3">{rungs[0]?.extraLabel ?? ""}</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rungs.map((rung) => (
            <RungRowEditor
              key={rung.id}
              rung={rung}
              apiUrl={`${rungBase}/${rung.id}`}
              portionField={portionField}
              pctSign={pctSign}
              onChanged={() => router.refresh()}
            />
          ))}
        </tbody>
      </table>
      <AddRungForm
        tokenId={tokenId}
        kind={kind}
        portionLabel={portionLabel}
        pctLabel={pctLabel}
        onAdded={() => router.refresh()}
      />
    </div>
  );
}

function RungRowEditor({
  rung,
  apiUrl,
  portionField,
  pctSign,
  onChanged,
}: {
  rung: RungRow;
  apiUrl: string;
  portionField: string;
  pctSign: string;
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
    <tr className={rung.isEligible ? "bg-amber-50" : undefined}>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1">
          <span className="text-neutral-400">{pctSign}</span>
          <input
            type="number"
            step="any"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="w-16 rounded border border-neutral-300 px-1.5 py-1 text-sm"
          />
          <span className="text-neutral-400">%</span>
        </div>
      </td>
      <td className="py-2 pr-3 tabular-nums text-neutral-600">
        {formatPrice(rung.triggerPrice)}
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="any"
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
            className="w-16 rounded border border-neutral-300 px-1.5 py-1 text-sm"
          />
          <span className="text-neutral-400">%</span>
        </div>
      </td>
      <td className="py-2 pr-3 tabular-nums text-neutral-600">{rung.extraValue}</td>
      <td className="py-2 pr-3">
        <button
          onClick={toggleStatus}
          disabled={busy}
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            rung.status === "TRIGGERED"
              ? "bg-neutral-800 text-white"
              : "bg-neutral-100 text-neutral-600"
          }`}
          title={rung.triggeredAt ? `Triggered ${formatDate(rung.triggeredAt)}` : undefined}
        >
          {rung.status}
        </button>
      </td>
      <td className="py-2 pr-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {dirty && (
            <button
              onClick={save}
              disabled={busy}
              className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700"
            >
              Save
            </button>
          )}
          <button
            onClick={remove}
            disabled={busy}
            className="text-xs text-red-600 hover:underline"
          >
            Delete
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
    <div className="mt-2 flex items-center gap-2 text-sm">
      <input
        type="number"
        step="any"
        placeholder={pctLabel}
        value={pct}
        onChange={(e) => setPct(e.target.value)}
        className="w-20 rounded border border-neutral-300 px-1.5 py-1"
      />
      <input
        type="number"
        step="any"
        placeholder={portionLabel}
        value={portion}
        onChange={(e) => setPortion(e.target.value)}
        className="w-24 rounded border border-neutral-300 px-1.5 py-1"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
      >
        + Add Rung
      </button>
    </div>
  );
}
