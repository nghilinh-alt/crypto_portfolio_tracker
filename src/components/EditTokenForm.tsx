"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditTokenForm({
  tokenId,
  name,
  assetType,
  categoryId,
  categories,
  coingeckoId,
  bybitSymbol,
  exchange,
  finnhubSymbol,
  recentHigh,
  basePrice,
  baseHoldings,
}: {
  tokenId: string;
  name: string;
  assetType: "CRYPTO" | "STOCK";
  categoryId: string | null;
  categories: Array<{ id: string; name: string }>;
  coingeckoId: string | null;
  bybitSymbol: string | null;
  exchange: string | null;
  finnhubSymbol: string | null;
  recentHigh: number;
  basePrice: number;
  baseHoldings: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({
    name,
    categoryId: categoryId ?? "",
    coingeckoId: coingeckoId ?? "",
    bybitSymbol: bybitSymbol ?? "",
    exchange: exchange ?? "",
    finnhubSymbol: finnhubSymbol ?? "",
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
        body: JSON.stringify(
          assetType === "STOCK"
            ? {
                name: values.name,
                categoryId: values.categoryId || null,
                exchange: values.exchange || null,
                finnhubSymbol: values.finnhubSymbol || null,
                recentHigh: Number(values.recentHigh),
                basePrice: Number(values.basePrice),
                baseHoldings: Number(values.baseHoldings),
              }
            : {
                name: values.name,
                categoryId: values.categoryId || null,
                coingeckoId: values.coingeckoId || null,
                bybitSymbol: values.bybitSymbol || null,
                recentHigh: Number(values.recentHigh),
                basePrice: Number(values.basePrice),
                baseHoldings: Number(values.baseHoldings),
              }
        ),
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
        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        Edit Configuration
      </button>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Name</span>
          <input
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Category</span>
          <select
            value={values.categoryId}
            onChange={(e) => setValues((v) => ({ ...v, categoryId: e.target.value }))}
            className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground/70">
            just a label here — use &quot;Apply Category Template&quot; below to copy its rungs
          </span>
        </label>
        {assetType === "STOCK" ? (
          <>
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Exchange</span>
              <input
                value={values.exchange}
                onChange={(e) => setValues((v) => ({ ...v, exchange: e.target.value }))}
                className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Finnhub Symbol</span>
              <input
                value={values.finnhubSymbol}
                onChange={(e) => setValues((v) => ({ ...v, finnhubSymbol: e.target.value }))}
                className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground/70">used for price + logo fetch</span>
            </label>
          </>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">CoinGecko ID</span>
              <input
                value={values.coingeckoId}
                onChange={(e) => setValues((v) => ({ ...v, coingeckoId: e.target.value }))}
                className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Bybit Symbol</span>
              <input
                value={values.bybitSymbol}
                onChange={(e) => setValues((v) => ({ ...v, bybitSymbol: e.target.value }))}
                className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </>
        )}
        <label className="block space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Recent High (USD)</span>
          <input
            type="number"
            step="any"
            value={values.recentHigh}
            onChange={(e) => setValues((v) => ({ ...v, recentHigh: e.target.value }))}
            className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-[10px] text-muted-foreground/70">ratchets up, drives rebuy</span>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Base Price (USD)</span>
          <input
            type="number"
            step="any"
            value={values.basePrice}
            onChange={(e) => setValues((v) => ({ ...v, basePrice: e.target.value }))}
            className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-[10px] text-muted-foreground/70">fixed, drives sell</span>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Base Holdings</span>
          <input
            type="number"
            step="any"
            value={values.baseHoldings}
            onChange={(e) => setValues((v) => ({ ...v, baseHoldings: e.target.value }))}
            className="block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-[10px] text-muted-foreground/70">sell % sized against this</span>
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/50">
        <button
          onClick={save}
          disabled={busy}
          className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {busy ? "Saving..." : "Save Settings"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
