import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenWithLadder } from "@/lib/data";
import { updateTokenSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";

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
  const data = { ...parsed.data };
  if (data.recentHigh !== undefined) {
    data.recentHigh = Math.max(data.recentHigh, existing.recentHigh);
  }

  const token = await prisma.token.update({ where: { id }, data });
  return NextResponse.json(token);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await prisma.token.findUnique({ where: { id } });
  if (!existing) return notFound("Token");
  await prisma.token.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
