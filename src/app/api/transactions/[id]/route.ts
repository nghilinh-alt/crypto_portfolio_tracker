import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { updateTransactionSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";
import { getPortfolioCash } from "@/lib/portfolioCash";
import { formatUsd } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

// Edits a trade's details (funding source, quantity/price, note, date). The
// type and token can't change — delete and re-log for that. Rung status is
// never touched: a rung this transaction triggered stays triggered, same as
// when a transaction is deleted.
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateTransactionSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) return notFound("Transaction");

  if (existing.type !== "BUY" && existing.type !== "SELL") {
    return badRequest(`${existing.type} isn't a trade — cash movements are edited from the cash ledger.`);
  }
  if (existing.type !== "BUY" && input.fundedBy !== undefined) {
    return badRequest("Only a BUY has a funding source");
  }

  const data: Prisma.TransactionUpdateInput = {};
  if (input.note !== undefined) data.note = input.note || null;
  if (input.occurredAt !== undefined) data.occurredAt = new Date(input.occurredAt);
  if (input.fundedBy !== undefined) data.fundedBy = input.fundedBy;

  let usdAmount = existing.usdAmount;
  if (input.quantity !== undefined || input.pricePerUnit !== undefined) {
    const quantity = input.quantity ?? existing.quantity;
    const pricePerUnit = input.pricePerUnit ?? existing.pricePerUnit;
    if (quantity === null || pricePerUnit === null) {
      return badRequest("This transaction has no quantity/price to edit");
    }
    data.quantity = quantity;
    data.pricePerUnit = pricePerUnit;
    usdAmount = quantity * pricePerUnit;
    data.usdAmount = usdAmount;
  }

  // Same rule as logging it: a buy paid from portfolio cash can't need more
  // cash than there was without this transaction counted.
  const fundedBy = input.fundedBy ?? existing.fundedBy;
  if (existing.type === "BUY" && fundedBy === "CASH_BUCKET") {
    const cash = await getPortfolioCash(id);
    if (usdAmount > cash + 0.005) {
      return badRequest(
        `This buy is ${formatUsd(usdAmount)} but portfolio cash is only ${formatUsd(cash)}. Choose "Outside Rekt" if it was paid from elsewhere, or log a deposit first.`
      );
    }
  }

  if (Object.keys(data).length === 0) return badRequest("Nothing to update");

  const updated = await prisma.transaction.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// Deleting a transaction does not automatically revert any rung it
// triggered — undo that separately via the rung's status control if
// the tag was a mistake.
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) return notFound("Transaction");
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
