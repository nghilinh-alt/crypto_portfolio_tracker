"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshPricesButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cron/update-prices");
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error ?? "Refresh failed");
      } else {
        const count = body.updated?.length ?? 0;
        setMessage(`Updated ${count} token${count === 1 ? "" : "s"}`);
        router.refresh();
      }
    } catch {
      setMessage("Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-xs text-neutral-500">{message}</span>}
      <button
        onClick={handleClick}
        disabled={busy}
        className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        {busy ? "Refreshing…" : "Refresh Prices"}
      </button>
    </div>
  );
}
