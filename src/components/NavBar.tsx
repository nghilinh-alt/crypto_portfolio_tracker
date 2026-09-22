"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RefreshPricesButton from "./RefreshPricesButton";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/action-centre", label: "Action Centre" },
  { href: "/tokens", label: "Tokens" },
  { href: "/transactions", label: "Transactions" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-neutral-900">Crypto Portfolio Manager</span>
          <nav className="flex gap-4 text-sm">
            {LINKS.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? "font-medium text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-900"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <RefreshPricesButton />
      </div>
    </header>
  );
}
