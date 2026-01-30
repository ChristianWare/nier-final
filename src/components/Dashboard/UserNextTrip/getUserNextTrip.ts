import { db } from "@/lib/db";
import type { UserNextTripData } from "./UserNextTrip";

/**
 * Get the user's next upcoming trip
 * Returns the soonest trip that is:
 * - Owned by the user
 * - In an active status (not cancelled, completed, etc.)
 * - Pickup time is in the future or within the last 2 hours (for in-progress trips)
 */
export async function getUserNextTrip(
  userId: string,
): Promise<UserNextTripData | null> {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const booking = await db.booking.findFirst({
    where: {
      userId,
      status: {
        in: [
          "PENDING_REVIEW",
          "PENDING_PAYMENT",
          "CONFIRMED",
          "ASSIGNED",
          "EN_ROUTE",
          "ARRIVED",
          "IN_PROGRESS",
        ],
      },
      pickupAt: {
        gte: twoHoursAgo,
      },
    },
    orderBy: {
      pickupAt: "asc",
    },
    include: {
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      payment: {
        select: {
          status: true,
          checkoutUrl: true,
        },
      },
      assignment: {
        include: {
          driver: {
            select: {
              name: true,
              phone: true,
            },
          },
          vehicleUnit: {
            select: {
              name: true,
              plate: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return null;
  }

  const isPaid = booking.payment?.status === "PAID";
  const driverName = booking.assignment?.driver?.name ?? null;
  const driverPhone = booking.assignment?.driver?.phone ?? null;

  // Use vehicle unit name if assigned, otherwise fall back to category name
  const vehicleName = booking.assignment?.vehicleUnit
    ? `${booking.assignment.vehicleUnit.name}${booking.assignment.vehicleUnit.plate ? ` (${booking.assignment.vehicleUnit.plate})` : ""}`
    : (booking.vehicle?.name ?? null);

  return {
    id: booking.id,
    status: booking.status,
    pickupAtIso: booking.pickupAt.toISOString(),
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    serviceName: booking.serviceType?.name ?? "Transportation",
    vehicleName,
    driverName,
    driverPhone,
    totalCents: booking.totalCents,
    currency: booking.currency,
    passengers: booking.passengers,
    luggage: booking.luggage,
    specialRequests: booking.specialRequests,
    isPaid,
    checkoutUrl: booking.payment?.checkoutUrl ?? null,
  };
}
