"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AddTokenForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Capture the element now — the browser nulls e.currentTarget once the
    // event finishes dispatching, which happens before our `await` resolves.
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const priceNow = form.get("currentPrice") ? Number(form.get("currentPrice")) : undefined;
    const payload = {
      symbol: String(form.get("symbol") ?? ""),
      name: String(form.get("name") ?? ""),
      category: form.get("category") ? String(form.get("category")) : undefined,
      coingeckoId: form.get("coingeckoId") ? String(form.get("coingeckoId")) : undefined,
      bybitSymbol: form.get("bybitSymbol") ? String(form.get("bybitSymbol")) : undefined,
      currentPrice: priceNow,
      // Both anchors default to today's price if left blank — recentHigh
      // ratchets up from there (rebuy), basePrice stays fixed (sell).
      recentHigh: form.get("recentHigh") ? Number(form.get("recentHigh")) : priceNow,
      basePrice: form.get("basePrice") ? Number(form.get("basePrice")) : priceNow,
      baseHoldings: form.get("baseHoldings") ? Number(form.get("baseHoldings")) : undefined,
    };

    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create token");
        return;
      }
      formEl.reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to create token");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Add Token
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Symbol" name="symbol" required placeholder="BTC" />
        <Field label="Name" name="name" required placeholder="Bitcoin" />
        <label className="block text-sm">
          <span className="text-neutral-700">Category</span>
          <select
            name="category"
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="">— none —</option>
            <option value="Core">Core</option>
            <option value="Growth">Growth</option>
            <option value="Harvest">Harvest</option>
          </select>
          <span className="text-xs text-neutral-400">picks the sell-ladder template</span>
        </label>
        <Field
          label="CoinGecko ID"
          name="coingeckoId"
          placeholder="bitcoin"
          hint="used for price fetch"
        />
        <Field label="Bybit Symbol" name="bybitSymbol" placeholder="BTCUSDT" hint="fallback" />
        <Field
          label="Current Price (USD)"
          name="currentPrice"
          type="number"
          step="any"
          hint="also fills recent high / base price below"
        />
        <Field
          label="Recent High (USD)"
          name="recentHigh"
          type="number"
          step="any"
          hint="drives rebuy ladder"
        />
        <Field
          label="Base Price (USD)"
          name="basePrice"
          type="number"
          step="any"
          hint="fixed, drives sell ladder"
        />
        <Field
          label="Base Holdings"
          name="baseHoldings"
          type="number"
          step="any"
          hint="sell % sized against this"
        />
      </div>
      <p className="text-xs text-neutral-500">
        Picking a category applies its sell-ladder template automatically. The rebuy ladder
        defaults to -15/-25/-35/-45% off recent high, deploying 10/20/30/40% of Cash Bucket
        Contributions. Edit any of it from the token page after creating it.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Token"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  step,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-neutral-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        step={step}
        className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
      />
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}
