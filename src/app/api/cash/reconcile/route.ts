import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPortfolioOverview } from "@/lib/data";
import { getTotalTaxPaid } from "@/lib/tax";
import { markCashReconciled } from "@/lib/settings";
import { toCashOverview } from "@/lib/portfolioCash";
import { reconcileCashSchema } from "@/lib/validation";
import { zodErrorResponse } from "@/lib/apiHelpers";
import { formatUsd } from "@/lib/format";

// "Reconcile cash": you enter what your real account shows; Rekt compares it
// with its own estimate (portfolio cash + tax set aside) and records the
// difference as ONE visible adjustment in the cash ledger, so the balance
// matches again and the correction is never hidden.
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = reconcileCashSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { actualBalance } = parsed.data;

  const [{ cash: summary }, taxPaid] = await Promise.all([getPortfolioOverview(), getTotalTaxPaid()]);
  const before = toCashOverview(summary, taxPaid);
  const adjustment = actualBalance - before.estAccountCash;

  let row = null;
  if (Math.abs(adjustment) >= 0.005) {
    row = await prisma.portfolioCashTransaction.create({
      data: {
        direction: adjustment > 0 ? "IN" : "OUT",
        amount: Math.abs(adjustment),
        isAdjustment: true,
        note: `Reconciled to account balance ${formatUsd(actualBalance)} (Rekt had ${formatUsd(before.estAccountCash)})`,
      },
    });
  }
  await markCashReconciled(actualBalance);

  return NextResponse.json({
    adjustment,
    estBefore: before.estAccountCash,
    cashBefore: before.cash,
    cashAfter: before.cash + adjustment,
    row,
  });
}
