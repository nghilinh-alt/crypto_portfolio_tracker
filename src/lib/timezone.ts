// Brisbane (Queensland) never observes daylight saving, so it's a fixed
// UTC+10 offset year-round — no timezone database needed for this.
const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;

function toBrisbaneWallClock(date: Date): Date {
  return new Date(date.getTime() + BRISBANE_OFFSET_MS);
}

function fromBrisbaneWallClock(wallClock: Date): Date {
  return new Date(wallClock.getTime() - BRISBANE_OFFSET_MS);
}

/** The instant that is Sunday 00:00 Brisbane time, for the week containing `date`. */
export function startOfBrisbaneWeek(date: Date): Date {
  const wall = toBrisbaneWallClock(date);
  const startWall = new Date(
    Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() - wall.getUTCDay())
  );
  return fromBrisbaneWallClock(startWall);
}

/** The instant that is the 1st of the month at 00:00 Brisbane time, for the month containing `date`. */
export function startOfBrisbaneMonth(date: Date): Date {
  const wall = toBrisbaneWallClock(date);
  const startWall = new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), 1));
  return fromBrisbaneWallClock(startWall);
}
