/**
 * Manual stand-in for the weekly Vercel Cron job (§5). Hits the same
 * /api/cron/update-prices route the cron job calls — run this against a
 * dev or deployed server whenever you want to force a price/recentHigh
 * check outside the weekly schedule.
 *
 * Usage: npm run prices:refresh
 * Env:   BASE_URL   (default http://localhost:3000)
 *        CRON_SECRET (if the target deployment requires it)
 */

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;

async function main() {
  const res = await fetch(`${baseUrl}/api/cron/update-prices`, {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
  const body = await res.json();

  if (!res.ok) {
    console.error(`Request failed (${res.status}):`, body);
    process.exit(1);
  }

  console.log(JSON.stringify(body, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
