/**
 * Renders the real token icon (fetched from CoinGecko, see src/lib/tokenIcon.ts)
 * when available, falling back to the gradient-initials badge otherwise —
 * e.g. tokens added without a coingeckoId, or where the fetch failed.
 */
export default function TokenAvatar({
  symbol,
  iconUrl,
  gradient = "from-primary to-indigo-600",
  className = "h-10 w-10 text-xs",
}: {
  symbol: string;
  iconUrl?: string | null;
  gradient?: string;
  className?: string;
}) {
  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external, dynamic CoinGecko host; not worth next/image's remote-pattern config for a personal tool
      <img
        src={iconUrl}
        alt={symbol}
        className={`shrink-0 rounded-full bg-white object-contain ring-1 ring-border ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ring-1 ring-white/20 ${gradient} ${className}`}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
