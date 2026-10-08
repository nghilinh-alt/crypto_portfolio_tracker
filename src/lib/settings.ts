import { prisma } from "./prisma";

const SETTINGS_ID = 1;

export async function getPortfolioSettings() {
  return prisma.portfolioSettings.findUnique({ where: { id: SETTINGS_ID } });
}

export async function setPortfolioTarget(targetValueUsd: number | null) {
  return prisma.portfolioSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { targetValueUsd },
    create: { id: SETTINGS_ID, targetValueUsd },
  });
}

export async function markCashReconciled(actualBalance: number, at = new Date()) {
  return prisma.portfolioSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { lastReconciledAt: at, lastReconciledBalance: actualBalance },
    create: { id: SETTINGS_ID, lastReconciledAt: at, lastReconciledBalance: actualBalance },
  });
}
