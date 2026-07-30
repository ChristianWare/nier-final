import { NextResponse } from "next/server";
import { sendAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";

export async function GET() {
  const result = await sendAdminNotificationsForBookingEvent({
    event: "BOOKING_REQUESTED",
    bookingId: "cmqgooay80001jv04i8azeuvi",
  });
  return NextResponse.json(result);
}
