import { db } from "@/lib/db";

export async function getTripGroupForBooking(bookingId: string) {
  // First check if this booking belongs to a trip group
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { tripGroupId: true },
  });

  if (!booking?.tripGroupId) return null;

  // Fetch the trip group and all sibling bookings
  const tripGroup = await db.tripGroup.findUnique({
    where: { id: booking.tripGroupId },
    select: {
      id: true,
      label: true,
      legCount: true,
      totalCents: true,
      paymentStatus: true,
      paidAt: true,
      bookings: {
        select: {
          id: true,
          pickupAt: true,
          pickupAddress: true,
          dropoffAddress: true,
          status: true,
          totalCents: true,
          priceApproved: true,
          serviceType: { select: { name: true } },
          assignment: {
            select: {
              driver: { select: { name: true } },
            },
          },
        },
        orderBy: { pickupAt: "asc" },
      },
    },
  });

  if (!tripGroup) return null;

  return {
    tripGroup: {
      id: tripGroup.id,
      label: tripGroup.label,
      legCount: tripGroup.legCount,
      totalCents: tripGroup.totalCents,
      paymentStatus: tripGroup.paymentStatus,
      paidAt: tripGroup.paidAt,
    },
    siblings: tripGroup.bookings.map((b) => ({
      id: b.id,
      pickupAt: b.pickupAt,
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      status: b.status,
      totalCents: b.totalCents,
      priceApproved: b.priceApproved,
      serviceName: b.serviceType.name,
      driverName: b.assignment?.driver?.name ?? null,
    })),
  };
}
