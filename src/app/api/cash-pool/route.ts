import { NextResponse } from "next/server";
import { getPortfolioCashPoolBalance, getPortfolioCashTransactions } from "@/lib/cashPool";

export const dynamic = "force-dynamic";

export async function GET() {
  const [balance, transactions] = await Promise.all([
    getPortfolioCashPoolBalance(),
    getPortfolioCashTransactions(50),
  ]);
  return NextResponse.json({ balance, transactions });
}
