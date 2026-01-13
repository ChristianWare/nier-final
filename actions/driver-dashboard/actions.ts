/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { auth } from "../../auth";
import { db } from "@/lib/db";

type AppRole = "USER" | "ADMIN" | "DRIVER";

const DRIVER_ALLOWED: BookingStatus[] = [
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  // Optional (enable if you want drivers to mark it):
  // BookingStatus.NO_SHOW,
];

const TERMINAL: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.PARTIALLY_REFUNDED,
  BookingStatus.NO_SHOW,
];

function normalizeRoles(roles: any): AppRole[] {
  return Array.isArray(roles) && roles.length > 0
    ? (roles as AppRole[])
    : (["USER"] as AppRole[]);
}

export async function updateDriverBookingStatus(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const roles = normalizeRoles((session.user as any)?.roles);
  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");
  if (!isAdmin && !isDriver) throw new Error("Not authorized");

  const bookingId = String(formData.get("bookingId") ?? "").trim();
  const nextStatusRaw = String(formData.get("nextStatus") ?? "").trim();
  if (!bookingId) throw new Error("Missing bookingId");

  const nextStatus = nextStatusRaw as BookingStatus;
  if (!DRIVER_ALLOWED.includes(nextStatus)) throw new Error("Invalid status");

  const actorId =
    ((session.user as any)?.id as string | undefined) ??
    ((session.user as any)?.userId as string | undefined) ??
    null;

  // Driver can only update bookings assigned to them (and not terminal)
  if (isDriver && !isAdmin) {
    if (!actorId) throw new Error("Missing userId");

    const res = await db.booking.updateMany({
      where: {
        id: bookingId,
        status: { notIn: TERMINAL },
        assignment: { driverId: actorId },
      },
      data: { status: nextStatus },
    });

    if (res.count === 0) {
      throw new Error("Booking not found or not assigned to you");
    }
  } else {
    await db.booking.update({
      where: { id: bookingId },
      data: { status: nextStatus },
    });
  }

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
