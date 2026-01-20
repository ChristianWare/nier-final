export type NotificationEvent =
  | "BOOKING_REQUESTED"
  | "PAYMENT_LINK_SENT"
  | "PAYMENT_RECEIVED"
  | "DRIVER_ASSIGNED"
  | "DRIVER_EN_ROUTE"
  | "DRIVER_ARRIVED"
  | "DRIVER_PICKED_UP"
  | "TRIP_COMPLETED"
  | "BOOKING_CANCELLED";

export const EVENT_META: Record<
  NotificationEvent,
  { label: string; group: "Bookings" | "Payments" | "Driver & Trip" }
> = {
  BOOKING_REQUESTED: { label: "New booking request", group: "Bookings" },
  BOOKING_CANCELLED: { label: "Booking cancelled", group: "Bookings" },

  PAYMENT_LINK_SENT: {
    label: "Payment link sent to client",
    group: "Payments",
  },
  PAYMENT_RECEIVED: { label: "Client payment received", group: "Payments" },

  DRIVER_ASSIGNED: { label: "Driver assigned", group: "Driver & Trip" },
  DRIVER_EN_ROUTE: { label: "Driver en route", group: "Driver & Trip" },
  DRIVER_ARRIVED: { label: "Driver arrived", group: "Driver & Trip" },
  DRIVER_PICKED_UP: { label: "Client picked up", group: "Driver & Trip" },
  TRIP_COMPLETED: { label: "Trip completed", group: "Driver & Trip" },
};

export const DEFAULT_EMAIL_EVENTS: NotificationEvent[] = [
  "BOOKING_REQUESTED",
  "PAYMENT_RECEIVED",
  "DRIVER_PICKED_UP",
];

export const DEFAULT_SMS_EVENTS: NotificationEvent[] = [
  // Start conservative; admin can enable more
  "BOOKING_REQUESTED",
  "PAYMENT_RECEIVED",
];
