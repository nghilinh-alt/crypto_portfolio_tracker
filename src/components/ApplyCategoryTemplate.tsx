"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplyCategoryTemplate({
  tokenId,
  categories,
}: {
  tokenId: string;
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    if (
      !window.confirm(
        `Replace this token's entire Sell Ladder with the "${category.name}" template? This can't be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tokens/${tokenId}/apply-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to apply category");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-muted/10 px-6 py-3">
      <span className="text-xs text-muted-foreground">Apply category template:</span>
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        onClick={apply}
        disabled={busy}
        className="rounded-md border border-input px-2 py-1 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
      >
        {busy ? "Applying…" : "Apply (replaces current rungs)"}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
