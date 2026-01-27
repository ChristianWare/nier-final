/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { BookingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { sendCustomerTripNotification } from "@/lib/notifications/customerNotifications";

// Valid status transitions for drivers
const VALID_FORWARD_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.ASSIGNED]: [BookingStatus.EN_ROUTE],
  [BookingStatus.EN_ROUTE]: [BookingStatus.ARRIVED],
  [BookingStatus.ARRIVED]: [BookingStatus.IN_PROGRESS, BookingStatus.NO_SHOW],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
  // Terminal states - no forward transitions
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.NO_SHOW]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.REFUNDED]: [],
  [BookingStatus.PARTIALLY_REFUNDED]: [],
  // Non-driver states
  [BookingStatus.PENDING_REVIEW]: [],
  [BookingStatus.PENDING_PAYMENT]: [],
  [BookingStatus.CONFIRMED]: [BookingStatus.ASSIGNED], // Admin assigns, then driver can proceed
  [BookingStatus.DECLINED]: [],
  [BookingStatus.DRAFT]: [],
};

// Valid backward transitions (require reason)
const VALID_BACKWARD_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.EN_ROUTE]: [BookingStatus.ASSIGNED],
  [BookingStatus.ARRIVED]: [BookingStatus.EN_ROUTE],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.ARRIVED],
  // Can't go back from terminal states
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.NO_SHOW]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.ASSIGNED]: [],
  [BookingStatus.REFUNDED]: [],
  [BookingStatus.PARTIALLY_REFUNDED]: [],
  [BookingStatus.PENDING_REVIEW]: [],
  [BookingStatus.PENDING_PAYMENT]: [],
  [BookingStatus.CONFIRMED]: [],
  [BookingStatus.DECLINED]: [],
  [BookingStatus.DRAFT]: [],
};

// Minimum wait time at pickup before allowing NO_SHOW (in minutes)
const NO_SHOW_WAIT_MINUTES = 15;

type UpdateTripStatusInput = {
  bookingId: string;
  newStatus: BookingStatus;
  reason?: string; // Required for backward transitions and NO_SHOW
};

export async function driverUpdateTripStatus(input: UpdateTripStatusInput) {
  const session = await auth();

  if (!session?.user) {
    return { error: "Not authenticated." };
  }

  const roles = (session.user as any)?.roles as string[] | undefined;
  const isDriver = Array.isArray(roles) && roles.includes("DRIVER");
  const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");

  if (!isDriver && !isAdmin) {
    return { error: "You don't have permission to update trip status." };
  }

  const userId = session.user.id ?? (session.user as any).userId;
  if (!userId) {
    return { error: "Could not determine user ID." };
  }

  const { bookingId, newStatus, reason } = input;

  if (!bookingId) {
    return { error: "Missing booking ID." };
  }

  if (!newStatus) {
    return { error: "Missing new status." };
  }

  // Fetch booking with assignment
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      assignment: true,
      user: { select: { name: true, email: true, phone: true } },
      statusEvents: {
        where: { status: BookingStatus.ARRIVED },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!booking) {
    return { error: "Booking not found." };
  }

  // Verify driver is assigned to this booking (unless admin)
  if (!isAdmin) {
    if (!booking.assignment || booking.assignment.driverId !== userId) {
      return { error: "You are not assigned to this trip." };
    }
  }

  const currentStatus = booking.status as BookingStatus;

  // Check if this is a forward or backward transition
  const isForward =
    VALID_FORWARD_TRANSITIONS[currentStatus]?.includes(newStatus);
  const isBackward =
    VALID_BACKWARD_TRANSITIONS[currentStatus]?.includes(newStatus);

  if (!isForward && !isBackward) {
    return {
      error: `Cannot change status from "${currentStatus}" to "${newStatus}".`,
    };
  }

  // Backward transitions require a reason
  if (isBackward && !reason?.trim()) {
    return { error: "Please provide a reason for going back." };
  }

  // NO_SHOW requires waiting at least 15 minutes after ARRIVED
  if (newStatus === BookingStatus.NO_SHOW) {
    if (!reason?.trim()) {
      return { error: "Please provide a reason for marking no-show." };
    }

    const arrivedEvent = booking.statusEvents[0];
    if (!arrivedEvent) {
      return { error: "You must arrive at the pickup location first." };
    }

    const arrivedAt = new Date(arrivedEvent.createdAt);
    const now = new Date();
    const waitedMinutes = (now.getTime() - arrivedAt.getTime()) / (1000 * 60);

    if (waitedMinutes < NO_SHOW_WAIT_MINUTES) {
      const remainingMinutes = Math.ceil(NO_SHOW_WAIT_MINUTES - waitedMinutes);
      return {
        error: `Please wait ${remainingMinutes} more minute${remainingMinutes === 1 ? "" : "s"} before marking as no-show.`,
      };
    }
  }

  // Update the booking status
  try {
    await db.$transaction(async (tx) => {
      // Update booking status
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: newStatus },
      });

      // Create status event
      await tx.bookingStatusEvent.create({
        data: {
          bookingId,
          status: newStatus,
          eventType: isBackward ? "STATUS_REVERTED" : "STATUS_CHANGE",
          createdById: userId,
          metadata: {
            previousStatus: currentStatus,
            reason: reason?.trim() || null,
            isBackward,
            updatedByDriver: true,
          },
        },
      });
    });

    // Send customer notification (non-blocking)
    const customerPhone = booking.user?.phone || booking.guestPhone;
    const customerName =
      booking.user?.name?.trim() || booking.guestName?.trim() || "Customer";

    if (customerPhone) {
      // Fire and forget - don't block the response
      sendCustomerTripNotification({
        status: newStatus,
        customerPhone,
        customerName,
        pickupAddress: booking.pickupAddress,
        driverName: session.user.name || "Your driver",
      }).catch((err) => {
        console.error("Failed to send customer notification:", err);
      });
    }

    revalidatePath(`/driver-dashboard/trips/${bookingId}`);
    revalidatePath(`/driver-dashboard`);
    revalidatePath(`/admin/bookings/${bookingId}`);

    return { ok: true, newStatus };
  } catch (e: any) {
    console.error("Failed to update trip status:", e);
    return { error: e?.message ?? "Failed to update trip status." };
  }
}

// Helper to get next available status for a booking
export async function getAvailableStatusTransitions(bookingId: string) {
  const session = await auth();

  if (!session?.user) {
    return { forward: [], backward: [], current: null };
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      status: true,
      statusEvents: {
        where: { status: BookingStatus.ARRIVED },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!booking) {
    return { forward: [], backward: [], current: null };
  }

  const currentStatus = booking.status as BookingStatus;
  const forward = VALID_FORWARD_TRANSITIONS[currentStatus] || [];
  const backward = VALID_BACKWARD_TRANSITIONS[currentStatus] || [];

  // Check if NO_SHOW is allowed (15 min wait)
  let canMarkNoShow = false;
  if (forward.includes(BookingStatus.NO_SHOW)) {
    const arrivedEvent = booking.statusEvents[0];
    if (arrivedEvent) {
      const arrivedAt = new Date(arrivedEvent.createdAt);
      const now = new Date();
      const waitedMinutes = (now.getTime() - arrivedAt.getTime()) / (1000 * 60);
      canMarkNoShow = waitedMinutes >= NO_SHOW_WAIT_MINUTES;
    }
  }

  return {
    current: currentStatus,
    forward,
    backward,
    canMarkNoShow,
  };
}
