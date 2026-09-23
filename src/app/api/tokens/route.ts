import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllTokensWithLadder } from "@/lib/data";
import { createTokenSchema } from "@/lib/validation";
import { zodErrorResponse } from "@/lib/apiHelpers";
import { DEFAULT_REBUY_RUNGS, SELL_LADDER_TEMPLATES } from "@/lib/ladder";
import { fetchTokenIconUrl } from "@/lib/tokenIcon";

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

  const templateRungs =
    input.category && input.category in SELL_LADDER_TEMPLATES
      ? SELL_LADDER_TEMPLATES[input.category as keyof typeof SELL_LADDER_TEMPLATES]
      : [];
  const sellRungs = (input.sellRungs ?? templateRungs).map((r, i) => ({
    order: i + 1,
    pct: r.pct,
    sellPortionPct: r.sellPortionPct,
  }));
  const rebuyRungs = (input.rebuyRungs ?? DEFAULT_REBUY_RUNGS).map((r, i) => ({
    order: i + 1,
    pct: r.pct,
    deployPct: "deployPct" in r ? r.deployPct : 0,
  }));

  const iconUrl = input.coingeckoId ? await fetchTokenIconUrl(input.coingeckoId) : null;

  const token = await prisma.$transaction(async (tx) => {
    const created = await tx.token.create({
      data: {
        symbol: input.symbol,
        name: input.name,
        category: input.category ?? null,
        coingeckoId: input.coingeckoId ?? null,
        bybitSymbol: input.bybitSymbol ?? null,
        iconUrl,
        recentHigh: input.recentHigh,
        basePrice: input.basePrice,
        baseHoldings: input.baseHoldings,
        currentPrice: input.currentPrice,
        sellRungs: { create: sellRungs },
        rebuyRungs: { create: rebuyRungs },
      },
      include: { sellRungs: true, rebuyRungs: true },
    });

    // baseHoldings on its own doesn't put anything in the transaction log,
    // which is the only source Holdings Value is derived from — without
    // this, a token created with existing holdings would show $0 value
    // until someone thought to log a separate opening BUY by hand.
    if (input.baseHoldings > 0 && input.basePrice > 0) {
      await tx.transaction.create({
        data: {
          tokenId: created.id,
          type: "BUY",
          fundedBy: "EXTERNAL",
          quantity: input.baseHoldings,
          pricePerUnit: input.basePrice,
          usdAmount: input.baseHoldings * input.basePrice,
          note: "Opening position",
        },
      });
    }

    return created;
  });

  return NextResponse.json(token, { status: 201 });
}
