"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  url,
  confirmText,
  label = "Delete",
  className,
}: {
  url: string;
  confirmText: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={className ?? "text-xs text-red-600 hover:underline disabled:opacity-50"}
    >
      {busy ? "…" : label}
    </button>
  );
}
