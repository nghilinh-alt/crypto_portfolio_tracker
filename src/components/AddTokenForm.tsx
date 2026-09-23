"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AddTokenForm({
  categories,
}: {
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const priceNow = form.get("currentPrice") ? Number(form.get("currentPrice")) : undefined;
    const payload = {
      symbol: String(form.get("symbol") ?? ""),
      name: String(form.get("name") ?? ""),
      categoryId: form.get("categoryId") ? String(form.get("categoryId")) : undefined,
      coingeckoId: form.get("coingeckoId") ? String(form.get("coingeckoId")) : undefined,
      bybitSymbol: form.get("bybitSymbol") ? String(form.get("bybitSymbol")) : undefined,
      currentPrice: priceNow,
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
        className="inline-flex w-full md:w-auto items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Add Token
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 space-y-6 animate-in fade-in slide-in-from-top-2 w-full"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <h3 className="text-lg font-display font-medium text-foreground">Add New Token</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Field label="Symbol" name="symbol" required placeholder="BTC" />
        <Field label="Name" name="name" required placeholder="Bitcoin" />
        <label className="block space-y-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Category</span>
          <select
            name="categoryId"
            defaultValue=""
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors h-10"
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground/70">
            {categories.length === 0 ? "no categories yet — manage from Categories" : "picks the sell-ladder template"}
          </span>
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

      <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Pro tip:</span> Picking a category applies its sell-ladder template automatically. The rebuy ladder
          defaults to -15/-25/-35/-45% off recent high, deploying 10/20/30/40% of Cash Bucket
          Contributions. Edit any of it from the token page after creating it. If Base Holdings
          and Base Price are both set, an opening BUY is logged automatically so Holdings Value
          isn&apos;t $0 until your next transaction.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Token"}
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
    <label className="block space-y-1.5">
      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        step={step}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors h-10"
      />
      {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
    </label>
  );
}
