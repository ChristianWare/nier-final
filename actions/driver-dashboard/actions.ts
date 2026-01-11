"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { auth } from "../../auth";
import { db } from "@/lib/db";

const DRIVER_ALLOWED: BookingStatus[] = [
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

const TERMINAL: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.PARTIALLY_REFUNDED,
  BookingStatus.NO_SHOW,
];

function hasAnyRole(roles: unknown, allowed: string[]) {
  if (!Array.isArray(roles)) return false;
  return roles.some((r) => allowed.includes(String(r)));
}

export async function updateDriverBookingStatus(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const roles = session.user?.roles;
  const isDriver = hasAnyRole(roles, ["DRIVER"]);
  const isAdmin = hasAnyRole(roles, ["ADMIN"]);

  if (!isDriver && !isAdmin) throw new Error("Not authorized");

  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const nextStatusRaw = String(formData.get("nextStatus") ?? "").trim();

  if (!bookingId) throw new Error("Missing bookingId");

  const nextStatus = nextStatusRaw as BookingStatus;
  if (!DRIVER_ALLOWED.includes(nextStatus)) throw new Error("Invalid status");

  const actorId = session.user?.id ?? session.user?.userId;
  if (!actorId) throw new Error("Missing user id");

  // Driver can only update bookings assigned to them.
  if (isDriver && !isAdmin) {
    const driverId = actorId;

    const res = await db.booking.updateMany({
      where: {
        id: bookingId,
        status: { notIn: TERMINAL },
        assignment: { driverId },
      },
      data: { status: nextStatus },
    });

    if (res.count === 0) {
      throw new Error("Booking not found or not assigned to you");
    }
  } else {
    // Admin can update regardless of driver
    await db.booking.update({
      where: { id: bookingId },
      data: { status: nextStatus },
    });
  }

  // Log status change
  await db.bookingStatusEvent.create({
    data: {
      bookingId,
      status: nextStatus,
      createdById: actorId,
    },
  });

  revalidatePath("/driver-dashboard");
  revalidatePath("/driver-dashboard/trips");
  revalidatePath(`/driver-dashboard/trips/${bookingId}`);
}
