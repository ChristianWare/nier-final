// src/lib/booking/statusBadge.ts — date and status display for ride tables.

import type { BookingStatus } from "@prisma/client";

/** 10/01/2026 */
export function formatMdy(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

/** 9:00 AM */
export function formatClock(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** Badge colors: payment due is red, pending review yellow, and so on. */
export function statusTone(
  status: BookingStatus,
): "bad" | "warn" | "good" | "purple" | "accent" | "neutral" {
  switch (status) {
    case "PENDING_PAYMENT":
      return "bad";
    case "PENDING_REVIEW":
      return "warn";
    case "CONFIRMED":
      return "good";
    case "ASSIGNED":
      return "purple";
    case "EN_ROUTE":
    case "ARRIVED":
    case "IN_PROGRESS":
      return "accent";
    default:
      return "neutral";
  }
}
