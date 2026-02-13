export function formatPhoenixDateTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function safeOneLine(s: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}
