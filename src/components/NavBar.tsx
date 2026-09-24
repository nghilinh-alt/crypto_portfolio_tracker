"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RefreshPricesButton from "./RefreshPricesButton";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/action-centre", label: "Action Centre" },
  { href: "/tokens", label: "Tokens" },
  { href: "/stocks", label: "Stocks" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/categories", label: "Categories" },
  { href: "/cash-buckets", label: "Cash Buckets" },
  { href: "/transactions", label: "Transactions" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <Link href="/" className="font-display font-semibold text-foreground text-lg tracking-tight hover:opacity-80 transition-opacity">
            Cockpit
          </Link>
          <nav className="flex items-center gap-6 text-sm overflow-x-auto pb-2 sm:pb-0">
            {LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`whitespace-nowrap transition-colors ${
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center">
          <RefreshPricesButton />
        </div>
      </div>
    </header>
  );
}
