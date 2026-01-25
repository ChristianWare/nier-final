import { NotificationEvent } from "./events";
import { formatPhoenixDateTime, safeOneLine } from "./format";

export function buildAdminNotification(args: {
  event: NotificationEvent;
  appUrl: string;
  booking: {
    id: string;
    pickupAt: Date;
    pickupAddress: string;
    dropoffAddress: string;
    serviceName: string;
    customerName: string;
  };
}) {
  const { event, appUrl, booking } = args;

  const when = formatPhoenixDateTime(new Date(booking.pickupAt));
  const pickup = safeOneLine(booking.pickupAddress);
  const dropoff = safeOneLine(booking.dropoffAddress);
  const svc = safeOneLine(booking.serviceName);
  const name = safeOneLine(booking.customerName);

  const adminUrl = `${appUrl}/admin/bookings/${encodeURIComponent(booking.id)}`;

  const baseLine = `${when} • ${svc}`;
  const routeLine = `${pickup} → ${dropoff}`;

  const subjectMap: Record<NotificationEvent, string> = {
    BOOKING_REQUESTED: `New booking request • ${baseLine}`,
    BOOKING_DECLINED: `Booking declined • ${baseLine}`,
    PAYMENT_LINK_SENT: `Payment link sent • ${baseLine}`,
    PAYMENT_RECEIVED: `Payment received • ${baseLine}`,
    DRIVER_ASSIGNED: `Driver assigned • ${baseLine}`,
    DRIVER_EN_ROUTE: `Driver en route • ${baseLine}`,
    DRIVER_ARRIVED: `Driver arrived • ${baseLine}`,
    DRIVER_PICKED_UP: `Client picked up • ${baseLine}`,
    TRIP_COMPLETED: `Trip completed • ${baseLine}`,
    BOOKING_CANCELLED: `Booking cancelled • ${baseLine}`,
  };

  const titleMap: Record<NotificationEvent, string> = {
    BOOKING_REQUESTED: "New booking request",
    BOOKING_DECLINED: "Booking declined",
    PAYMENT_LINK_SENT: "Payment link sent",
    PAYMENT_RECEIVED: "Payment received",
    DRIVER_ASSIGNED: "Driver assigned",
    DRIVER_EN_ROUTE: "Driver en route",
    DRIVER_ARRIVED: "Driver arrived",
    DRIVER_PICKED_UP: "Client picked up",
    TRIP_COMPLETED: "Trip completed",
    BOOKING_CANCELLED: "Booking cancelled",
  };

  // Email body (plain text v1)
  const emailBody = [
    `${titleMap[event]}`,
    "",
    `Booking: ${booking.id}`,
    `Customer: ${name || "—"}`,
    `When: ${when}`,
    `Service: ${svc}`,
    `Route: ${routeLine}`,
    "",
    `Open: ${adminUrl}`,
  ].join("\n");

  // SMS body (short)
  const smsBody = [
    `${titleMap[event]} — ${when}`,
    `${svc}`,
    `${pickup} → ${dropoff}`,
    `Admin: ${adminUrl}`,
  ].join("\n");

  return {
    subject: subjectMap[event],
    emailBody,
    smsBody,
  };
}
