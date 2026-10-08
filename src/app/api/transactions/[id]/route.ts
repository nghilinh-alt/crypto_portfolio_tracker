import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { updateTransactionSchema } from "@/lib/validation";
import { zodErrorResponse, notFound } from "@/lib/apiHelpers";
import { computeCashBucketFigures } from "@/lib/cashBucket";

type Ctx = { params: Promise<{ id: string }> };

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

// Edits a transaction's details (funding source, quantity/price, amount,
// note, date). The type and token can't change — delete and re-log for that.
// Rung status is never touched: a rung this transaction triggered stays
// triggered, same as when a transaction is deleted.
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateTransactionSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);
  const input = parsed.data;

  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) return notFound("Transaction");

  const isTrade = existing.type === "BUY" || existing.type === "SELL";

  if (!isTrade && (input.quantity !== undefined || input.pricePerUnit !== undefined)) {
    return badRequest(`${existing.type} does not take quantity/pricePerUnit`);
  }
  if (existing.type !== "BUY" && input.fundedBy !== undefined) {
    return badRequest("Only a BUY has a funding source");
  }
  if (isTrade && input.usdAmount !== undefined) {
    return badRequest("A BUY/SELL's USD amount is quantity × price — edit those instead");
  }

  const data: Prisma.TransactionUpdateInput = {};
  if (input.note !== undefined) data.note = input.note || null;
  if (input.occurredAt !== undefined) data.occurredAt = new Date(input.occurredAt);

  if (isTrade) {
    if (input.fundedBy !== undefined) data.fundedBy = input.fundedBy;
    if (input.quantity !== undefined || input.pricePerUnit !== undefined) {
      const quantity = input.quantity ?? existing.quantity;
      const pricePerUnit = input.pricePerUnit ?? existing.pricePerUnit;
      if (quantity === null || pricePerUnit === null) {
        return badRequest("This transaction has no quantity/price to edit");
      }
      data.quantity = quantity;
      data.pricePerUnit = pricePerUnit;
      data.usdAmount = quantity * pricePerUnit;
    }
  } else if (input.usdAmount !== undefined) {
    if (existing.type === "WITHDRAW") {
      // Same guard as logging a withdrawal: the new amount can't exceed what
      // the Cash Bucket held without this transaction counted.
      const others = await prisma.transaction.findMany({
        where: { tokenId: existing.tokenId, NOT: { id } },
      });
      const { cashBucket } = computeCashBucketFigures(others);
      if (input.usdAmount > cashBucket) {
        return badRequest(
          `Withdrawal of ${input.usdAmount} exceeds the current Cash Bucket (${cashBucket.toFixed(2)})`
        );
      }
    }
    data.usdAmount = input.usdAmount;
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
