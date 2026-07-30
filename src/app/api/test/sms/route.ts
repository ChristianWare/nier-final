import { NextResponse } from "next/server";
import { sendAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";

export async function GET() {
  const result = await sendAdminNotificationsForBookingEvent({
    event: "BOOKING_REQUESTED",
    bookingId: "cmohr16q0000ql504osj4hveh",
  });
  return NextResponse.json(result);
}
