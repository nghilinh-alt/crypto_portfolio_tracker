import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenWithLadder } from "@/lib/data";
import { updateTokenSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";
import { fetchTokenIconUrl, fetchStockLogoUrl } from "@/lib/tokenIcon";
import { computePositionFigures, tokenCashFlow } from "@/lib/position";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const token = await getTokenWithLadder(id);
  if (!token) return notFound("Token");
  return NextResponse.json(token);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateTokenSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const existing = await prisma.token.findUnique({ where: { id } });
  if (!existing) return notFound("Token");

  // recentHigh only ever ratchets up (§2) — a manual edit can raise it,
  // never lower it below what's already recorded.
  const data: typeof parsed.data & { basePriceSetAt?: Date } = { ...parsed.data };
  if (data.recentHigh !== undefined) {
    data.recentHigh = Math.max(data.recentHigh, existing.recentHigh);
  }
  // Track when basePrice actually changes, so the portfolio "gain since"
  // display stays accurate even after resetting a token for a new cycle.
  if (data.basePrice !== undefined && data.basePrice !== existing.basePrice) {
    data.basePriceSetAt = new Date();
  }

  const dataWithIcon: typeof data & { iconUrl?: string | null } = data;
  if (existing.assetType === "STOCK") {
    if (data.finnhubSymbol !== undefined && data.finnhubSymbol !== existing.finnhubSymbol) {
      dataWithIcon.iconUrl = data.finnhubSymbol ? await fetchStockLogoUrl(data.finnhubSymbol) : null;
    }
  } else if (data.coingeckoId !== undefined && data.coingeckoId !== existing.coingeckoId) {
    dataWithIcon.iconUrl = data.coingeckoId ? await fetchTokenIconUrl(data.coingeckoId) : null;
  }

  const token = await prisma.token.update({ where: { id }, data: dataWithIcon });
  return NextResponse.json(token);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await prisma.token.findUnique({
    where: { id },
    include: { transactions: true },
  });
  if (!existing) return notFound("Token");

  // Deleting a token cascades its transactions, and portfolio cash is derived
  // from them — so what its sells brought in and its cash-funded buys took
  // out would silently vanish from the balance. Keep the cash where it is by
  // recording that net effect as an adjustment in the same step.
  const flow = tokenCashFlow(computePositionFigures(existing.transactions));
  await prisma.$transaction(async (tx) => {
    await tx.token.delete({ where: { id } });
    if (Math.abs(flow) >= 0.005) {
      await tx.portfolioCashTransaction.create({
        data: {
          direction: flow > 0 ? "IN" : "OUT",
          amount: Math.abs(flow),
          isAdjustment: true,
          note: `Cash effect of deleted token ${existing.symbol} kept`,
        },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
