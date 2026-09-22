import type { TokenStatus } from "@/lib/ladder";

const STYLES: Record<TokenStatus, string> = {
  SELL: "bg-destructive/20 text-destructive ring-destructive/30",
  BUY: "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30",
  WATCH: "bg-amber-500/20 text-amber-400 ring-amber-500/30",
  HOLD: "bg-secondary text-secondary-foreground ring-border",
};

export default function StatusBadge({ status }: { status: TokenStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      {status === 'SELL' ? 'Sell Target' : status === 'BUY' ? 'Rebuy Target' : status}
    </span>
  );
}
