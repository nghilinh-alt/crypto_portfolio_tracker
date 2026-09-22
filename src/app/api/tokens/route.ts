import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllTokensWithLadder } from "@/lib/data";
import { createTokenSchema } from "@/lib/validation";
import { zodErrorResponse } from "@/lib/apiHelpers";
import { DEFAULT_SELL_RUNGS, DEFAULT_REBUY_RUNGS } from "@/lib/ladder";

export async function GET() {
  const tokens = await getAllTokensWithLadder();
  return NextResponse.json(tokens);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createTokenSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const existing = await prisma.token.findUnique({ where: { symbol: input.symbol } });
  if (existing) {
    return NextResponse.json(
      { error: `Token ${input.symbol} already exists` },
      { status: 409 }
    );
  }

  const sellRungs = (input.sellRungs ?? DEFAULT_SELL_RUNGS).map((r, i) => ({
    order: i + 1,
    pct: r.pct,
    sellPortionPct: "sellPortionPct" in r ? r.sellPortionPct : 0,
  }));
  const rebuyRungs = (input.rebuyRungs ?? DEFAULT_REBUY_RUNGS).map((r, i) => ({
    order: i + 1,
    pct: r.pct,
    deployPct: "deployPct" in r ? r.deployPct : 0,
  }));

  const token = await prisma.token.create({
    data: {
      symbol: input.symbol,
      name: input.name,
      coingeckoId: input.coingeckoId ?? null,
      bybitSymbol: input.bybitSymbol ?? null,
      recentHigh: input.recentHigh,
      currentPrice: input.currentPrice,
      sellRungs: { create: sellRungs },
      rebuyRungs: { create: rebuyRungs },
    },
    include: { sellRungs: true, rebuyRungs: true },
  });

  return NextResponse.json(token, { status: 201 });
}
