/**
 * "Add to calendar" for a ride: an .ics file (Apple Calendar, Outlook and
 * most phones open it) and a Google Calendar link, built from the same
 * event.
 */

export type CalendarEvent = {
  /** Stable id, so adding the same ride twice updates it. */
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location?: string | null;
  description?: string | null;
  /** A page to open the ride on. */
  url?: string | null;
};

/** 20261115T032500Z */
function icsDate(d: Date) {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Commas, semicolons, backslashes and line breaks escaped, per RFC 5545. */
function icsText(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Long lines continue on the next line, indented (RFC 5545 folding). */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(e: CalendarEvent, productName: string) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${icsText(productName)}//Rides//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(e.start)}`,
    `DTEND:${icsDate(e.end)}`,
    `SUMMARY:${icsText(e.title)}`,
    e.location ? `LOCATION:${icsText(e.location)}` : null,
    e.description ? `DESCRIPTION:${icsText(e.description)}` : null,
    e.url ? `URL:${e.url}` : null,
    // A reminder an hour before pickup.
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(e.title)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => Boolean(l));
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(e: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${icsDate(e.start)}/${icsDate(e.end)}`,
  });
  if (e.location) params.set("location", e.location);
  const details = [e.description, e.url].filter(Boolean).join("\n\n");
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** How long a ride holds the calendar: its drive time, its hours, or an hour. */
export function rideEnd(
  start: Date,
  ride: { durationMinutes?: number | null; hoursRequested?: number | null },
) {
  const minutes =
    ride.hoursRequested && ride.hoursRequested > 0
      ? ride.hoursRequested * 60
      : ride.durationMinutes && ride.durationMinutes > 0
        ? ride.durationMinutes
        : 60;
  return new Date(start.getTime() + minutes * 60 * 1000);
}
