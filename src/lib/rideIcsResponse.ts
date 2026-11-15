// The .ics download behind "Add to calendar", for the customer's trip
// routes (/dashboard/trips/[id]/calendar) and the corporate ones
// (/corporate/bookings/[id]/calendar). Each route decides who may see the
// ride; this builds the file.

import { db } from "@/lib/db";
import { buildIcs } from "@/lib/calendar";
import { rideCalendarEvent } from "@/components/Dashboard/AddToCalendar/rideEvent";
import { getCompanySettings } from "../../actions/admin/companySettings";
import { SITE } from "@/config/site";

type Owner = { userId: string | null; corporateAccountId: string | null };

export async function rideIcsResponse(
  bookingId: string,
  canView: (owner: Owner) => boolean,
  /** Where "open this ride" in the event points. */
  ridePath: (id: string) => string,
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      corporateAccountId: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      durationMinutes: true,
      hoursRequested: true,
      flightAirline: true,
      flightNumber: true,
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
    },
  });
  if (!booking || !canView(booking)) {
    return new Response("Not found", { status: 404 });
  }

  const settings = await getCompanySettings();
  const companyName = settings.companyName || SITE.name;
  const event = rideCalendarEvent(
    {
      id: booking.id,
      pickupAt: booking.pickupAt,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      serviceName: booking.serviceType?.name ?? "Ride",
      vehicleName: booking.vehicle?.name ?? null,
      durationMinutes: booking.durationMinutes,
      hoursRequested: booking.hoursRequested,
      flight: booking.flightNumber
        ? [booking.flightAirline, booking.flightNumber]
            .filter(Boolean)
            .join(" ")
        : null,
    },
    { name: companyName, dispatchPhone: settings.dispatchPhone },
  );
  event.url = `${SITE.url.replace(/\/$/, "")}${ridePath(booking.id)}`;

  const code = booking.id.slice(0, 8).toUpperCase();
  return new Response(buildIcs(event, companyName), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="ride-${code}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
