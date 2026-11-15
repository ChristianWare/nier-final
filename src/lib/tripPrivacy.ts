/**
 * Passenger privacy on the driver dashboard.
 *
 * While a ride is on, the driver sees everything they need: the passenger's
 * full name and phone, the exact addresses and any special requests. As soon
 * as it's over (completed, cancelled, no-show or refunded) the driver keeps
 * what they need for pay, mileage and disputes, and loses where the
 * passenger lives and how to reach them:
 *
 *   - Addresses: a named place keeps its name and area
 *     ("Red Rock Casino Resort & Spa, Las Vegas, NV 89135"); any other
 *     address, likely a home, shows only the area ("Las Vegas, NV 89135").
 *   - Passenger: first name and last initial ("Kevin T.").
 *   - Phone and special requests: removed. Dispatch handles lost items.
 *
 * Admins see everything. The redaction happens on the server, so the hidden
 * details never reach the driver's phone.
 */

import { formatAddressLines } from "@/lib/formatAddress";

/** The statuses after which a ride is over. */
export const FINISHED_TRIP_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

/** Whether the private details of a ride are hidden from this viewer. */
export function isTripPrivate(status: string, viewerIsAdmin = false) {
  if (viewerIsAdmin) return false;
  return (FINISHED_TRIP_STATUSES as readonly string[]).includes(status);
}

/** "Las Vegas, NV 89135" */
const CITY_LINE = /^[^,]+,\s*[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/;

/** The address with the street taken out, as one line. */
export function privateAddress(address: string | null | undefined): string {
  const lines = formatAddressLines(address);
  if (lines.length === 0) return "";

  const cityLine = lines[lines.length - 1];
  if (!CITY_LINE.test(cityLine)) return "Address hidden";
  if (lines.length === 1) return cityLine;

  // A name comes before the street; with three lines the first is the name.
  // With two, the first is a name only if it isn't a street ("123 Main St").
  const first = lines[0];
  const hasName = lines.length >= 3 || !/^\d/.test(first);
  return hasName ? `${first}, ${cityLine}` : cityLine;
}

/** "Kevin Taylor" → "Kevin T."; a single name stays as it is. */
export function privateName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Passenger";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** What the driver sees in place of the phone number after a ride. */
export const PRIVATE_CONTACT_NOTE =
  "Need to reach this passenger? Contact dispatch.";
