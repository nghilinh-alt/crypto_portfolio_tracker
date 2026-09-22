"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RefreshPricesButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
    <div className="flex items-center gap-3">
      {message && <span className="text-xs font-mono text-muted-foreground animate-in fade-in slide-in-from-right-2">{message}</span>}
      <button
        onClick={handleClick}
        disabled={busy}
        aria-label="Refresh Prices"
        className="flex items-center gap-2 rounded-md border border-border bg-card/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={busy ? "animate-spin text-primary" : "text-muted-foreground"}
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        <span className="hidden sm:inline">{busy ? "Syncing..." : "Refresh"}</span>
      </button>
    </div>
  );
}
