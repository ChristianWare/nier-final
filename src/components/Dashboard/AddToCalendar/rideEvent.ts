// A ride as a calendar event, for "Add to calendar": the .ics download
// (/dashboard/trips/[id]/calendar) and the Google Calendar link build it
// the same way.

import { rideEnd, type CalendarEvent } from "@/lib/calendar";

export type RideForCalendar = {
  id: string;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  serviceName: string;
  vehicleName?: string | null;
  durationMinutes?: number | null;
  hoursRequested?: number | null;
  flight?: string | null;
};

export function rideCalendarEvent(
  ride: RideForCalendar,
  company: { name: string; dispatchPhone?: string | null; siteUrl?: string },
): CalendarEvent {
  const code = ride.id.slice(0, 8).toUpperCase();
  const description = [
    `Pickup: ${ride.pickupAddress}`,
    `Drop-off: ${ride.dropoffAddress}`,
    ride.vehicleName ? `Vehicle: ${ride.vehicleName}` : null,
    ride.flight ? `Flight: ${ride.flight}` : null,
    `Confirmation #${code}`,
    company.dispatchPhone
      ? `Questions? Call dispatch: ${company.dispatchPhone}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    uid: `ride-${ride.id}@${company.name.replace(/\s+/g, "-").toLowerCase()}`,
    title: `${company.name}: ${ride.serviceName}`,
    start: ride.pickupAt,
    end: rideEnd(ride.pickupAt, ride),
    location: ride.pickupAddress,
    description,
    url: company.siteUrl
      ? `${company.siteUrl.replace(/\/$/, "")}/dashboard/trips/${ride.id}`
      : null,
  };
}
