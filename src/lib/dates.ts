// src/lib/billing/dates.ts
import { fromZonedTime } from "date-fns-tz";

/**
 * Returns a UNIX timestamp (seconds) for 00:00:00 on the first of
 * next month in America/Phoenix – unless that is < 48h away,
 * in which case it returns the first of the following month.
 */
export function firstCompliantAnchorPhoenixUnix(
  minSeconds = 2 * 24 * 60 * 60
): number {
  const tz = "America/Phoenix";
  const now = new Date();
  const nowSec = Math.floor(Date.now() / 1000);

  const anchorFor = (monthOffset: number) => {
    // Wall time in Phoenix for the 1st at midnight
    const wall = new Date(
      now.getFullYear(),
      now.getMonth() + monthOffset,
      1,
      0,
      0,
      0,
      0
    );
    const utc = fromZonedTime(wall, tz); // convert that wall time to the true UTC instant
    return Math.floor(utc.getTime() / 1000);
  };

  let anchor = anchorFor(1); // first of next month
  if (anchor - nowSec < minSeconds) {
    anchor = anchorFor(2); // first of the following month
  }

  // Extra guard (shouldn't hit, but just in case clock skew):
  if (anchor - nowSec < minSeconds) {
    anchor = nowSec + minSeconds + 60;
  }
  return anchor;
}
