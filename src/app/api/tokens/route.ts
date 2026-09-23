import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllTokensWithLadder } from "@/lib/data";
import { createTokenSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";
import { DEFAULT_REBUY_RUNGS } from "@/lib/ladder";
import { fetchTokenIconUrl, fetchStockLogoUrl } from "@/lib/tokenIcon";

export async function GET() {
  const tokens = await getAllTokensWithLadder();
  return NextResponse.json(tokens);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createTokenSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  // Uniqueness is per asset type — e.g. UNI is both a crypto symbol and a
  // real stock ticker, so the two can coexist.
  const existing = await prisma.token.findUnique({
    where: { symbol_assetType: { symbol: input.symbol, assetType: input.assetType } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Token ${input.symbol} already exists` },
      { status: 409 }
    );
  }

  let templateSellRungs: Array<{ pct: number; sellPortionPct: number }> = [];
  let templateRebuyRungs: Array<{ pct: number; deployPct: number }> = [];
  if (input.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
      include: {
        rungs: { orderBy: { order: "asc" } },
        rebuyRungs: { orderBy: { order: "asc" } },
      },
    });
    if (!category) return notFound("Category");
    templateSellRungs = category.rungs;
    templateRebuyRungs = category.rebuyRungs;
  }

  const sellRungs = (input.sellRungs ?? templateSellRungs).map((r, i) => ({
    order: i + 1,
    pct: r.pct,
    sellPortionPct: r.sellPortionPct,
  }));
  const rebuyRungs = (
    input.rebuyRungs ?? (templateRebuyRungs.length > 0 ? templateRebuyRungs : DEFAULT_REBUY_RUNGS)
  ).map((r, i) => ({
    order: i + 1,
    pct: r.pct,
    deployPct: "deployPct" in r ? r.deployPct : 0,
  }));

  const iconUrl =
    input.assetType === "STOCK"
      ? input.finnhubSymbol
        ? await fetchStockLogoUrl(input.finnhubSymbol)
        : null
      : input.coingeckoId
        ? await fetchTokenIconUrl(input.coingeckoId)
        : null;

  const token = await prisma.$transaction(async (tx) => {
    const created = await tx.token.create({
      data: {
        symbol: input.symbol,
        name: input.name,
        assetType: input.assetType,
        categoryId: input.categoryId ?? null,
        coingeckoId: input.coingeckoId ?? null,
        bybitSymbol: input.bybitSymbol ?? null,
        exchange: input.exchange ?? null,
        finnhubSymbol: input.finnhubSymbol ?? null,
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
