import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import AutoRefreshOnLoad from "@/components/AutoRefreshOnLoad";
import { getLastPriceRefreshAt } from "@/lib/data";
import { startOfBrisbaneDay } from "@/lib/timezone";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rekt",
  description: "Sell/rebuy ladder tracker",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lastRefreshAt = await getLastPriceRefreshAt();
  const needsAutoRefresh =
    !lastRefreshAt || startOfBrisbaneDay(lastRefreshAt) < startOfBrisbaneDay(new Date());

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/30">
        <AutoRefreshOnLoad needsRefresh={needsAutoRefresh} />
        <NavBar />
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
