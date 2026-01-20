const PHX_TZ = "America/Phoenix";

export function formatPhoenixDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
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
