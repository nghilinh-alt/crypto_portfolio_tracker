"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type CategoryData = {
  id: string;
  name: string;
  rungs: Array<{ id: string; order: number; pct: number; sellPortionPct: number }>;
  _count: { tokens: number };
};

export default function CategoryManager({ categories }: { categories: CategoryData[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCategory() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to create category");
        return;
      }
      setNewName("");
      setAdding(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {adding ? (
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              autoFocus
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={createCategory}
              disabled={busy}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewName("");
                setError(null);
              }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Add Category
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          No categories yet — add one above.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} onChanged={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  category,
  onChanged,
}: {
  category: CategoryData;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);
  const retentionPct = 100 - category.rungs.reduce((sum, r) => sum + r.sellPortionPct, 0);

  async function rename() {
    if (name === category.name || !name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory() {
    const warning =
      category._count.tokens > 0
        ? `Delete "${category.name}"? ${category._count.tokens} token(s) using it will become uncategorized — their own sell rungs are untouched.`
        : `Delete "${category.name}"?`;
    if (!window.confirm(warning)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={rename}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-lg font-display font-medium text-foreground hover:border-input focus:border-primary focus:outline-none"
        />
        <button
          onClick={deleteCategory}
          disabled={busy}
          className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Delete
        </button>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{category._count.tokens} token(s)</span>
        <span>·</span>
        <span>Target retention {retentionPct.toFixed(1)}%</span>
      </div>

      <RungList categoryId={category.id} rungs={category.rungs} onChanged={onChanged} />
    </div>
  );
}

function RungList({
  categoryId,
  rungs,
  onChanged,
}: {
  categoryId: string;
  rungs: CategoryData["rungs"];
  onChanged: () => void;
}) {
  const [pct, setPct] = useState("");
  const [sellPortionPct, setSellPortionPct] = useState("");
  const [busy, setBusy] = useState(false);

  async function addRung() {
    if (!pct || !sellPortionPct) return;
    setBusy(true);
    try {
      await fetch(`/api/categories/${categoryId}/rungs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pct: Number(pct), sellPortionPct: Number(sellPortionPct) }),
      });
      setPct("");
      setSellPortionPct("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <thead className="text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="pb-1 font-normal">Gain %</th>
            <th className="pb-1 font-normal">Sell %</th>
            <th className="pb-1" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rungs.map((r) => (
            <RungRow key={r.id} rung={r} onChanged={onChanged} />
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 pt-1">
        <span className="text-muted-foreground">+</span>
        <input
          type="number"
          step="any"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          placeholder="Gain %"
          className="w-20 rounded border border-input bg-background px-2 py-1 text-sm"
        />
        <input
          type="number"
          step="any"
          value={sellPortionPct}
          onChange={(e) => setSellPortionPct(e.target.value)}
          placeholder="Sell %"
          className="w-20 rounded border border-input bg-background px-2 py-1 text-sm"
        />
        <button
          onClick={addRung}
          disabled={busy}
          className="rounded border border-input px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
        >
          + Add Rung
        </button>
      </div>
    </div>
  );
}

function RungRow({
  rung,
  onChanged,
}: {
  rung: CategoryData["rungs"][number];
  onChanged: () => void;
}) {
  const [pct, setPct] = useState(String(rung.pct));
  const [sellPortionPct, setSellPortionPct] = useState(String(rung.sellPortionPct));
  const [busy, setBusy] = useState(false);
  const dirty = Number(pct) !== rung.pct || Number(sellPortionPct) !== rung.sellPortionPct;

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/category-rungs/${rung.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pct: Number(pct), sellPortionPct: Number(sellPortionPct) }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await fetch(`/api/category-rungs/${rung.id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td className="py-1">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">+</span>
          <input
            type="number"
            step="any"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="w-16 rounded border border-input bg-background px-1.5 py-1 text-sm"
          />
        </div>
      </td>
      <td className="py-1">
        <input
          type="number"
          step="any"
          value={sellPortionPct}
          onChange={(e) => setSellPortionPct(e.target.value)}
          className="w-16 rounded border border-input bg-background px-1.5 py-1 text-sm"
        />
      </td>
      <td className="py-1 text-right">
        <div className="flex items-center justify-end gap-2">
          {dirty && (
            <button
              onClick={save}
              disabled={busy}
              className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save
            </button>
          )}
          <button onClick={remove} disabled={busy} className="text-xs text-muted-foreground hover:text-destructive">
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
