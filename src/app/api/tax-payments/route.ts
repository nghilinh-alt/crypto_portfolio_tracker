import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTaxPayments } from "@/lib/tax";
import { createTaxPaymentSchema } from "@/lib/validation";
import { zodErrorResponse } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const payments = await getTaxPayments();
  return NextResponse.json(payments);
}

// Logs a lump-sum real-world tax payment, separate from any token's Cash
// Bucket — "Tax Owing" (shown on Cash Buckets) is always derived as the sum
// of every token's taxReserved minus the sum of these payments.
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createTaxPaymentSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const { amount, note, occurredAt } = parsed.data;

  const payment = await prisma.taxPayment.create({
    data: {
      amount,
      note: note || null,
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
