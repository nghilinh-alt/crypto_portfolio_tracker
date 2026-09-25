import { NextResponse } from "next/server";
import { getPortfolioSettings, setPortfolioTarget } from "@/lib/settings";
import { updatePortfolioSettingsSchema } from "@/lib/validation";
import { zodErrorResponse } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getPortfolioSettings();
  return NextResponse.json({ targetValueUsd: settings?.targetValueUsd ?? null });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const parsed = updatePortfolioSettingsSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  const settings = await setPortfolioTarget(parsed.data.targetValueUsd);
  return NextResponse.json({ targetValueUsd: settings.targetValueUsd });
}
