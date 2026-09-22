"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditTokenForm({
  tokenId,
  name,
  category,
  coingeckoId,
  bybitSymbol,
  recentHigh,
  basePrice,
  baseHoldings,
}: {
  tokenId: string;
  name: string;
  category: string | null;
  coingeckoId: string | null;
  bybitSymbol: string | null;
  recentHigh: number;
  basePrice: number;
  baseHoldings: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    name,
    category: category ?? "",
    coingeckoId: coingeckoId ?? "",
    bybitSymbol: bybitSymbol ?? "",
    recentHigh: String(recentHigh),
    basePrice: String(basePrice),
    baseHoldings: String(baseHoldings),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tokens/${tokenId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          category: values.category || null,
          coingeckoId: values.coingeckoId || null,
          bybitSymbol: values.bybitSymbol || null,
          recentHigh: Number(values.recentHigh),
          basePrice: Number(values.basePrice),
          baseHoldings: Number(values.baseHoldings),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Update failed");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:underline"
      >
        Edit token
      </button>
    );
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="block">
          <span className="text-xs text-neutral-500">Name</span>
          <input
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Category</span>
          <input
            value={values.category}
            onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
            placeholder="Core / Growth / Harvest"
            className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">CoinGecko ID</span>
          <input
            value={values.coingeckoId}
            onChange={(e) => setValues((v) => ({ ...v, coingeckoId: e.target.value }))}
            className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Bybit Symbol</span>
          <input
            value={values.bybitSymbol}
            onChange={(e) => setValues((v) => ({ ...v, bybitSymbol: e.target.value }))}
            className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Recent High (only ratchets up, drives rebuy)</span>
          <input
            type="number"
            step="any"
            value={values.recentHigh}
            onChange={(e) => setValues((v) => ({ ...v, recentHigh: e.target.value }))}
            className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Base Price (fixed, drives sell)</span>
          <input
            type="number"
            step="any"
            value={values.basePrice}
            onChange={(e) => setValues((v) => ({ ...v, basePrice: e.target.value }))}
            className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="block">
          <span className="text-xs text-neutral-500">Base Holdings (sell % sized against this)</span>
          <input
            type="number"
            step="any"
            value={values.baseHoldings}
            onChange={(e) => setValues((v) => ({ ...v, baseHoldings: e.target.value }))}
            className="mt-1 block w-full rounded border border-neutral-300 px-2 py-1"
          />
        </label>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700"
        >
          Save
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
