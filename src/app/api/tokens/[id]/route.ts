import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenWithLadder } from "@/lib/data";
import { updateTokenSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";
import { fetchTokenIconUrl } from "@/lib/tokenIcon";

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
  if (data.coingeckoId !== undefined && data.coingeckoId !== existing.coingeckoId) {
    dataWithIcon.iconUrl = data.coingeckoId ? await fetchTokenIconUrl(data.coingeckoId) : null;
  }

  const token = await prisma.token.update({ where: { id }, data: dataWithIcon });
  return NextResponse.json(token);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await prisma.token.findUnique({ where: { id } });
  if (!existing) return notFound("Token");
  await prisma.token.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
