export type NotificationEvent =
  | "BOOKING_REQUESTED"
  | "BOOKING_DECLINED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_LINK_SENT"
  | "PAYMENT_RECEIVED"
  | "DRIVER_ASSIGNED"
  | "DRIVER_EN_ROUTE"
  | "DRIVER_ARRIVED"
  | "DRIVER_PICKED_UP"
  | "TRIP_COMPLETED"
  | "NO_SHOW"
  | "REFUND_ISSUED";

export const EVENT_META: Record<
  NotificationEvent,
  { label: string; group: "Bookings" | "Payments" | "Driver & Trip" }
> = {
  BOOKING_REQUESTED: { label: "New booking request", group: "Bookings" },
  BOOKING_DECLINED: { label: "Booking declined", group: "Bookings" },
  BOOKING_CANCELLED: { label: "Booking cancelled", group: "Bookings" },
  NO_SHOW: { label: "Passenger no-show", group: "Bookings" },

  PAYMENT_LINK_SENT: {
    label: "Payment link sent to client",
    group: "Payments",
  },
  PAYMENT_RECEIVED: { label: "Client payment received", group: "Payments" },
  REFUND_ISSUED: { label: "Refund issued", group: "Payments" },

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
  "NO_SHOW",
];

export const DEFAULT_SMS_EVENTS: NotificationEvent[] = [
  "BOOKING_REQUESTED",
  "PAYMENT_RECEIVED",
];
