/** "in 3 hours", "in 12 min", "2 days ago": how far a time is from now. */
export function relativeFromNow(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const mins = Math.round(absMs / 60_000);
  const hours = Math.round(absMs / 3_600_000);
  const days = Math.round(absMs / 86_400_000);
  const span =
    mins < 60
      ? `${mins} min`
      : hours < 24
        ? `${hours} hour${hours === 1 ? "" : "s"}`
        : `${days} day${days === 1 ? "" : "s"}`;
  return diffMs >= 0 ? `in ${span}` : `${span} ago`;
}
