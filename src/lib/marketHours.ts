/**
 * NYSE/NASDAQ regular trading hours (9:30am-4:00pm ET, Mon-Fri). Deliberately
 * ignores market holidays — this is a "why does this price look static"
 * hint for a personal portfolio tracker, not a trading-calendar system.
 */
export function isUsMarketOpen(date: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekday = get("weekday");
  if (weekday === "Sat" || weekday === "Sun") return false;

  const minutesSinceMidnight = Number(get("hour")) * 60 + Number(get("minute"));
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  return minutesSinceMidnight >= open && minutesSinceMidnight < close;
}
