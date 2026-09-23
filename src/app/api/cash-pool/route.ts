import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortfolioCashPoolBalance } from "@/lib/cashPool";

export const dynamic = "force-dynamic";

export async function GET() {
  const [balance, transactions] = await Promise.all([
    getPortfolioCashPoolBalance(),
    prisma.portfolioCashTransaction.findMany({
      include: { token: { select: { symbol: true } } },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
  ]);
  return NextResponse.json({ balance, transactions });
}
