"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefreshOnLoad({ needsRefresh }: { needsRefresh: boolean }) {
  const router = useRouter();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!needsRefresh || firedRef.current) return;
    firedRef.current = true;
    fetch("/api/cron/update-prices")
      .then(() => router.refresh())
      .catch(() => {}); // silent — manual refresh is always available if something's off
  }, [needsRefresh, router]);

  return null;
}
