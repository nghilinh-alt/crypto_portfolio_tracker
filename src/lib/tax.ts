import { prisma } from "./prisma";

export async function getTotalTaxPaid(): Promise<number> {
  const payments = await prisma.taxPayment.findMany({ select: { amount: true } });
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export async function getTaxPayments(limit = 50) {
  return prisma.taxPayment.findMany({ orderBy: { occurredAt: "desc" }, take: limit });
}
