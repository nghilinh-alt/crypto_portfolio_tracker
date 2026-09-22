import type { TokenStatus } from "@/lib/ladder";

const STYLES: Record<TokenStatus, string> = {
  SELL: "bg-red-100 text-red-800 ring-red-600/20",
  BUY: "bg-green-100 text-green-800 ring-green-600/20",
  WATCH: "bg-amber-100 text-amber-800 ring-amber-600/20",
  HOLD: "bg-neutral-100 text-neutral-600 ring-neutral-500/20",
};

export default function StatusBadge({ status }: { status: TokenStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
