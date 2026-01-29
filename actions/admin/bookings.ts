/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { stripe } from "@/lib/stripe";
import { sendPaymentLinkEmail } from "@/lib/email/sendPaymentLink";
import { queueAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";
import { revalidatePath } from "next/cache";
import { BookingStatus } from "@prisma/client";
import { sendBookingDeclinedEmail } from "@/lib/email/sendBookingDeclinedEmail";


type AppRole = "USER" | "ADMIN" | "DRIVER";

function getActorId(session: any) {
  return (
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined)
  );
}

function getSessionRoles(session: any): AppRole[] {
  const roles = session?.user?.roles;
  return Array.isArray(roles) && roles.length > 0 ? (roles as AppRole[]) : [];
}

async function requireAdmin() {
  const session = await auth();
  const roles = getSessionRoles(session);
  const actorId = getActorId(session);

  if (!session?.user || !actorId || !roles.includes("ADMIN")) {
    throw new Error("Unauthorized");
  }

  return { session, actorId, roles };
}

function errMsg(e: any) {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && typeof e.message === "string") return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

const ApprovePricingSchema = z.object({
  bookingId: z.string().min(1),
  currency: z.string().default("usd"),
  subtotalCents: z.coerce.number().int().min(0),
  feesCents: z.coerce.number().int().min(0),
  taxesCents: z.coerce.number().int().min(0),
  totalCents: z.coerce.number().int().min(0),
});

export async function approveBookingAndSetPrice(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = ApprovePricingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid pricing data." };

  const d = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: d.bookingId },
    include: { user: true, payment: true },
  });
  if (!booking) return { error: "Booking not found." };

  const existingPayment = booking.payment;
  const amountPaidCents = existingPayment?.amountPaidCents ?? 0;
  const isPaid = existingPayment?.status === "PAID";

  let newStatus = booking.status;

  if (
    !isPaid &&
    booking.status !== "CANCELLED" &&
    booking.status !== "NO_SHOW"
  ) {
    newStatus = "PENDING_PAYMENT";
  }

  const hasBalanceDue = isPaid && d.totalCents > amountPaidCents;

  const priceChanged =
    booking.subtotalCents !== d.subtotalCents ||
    booking.feesCents !== d.feesCents ||
    booking.taxesCents !== d.taxesCents ||
    booking.totalCents !== d.totalCents;

  const tx: any[] = [
    db.booking.update({
      where: { id: booking.id },
      data: {
        currency: d.currency,
        subtotalCents: d.subtotalCents,
        feesCents: d.feesCents,
        taxesCents: d.taxesCents,
        totalCents: d.totalCents,
        status: newStatus,
        declineReason: null,
      },
    }),
  ];

  if (newStatus !== booking.status) {
    tx.push(
      db.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          status: newStatus,
          eventType: "APPROVAL_CHANGED",
          metadata: {
            approved: true,
            previousStatus: booking.status,
            newStatus: newStatus,
          },
          createdById: actorId,
        },
      }),
    );
  }

  if (priceChanged) {
    tx.push(
      db.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          status: newStatus,
          eventType: "PRICE_ADJUSTED",
          metadata: {
            oldSubtotalCents: booking.subtotalCents,
            newSubtotalCents: d.subtotalCents,
            oldFeesCents: booking.feesCents,
            newFeesCents: d.feesCents,
            oldTaxesCents: booking.taxesCents,
            newTaxesCents: d.taxesCents,
            oldTotalCents: booking.totalCents,
            newTotalCents: d.totalCents,
            currency: d.currency,
          },
          createdById: actorId,
        },
      }),
    );
  }

  if (hasBalanceDue && existingPayment) {
    tx.push(
      db.payment.update({
        where: { id: existingPayment.id },
        data: {
          amountTotalCents: d.totalCents,
        },
      }),
    );
  }

  await db.$transaction(tx);

  revalidatePath(`/admin/bookings/${booking.id}`);

  return {
    success: true,
    hasBalanceDue,
    balanceDueCents: hasBalanceDue ? d.totalCents - amountPaidCents : 0,
  };
}

// =============================================================================
// ✅ Approve Booking Only (no pricing change)
// =============================================================================

const ApproveBookingSchema = z.object({
  bookingId: z.string().min(1),
});

export async function approveBooking(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = ApproveBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid booking data." };

  const { bookingId } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });

  if (!booking) return { error: "Booking not found." };

  const canApproveFrom: BookingStatus[] = [
    "PENDING_REVIEW",
    "DRAFT",
    "DECLINED",
  ];
  if (!canApproveFrom.includes(booking.status)) {
    return {
      error: `Cannot approve a booking with status "${booking.status}". Booking must be pending review, draft, or declined.`,
    };
  }

  const previousStatus = booking.status;

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: {
        status: "PENDING_PAYMENT",
        declineReason: null,
      },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status: "PENDING_PAYMENT",
        eventType: "APPROVAL_CHANGED",
        metadata: {
          approved: true,
          previousStatus,
          newStatus: "PENDING_PAYMENT",
        },
        createdById: actorId,
      },
    }),
  ]);

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");

  return { success: true };
}

// =============================================================================
// ✅ Unapprove Booking (revert to PENDING_REVIEW)
// =============================================================================

export async function unapproveBooking(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = ApproveBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid booking data." };

  const { bookingId } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) return { error: "Booking not found." };

  if (booking.payment?.status === "PAID") {
    return { error: "Cannot unapprove a booking that has already been paid." };
  }

  if (booking.status !== "PENDING_PAYMENT") {
    return {
      error: "Booking must be in 'Pending Payment' status to reverse approval.",
    };
  }

  const previousStatus = booking.status;

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status: "PENDING_REVIEW" },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status: "PENDING_REVIEW",
        eventType: "APPROVAL_CHANGED",
        metadata: {
          approved: false,
          previousStatus,
          newStatus: "PENDING_REVIEW",
        },
        createdById: actorId,
      },
    }),
  ]);

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");

  return { success: true };
}

// =============================================================================
// ✅ Decline Booking
// =============================================================================

const DeclineBookingSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().optional(),
});

export async function declineBooking(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = DeclineBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid booking data." };

  const { bookingId, reason } = parsed.data;
  const trimmedReason = reason?.trim() || null;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      user: true, // ✅ Include user for email
    },
  });

  if (!booking) return { error: "Booking not found." };

  if (booking.payment?.status === "PAID") {
    return { error: "Cannot decline a booking that has already been paid." };
  }

  const canDeclineFrom: BookingStatus[] = [
    "PENDING_REVIEW",
    "DRAFT",
    "PENDING_PAYMENT",
  ];
  if (!canDeclineFrom.includes(booking.status)) {
    return {
      error: `Cannot decline a booking with status "${booking.status}".`,
    };
  }

  const previousStatus = booking.status;

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: {
        status: "DECLINED",
        declineReason: trimmedReason,
      },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status: "DECLINED",
        eventType: "BOOKING_DECLINED",
        metadata: {
          previousStatus,
          reason: trimmedReason,
        },
        createdById: actorId,
      },
    }),
  ]);

  // ✅ Send admin notification
  await queueAdminNotificationsForBookingEvent({
    event: "BOOKING_DECLINED",
    bookingId,
  });

  // ✅ Send decline email to customer
  const customerEmail = (booking.user?.email ?? booking.guestEmail ?? "")
    .trim()
    .toLowerCase();
  const customerName = booking.user?.name ?? booking.guestName ?? null;

  if (customerEmail) {
    try {
      await sendBookingDeclinedEmail({
        to: customerEmail,
        name: customerName,
        pickupAtISO: booking.pickupAt.toISOString(),
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        bookingId: booking.id,
        declineReason: trimmedReason,
        // Optional: Add your contact info from CompanySettings if you have it
        // contactEmail: "support@niertransportation.com",
        // contactPhone: "(480) 555-1234",
      });
    } catch (e) {
      console.error("Failed to send booking declined email:", e);
      // Don't fail the whole operation if email fails
    }
  }

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");

  return { success: true };
}

// =============================================================================
// ✅ Reopen Declined Booking
// =============================================================================

export async function reopenBooking(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = ApproveBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid booking data." };

  const { bookingId } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });

  if (!booking) return { error: "Booking not found." };

  if (booking.status !== "DECLINED") {
    return {
      error: `Cannot reopen a booking with status "${booking.status}". Booking must be declined.`,
    };
  }

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: {
        status: "PENDING_REVIEW",
        declineReason: null,
      },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status: "PENDING_REVIEW",
        eventType: "STATUS_CHANGE",
        metadata: {
          action: "Booking reopened from declined",
          previousStatus: "DECLINED",
          newStatus: "PENDING_REVIEW",
        },
        createdById: actorId,
      },
    }),
  ]);

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");

  return { success: true };
}

// =============================================================================
// ✅ Update Booking Price Only (no status change)
// =============================================================================

const UpdatePriceSchema = z.object({
  bookingId: z.string().min(1),
  currency: z.string().default("usd"),
  subtotalCents: z.coerce.number().int().min(0),
  feesCents: z.coerce.number().int().min(0),
  taxesCents: z.coerce.number().int().min(0),
  totalCents: z.coerce.number().int().min(0),
});

export async function updateBookingPrice(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = UpdatePriceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid pricing data." };

  const d = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: d.bookingId },
    include: { payment: true },
  });

  if (!booking) return { error: "Booking not found." };

  const existingPayment = booking.payment;
  const amountPaidCents = existingPayment?.amountPaidCents ?? 0;
  const isPaid = existingPayment?.status === "PAID";

  const hasBalanceDue = isPaid && d.totalCents > amountPaidCents;
  const hasRefundDue = isPaid && d.totalCents < amountPaidCents;

  const priceChanged =
    booking.subtotalCents !== d.subtotalCents ||
    booking.feesCents !== d.feesCents ||
    booking.taxesCents !== d.taxesCents ||
    booking.totalCents !== d.totalCents;

  const tx: any[] = [
    db.booking.update({
      where: { id: booking.id },
      data: {
        currency: d.currency,
        subtotalCents: d.subtotalCents,
        feesCents: d.feesCents,
        taxesCents: d.taxesCents,
        totalCents: d.totalCents,
      },
    }),
  ];

  if (priceChanged) {
    tx.push(
      db.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          status: booking.status,
          eventType: "PRICE_ADJUSTED",
          metadata: {
            oldSubtotalCents: booking.subtotalCents,
            newSubtotalCents: d.subtotalCents,
            oldFeesCents: booking.feesCents,
            newFeesCents: d.feesCents,
            oldTaxesCents: booking.taxesCents,
            newTaxesCents: d.taxesCents,
            oldTotalCents: booking.totalCents,
            newTotalCents: d.totalCents,
            currency: d.currency,
          },
          createdById: actorId,
        },
      }),
    );
  }

  if ((hasBalanceDue || hasRefundDue) && existingPayment) {
    tx.push(
      db.payment.update({
        where: { id: existingPayment.id },
        data: {
          amountTotalCents: d.totalCents,
        },
      }),
    );
  }

  await db.$transaction(tx);

  revalidatePath(`/admin/bookings/${booking.id}`);

  return {
    success: true,
    hasBalanceDue,
    balanceDueCents: hasBalanceDue ? d.totalCents - amountPaidCents : 0,
    hasRefundDue,
    refundDueCents: hasRefundDue ? amountPaidCents - d.totalCents : 0,
  };
}

// =============================================================================
// ✅ Assign Booking
// =============================================================================

const AssignSchema = z.object({
  bookingId: z.string().min(1),
  driverId: z.string().min(1),
  vehicleUnitId: z.string().optional().nullable(),
  driverPaymentCents: z.coerce.number().int().min(0).optional().nullable(),
});

export async function assignBooking(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = AssignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    console.error("Assignment validation failed:", parsed.error);
    return { error: "Invalid assignment data." };
  }

  const { bookingId, driverId, vehicleUnitId, driverPaymentCents } =
    parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true, currency: true },
  });
  if (!booking) return { error: "Booking not found." };

  const driver = await db.user.findUnique({
    where: { id: driverId },
    select: { id: true, name: true, email: true },
  });
  if (!driver) return { error: "Driver not found." };

  let vehicleUnit = null;
  if (vehicleUnitId) {
    vehicleUnit = await db.vehicleUnit.findUnique({
      where: { id: vehicleUnitId },
      select: { id: true, name: true, plate: true },
    });
  }

  const nextStatus =
    booking.status === "COMPLETED" ||
    booking.status === "CANCELLED" ||
    booking.status === "NO_SHOW"
      ? booking.status
      : "ASSIGNED";

  await db.$transaction([
    db.assignment.upsert({
      where: { bookingId },
      update: {
        driverId,
        vehicleUnitId: vehicleUnitId || null,
        driverPaymentCents: driverPaymentCents ?? null,
        assignedById: actorId,
      },
      create: {
        bookingId,
        driverId,
        vehicleUnitId: vehicleUnitId || null,
        driverPaymentCents: driverPaymentCents ?? null,
        assignedById: actorId,
      },
    }),
    db.booking.update({
      where: { id: bookingId },
      data: { status: nextStatus },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status: nextStatus,
        eventType: "DRIVER_ASSIGNED",
        metadata: {
          driverId: driver.id,
          driverName: driver.name ?? "Driver",
          driverEmail: driver.email,
          driverPaymentCents: driverPaymentCents ?? null,
          vehicleUnitId: vehicleUnit?.id ?? null,
          vehicleUnitName: vehicleUnit?.name ?? null,
          vehicleUnitPlate: vehicleUnit?.plate ?? null,
        },
        createdById: actorId,
      },
    }),
  ]);

  await queueAdminNotificationsForBookingEvent({
    event: "DRIVER_ASSIGNED",
    bookingId,
  });

  revalidatePath(`/admin/bookings/${bookingId}`);

  return { success: true };
}

// =============================================================================
// ✅ Create Payment Link and Email - UPDATED FOR CUSTOM CHECKOUT
// =============================================================================

const SendPaymentSchema = z.object({
  bookingId: z.string().min(1),
  isBalancePayment: z.coerce.boolean().optional().default(false),
});

export async function createPaymentLinkAndEmail(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = SendPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };

  const { bookingId, isBalancePayment } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, serviceType: true, vehicle: true, payment: true },
  });
  if (!booking) return { error: "Booking not found." };

  const b = booking;

  // ✅ Block if booking is not approved
  if (
    b.status === "PENDING_REVIEW" ||
    b.status === "DRAFT" ||
    b.status === "DECLINED"
  ) {
    return { error: "Booking must be approved before sending a payment link." };
  }

  if (b.status === "CANCELLED" || b.status === "NO_SHOW") {
    return { error: "This booking is cancelled/no-show. Don't send payment." };
  }

  const recipientEmail = (b.user?.email ?? b.guestEmail ?? "")
    .trim()
    .toLowerCase();
  const recipientName = (b.user?.name ?? b.guestName ?? "").trim() || null;

  if (!recipientEmail) return { error: "Customer email missing." };

  if (!b.totalCents || b.totalCents <= 0) {
    return { error: "Set a total price before sending payment link." };
  }

  const amountPaidCents = b.payment?.amountPaidCents ?? 0;
  const amountToCharge = isBalancePayment
    ? b.totalCents - amountPaidCents
    : b.totalCents;

  if (amountToCharge <= 0) {
    return { error: "No balance due. The booking is fully paid." };
  }

  const APP_URL = process.env.APP_URL || "http://localhost:3000";

  // ✅ Custom checkout page URL (with tip selection + Stripe Elements)
  const customCheckoutUrl = `${APP_URL}/pay/${b.id}`;

  // ✅ Send email with custom checkout page URL
  try {
    await sendPaymentLinkEmail({
      to: recipientEmail,
      name: recipientName,
      pickupAtISO: b.pickupAt.toISOString(),
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      totalCents: isBalancePayment ? amountToCharge : b.totalCents,
      currency: b.currency,
      payUrl: customCheckoutUrl,
      bookingId: b.id,
    });
  } catch (e) {
    console.error("sendPaymentLinkEmail failed", e);
    return {
      error:
        "Failed to send the payment email. Please try again or send the link manually.",
      checkoutUrl: customCheckoutUrl,
      debug: errMsg(e),
    };
  }

  // ✅ Create or update payment record (PaymentIntent will be created when customer visits checkout)
  const tx: any[] = [];

  if (isBalancePayment && b.payment) {
    // Update existing payment record
    tx.push(
      db.payment.update({
        where: { id: b.payment.id },
        data: {
          checkoutUrl: customCheckoutUrl,
        },
      }),
    );
  } else {
    // Create or update payment record
    tx.push(
      db.payment.upsert({
        where: { bookingId: b.id },
        update: {
          status: "PENDING",
          amountSubtotalCents: b.subtotalCents,
          amountTotalCents: b.totalCents,
          currency: b.currency,
          checkoutUrl: customCheckoutUrl,
        },
        create: {
          bookingId: b.id,
          status: "PENDING",
          amountSubtotalCents: b.subtotalCents,
          amountTotalCents: b.totalCents,
          amountPaidCents: 0,
          currency: b.currency,
          checkoutUrl: customCheckoutUrl,
        },
      }),
    );
  }

  // ✅ Log payment link sent event
  tx.push(
    db.bookingStatusEvent.create({
      data: {
        bookingId: b.id,
        status: b.status,
        eventType: "PAYMENT_LINK_SENT",
        metadata: {
          amountCents: amountToCharge,
          currency: b.currency,
          recipientEmail: recipientEmail,
          isBalancePayment: isBalancePayment,
          checkoutType: "custom", // ✅ Indicates custom checkout with tips
        },
        createdById: actorId,
      },
    }),
  );

  await db.$transaction(tx);

  await queueAdminNotificationsForBookingEvent({
    event: "PAYMENT_LINK_SENT",
    bookingId: b.id,
  });

  return {
    success: true,
    checkoutUrl: customCheckoutUrl,
    isBalancePayment,
    amountCharged: amountToCharge,
  };
}

// =============================================================================
// ✅ Quick Status Actions
// =============================================================================

const QuickStatusSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum([
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
    "EN_ROUTE",
    "ARRIVED",
    "IN_PROGRESS",
  ]),
});

export async function updateBookingStatus(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = QuickStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid status data." };

  const { bookingId, status } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });
  if (!booking) return { error: "Booking not found." };

  const finalStatuses = ["REFUNDED", "PARTIALLY_REFUNDED"];
  if (finalStatuses.includes(booking.status)) {
    return { error: "Cannot change status of a refunded booking." };
  }

  const actionDescriptions: Record<string, string> = {
    EN_ROUTE: "Driver marked as en route to pickup",
    ARRIVED: "Driver marked as arrived at pickup location",
    IN_PROGRESS: "Trip started - passenger picked up",
    COMPLETED: "Trip marked as completed",
    CANCELLED: "Booking cancelled",
    NO_SHOW: "Passenger marked as no-show",
  };

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status,
        eventType: "STATUS_CHANGE",
        metadata: {
          previousStatus: booking.status,
          newStatus: status,
          action: actionDescriptions[status] ?? `Status changed to ${status}`,
        },
        createdById: actorId,
      },
    }),
  ]);

  if (status === "CANCELLED") {
    await queueAdminNotificationsForBookingEvent({
      event: "BOOKING_CANCELLED",
      bookingId,
    });
  } else if (status === "COMPLETED") {
    await queueAdminNotificationsForBookingEvent({
      event: "TRIP_COMPLETED",
      bookingId,
    });
  } else if (status === "EN_ROUTE") {
    await queueAdminNotificationsForBookingEvent({
      event: "DRIVER_EN_ROUTE",
      bookingId,
    });
  } else if (status === "ARRIVED") {
    await queueAdminNotificationsForBookingEvent({
      event: "DRIVER_ARRIVED",
      bookingId,
    });
  } else if (status === "IN_PROGRESS") {
    await queueAdminNotificationsForBookingEvent({
      event: "DRIVER_PICKED_UP",
      bookingId,
    });
  }

  revalidatePath(`/admin/bookings/${bookingId}`);

  return { success: true };
}

// =============================================================================
// ✅ Booking Notes
// =============================================================================

const AddNoteSchema = z.object({
  bookingId: z.string().min(1),
  content: z.string().min(1, "Note cannot be empty").max(5000),
});

export async function addBookingNote(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = AddNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid note data." };

  const { bookingId, content } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true },
  });
  if (!booking) return { error: "Booking not found." };

  await db.bookingNote.create({
    data: {
      bookingId,
      content: content.trim(),
      createdById: actorId,
    },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);

  return { success: true };
}

const DeleteNoteSchema = z.object({
  noteId: z.string().min(1),
  bookingId: z.string().min(1),
});

export async function deleteBookingNote(formData: FormData) {
  await requireAdmin();

  const parsed = DeleteNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };

  const { noteId, bookingId } = parsed.data;

  await db.bookingNote.delete({
    where: { id: noteId },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);

  return { success: true };
}

// =============================================================================
// ✅ Edit Trip Details (with event logging)
// =============================================================================

const EditTripSchema = z.object({
  bookingId: z.string().min(1),
  pickupAt: z.string().min(1),
  pickupAddress: z.string().min(1),
  dropoffAddress: z.string().min(1),
  pickupPlaceId: z.string().optional().nullable(),
  dropoffPlaceId: z.string().optional().nullable(),
  pickupLat: z.coerce.number().optional().nullable(),
  pickupLng: z.coerce.number().optional().nullable(),
  dropoffLat: z.coerce.number().optional().nullable(),
  dropoffLng: z.coerce.number().optional().nullable(),
  distanceMiles: z.coerce.number().optional().nullable(),
  durationMinutes: z.coerce.number().int().optional().nullable(),
  passengers: z.coerce.number().int().min(1).max(100),
  luggage: z.coerce.number().int().min(0).max(100),
  specialRequests: z.string().optional().nullable(),
  flightAirline: z.string().optional().nullable(),
  flightNumber: z.string().optional().nullable(),
  flightScheduledAt: z.string().optional().nullable(),
  flightTerminal: z.string().optional().nullable(),
  flightGate: z.string().optional().nullable(),
});

export async function updateTripDetails(formData: FormData) {
  const { actorId } = await requireAdmin();

  const rawData = Object.fromEntries(formData);
  const processedData = {
    ...rawData,
    pickupLat: rawData.pickupLat === "" ? null : rawData.pickupLat,
    pickupLng: rawData.pickupLng === "" ? null : rawData.pickupLng,
    dropoffLat: rawData.dropoffLat === "" ? null : rawData.dropoffLat,
    dropoffLng: rawData.dropoffLng === "" ? null : rawData.dropoffLng,
    distanceMiles: rawData.distanceMiles === "" ? null : rawData.distanceMiles,
    durationMinutes:
      rawData.durationMinutes === "" ? null : rawData.durationMinutes,
    pickupPlaceId: rawData.pickupPlaceId === "" ? null : rawData.pickupPlaceId,
    dropoffPlaceId:
      rawData.dropoffPlaceId === "" ? null : rawData.dropoffPlaceId,
  };

  const parsed = EditTripSchema.safeParse(processedData);
  if (!parsed.success) {
    console.error("Edit trip validation failed:", parsed.error);
    return { error: "Invalid trip data." };
  }

  const d = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: d.bookingId },
    select: {
      id: true,
      status: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      distanceMiles: true,
      durationMinutes: true,
      passengers: true,
      luggage: true,
      specialRequests: true,
      flightAirline: true,
      flightNumber: true,
      flightScheduledAt: true,
      flightTerminal: true,
      flightGate: true,
    },
  });
  if (!booking) return { error: "Booking not found." };

  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

  const oldPickupAt = booking.pickupAt?.toISOString();
  const newPickupAt = new Date(d.pickupAt).toISOString();
  if (oldPickupAt !== newPickupAt) {
    changes.push({
      field: "Date/Time",
      oldValue: oldPickupAt,
      newValue: newPickupAt,
    });
  }
  if (booking.pickupAddress !== d.pickupAddress) {
    changes.push({
      field: "Pickup Address",
      oldValue: booking.pickupAddress,
      newValue: d.pickupAddress,
    });
  }
  if (booking.dropoffAddress !== d.dropoffAddress) {
    changes.push({
      field: "Dropoff Address",
      oldValue: booking.dropoffAddress,
      newValue: d.dropoffAddress,
    });
  }
  const oldDistance = booking.distanceMiles
    ? Number(booking.distanceMiles)
    : null;
  if (oldDistance !== d.distanceMiles) {
    changes.push({
      field: "Distance (miles)",
      oldValue: oldDistance,
      newValue: d.distanceMiles,
    });
  }
  if (booking.durationMinutes !== d.durationMinutes) {
    changes.push({
      field: "Duration (minutes)",
      oldValue: booking.durationMinutes,
      newValue: d.durationMinutes,
    });
  }
  if (booking.passengers !== d.passengers) {
    changes.push({
      field: "Passengers",
      oldValue: booking.passengers,
      newValue: d.passengers,
    });
  }
  if (booking.luggage !== d.luggage) {
    changes.push({
      field: "Luggage",
      oldValue: booking.luggage,
      newValue: d.luggage,
    });
  }
  if (booking.specialRequests !== (d.specialRequests || null)) {
    changes.push({
      field: "Special Requests",
      oldValue: booking.specialRequests,
      newValue: d.specialRequests,
    });
  }
  if (booking.flightAirline !== (d.flightAirline || null)) {
    changes.push({
      field: "Flight Airline",
      oldValue: booking.flightAirline,
      newValue: d.flightAirline,
    });
  }
  if (booking.flightNumber !== (d.flightNumber || null)) {
    changes.push({
      field: "Flight Number",
      oldValue: booking.flightNumber,
      newValue: d.flightNumber,
    });
  }
  if (booking.flightTerminal !== (d.flightTerminal || null)) {
    changes.push({
      field: "Flight Terminal",
      oldValue: booking.flightTerminal,
      newValue: d.flightTerminal,
    });
  }
  if (booking.flightGate !== (d.flightGate || null)) {
    changes.push({
      field: "Flight Gate",
      oldValue: booking.flightGate,
      newValue: d.flightGate,
    });
  }

  await db.booking.update({
    where: { id: d.bookingId },
    data: {
      pickupAt: new Date(d.pickupAt),
      pickupAddress: d.pickupAddress,
      dropoffAddress: d.dropoffAddress,
      pickupPlaceId: d.pickupPlaceId || null,
      dropoffPlaceId: d.dropoffPlaceId || null,
      pickupLat: d.pickupLat ?? null,
      pickupLng: d.pickupLng ?? null,
      dropoffLat: d.dropoffLat ?? null,
      dropoffLng: d.dropoffLng ?? null,
      distanceMiles: d.distanceMiles ?? null,
      durationMinutes: d.durationMinutes ?? null,
      passengers: d.passengers,
      luggage: d.luggage,
      specialRequests: d.specialRequests || null,
      flightAirline: d.flightAirline || null,
      flightNumber: d.flightNumber || null,
      flightScheduledAt: d.flightScheduledAt
        ? new Date(d.flightScheduledAt)
        : null,
      flightTerminal: d.flightTerminal || null,
      flightGate: d.flightGate || null,
    },
  });

  if (changes.length > 0) {
    await db.bookingStatusEvent.create({
      data: {
        bookingId: d.bookingId,
        status: booking.status,
        eventType: "TRIP_EDITED",
        metadata: {
          changes: changes,
          fieldsEdited: changes.map((c) => c.field),
        },
        createdById: actorId,
      },
    });
  }

  revalidatePath(`/admin/bookings/${d.bookingId}`);

  return { success: true };
}

// =============================================================================
// ✅ Update Trip Details AND Price in one action
// =============================================================================

const EditTripWithPriceSchema = z.object({
  bookingId: z.string().min(1),
  pickupAt: z.string().min(1),
  pickupAddress: z.string().min(1),
  dropoffAddress: z.string().min(1),
  pickupPlaceId: z.string().optional().nullable(),
  dropoffPlaceId: z.string().optional().nullable(),
  pickupLat: z.coerce.number().optional().nullable(),
  pickupLng: z.coerce.number().optional().nullable(),
  dropoffLat: z.coerce.number().optional().nullable(),
  dropoffLng: z.coerce.number().optional().nullable(),
  distanceMiles: z.coerce.number().optional().nullable(),
  durationMinutes: z.coerce.number().int().optional().nullable(),
  passengers: z.coerce.number().int().min(1).max(100),
  luggage: z.coerce.number().int().min(0).max(100),
  specialRequests: z.string().optional().nullable(),
  flightAirline: z.string().optional().nullable(),
  flightNumber: z.string().optional().nullable(),
  flightScheduledAt: z.string().optional().nullable(),
  flightTerminal: z.string().optional().nullable(),
  flightGate: z.string().optional().nullable(),
  updatePrice: z.string().optional(),
  newTotalCents: z.coerce.number().int().min(0).optional(),
});

export async function updateTripDetailsAndPrice(formData: FormData) {
  const { actorId } = await requireAdmin();

  const rawData = Object.fromEntries(formData);
  const processedData = {
    ...rawData,
    pickupLat: rawData.pickupLat === "" ? null : rawData.pickupLat,
    pickupLng: rawData.pickupLng === "" ? null : rawData.pickupLng,
    dropoffLat: rawData.dropoffLat === "" ? null : rawData.dropoffLat,
    dropoffLng: rawData.dropoffLng === "" ? null : rawData.dropoffLng,
    distanceMiles: rawData.distanceMiles === "" ? null : rawData.distanceMiles,
    durationMinutes:
      rawData.durationMinutes === "" ? null : rawData.durationMinutes,
    pickupPlaceId: rawData.pickupPlaceId === "" ? null : rawData.pickupPlaceId,
    dropoffPlaceId:
      rawData.dropoffPlaceId === "" ? null : rawData.dropoffPlaceId,
  };

  const parsed = EditTripWithPriceSchema.safeParse(processedData);
  if (!parsed.success) {
    console.error("Edit trip with price validation failed:", parsed.error);
    return { error: "Invalid trip data." };
  }

  const d = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: d.bookingId },
    select: {
      id: true,
      status: true,
      totalCents: true,
      subtotalCents: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      passengers: true,
      luggage: true,
      payment: {
        select: {
          status: true,
          amountPaidCents: true,
        },
      },
    },
  });
  if (!booking) return { error: "Booking not found." };

  const shouldUpdatePrice =
    d.newTotalCents !== undefined && d.newTotalCents > 0;

  const tripChanges: Array<{ field: string; oldValue: any; newValue: any }> =
    [];

  const oldPickupAt = booking.pickupAt?.toISOString();
  const newPickupAt = new Date(d.pickupAt).toISOString();
  if (oldPickupAt !== newPickupAt) {
    tripChanges.push({
      field: "Date/Time",
      oldValue: oldPickupAt,
      newValue: newPickupAt,
    });
  }
  if (booking.pickupAddress !== d.pickupAddress) {
    tripChanges.push({
      field: "Pickup Address",
      oldValue: booking.pickupAddress,
      newValue: d.pickupAddress,
    });
  }
  if (booking.dropoffAddress !== d.dropoffAddress) {
    tripChanges.push({
      field: "Dropoff Address",
      oldValue: booking.dropoffAddress,
      newValue: d.dropoffAddress,
    });
  }
  if (booking.passengers !== d.passengers) {
    tripChanges.push({
      field: "Passengers",
      oldValue: booking.passengers,
      newValue: d.passengers,
    });
  }
  if (booking.luggage !== d.luggage) {
    tripChanges.push({
      field: "Luggage",
      oldValue: booking.luggage,
      newValue: d.luggage,
    });
  }

  const bookingUpdateData: any = {
    pickupAt: new Date(d.pickupAt),
    pickupAddress: d.pickupAddress,
    dropoffAddress: d.dropoffAddress,
    pickupPlaceId: d.pickupPlaceId || null,
    dropoffPlaceId: d.dropoffPlaceId || null,
    pickupLat: d.pickupLat ?? null,
    pickupLng: d.pickupLng ?? null,
    dropoffLat: d.dropoffLat ?? null,
    dropoffLng: d.dropoffLng ?? null,
    distanceMiles: d.distanceMiles ?? null,
    durationMinutes: d.durationMinutes ?? null,
    passengers: d.passengers,
    luggage: d.luggage,
    specialRequests: d.specialRequests || null,
    flightAirline: d.flightAirline || null,
    flightNumber: d.flightNumber || null,
    flightScheduledAt: d.flightScheduledAt
      ? new Date(d.flightScheduledAt)
      : null,
    flightTerminal: d.flightTerminal || null,
    flightGate: d.flightGate || null,
  };

  const tx: any[] = [];

  if (shouldUpdatePrice) {
    bookingUpdateData.subtotalCents = d.newTotalCents;
    bookingUpdateData.totalCents = d.newTotalCents;

    const isPaid = booking.payment?.status === "PAID";
    const amountPaidCents = booking.payment?.amountPaidCents ?? 0;

    if (isPaid && d.newTotalCents! > amountPaidCents) {
      tx.push(
        db.payment.update({
          where: { bookingId: d.bookingId },
          data: { amountTotalCents: d.newTotalCents },
        }),
      );
    }

    if (
      !isPaid &&
      booking.status !== "CANCELLED" &&
      booking.status !== "NO_SHOW"
    ) {
      bookingUpdateData.status = "PENDING_PAYMENT";
    }

    if (booking.totalCents !== d.newTotalCents) {
      tx.push(
        db.bookingStatusEvent.create({
          data: {
            bookingId: d.bookingId,
            status: bookingUpdateData.status ?? booking.status,
            eventType: "PRICE_ADJUSTED",
            metadata: {
              oldSubtotalCents: booking.subtotalCents,
              newSubtotalCents: d.newTotalCents,
              oldTotalCents: booking.totalCents,
              newTotalCents: d.newTotalCents,
              currency: "usd",
            },
            createdById: actorId,
          },
        }),
      );
    }
  }

  tx.unshift(
    db.booking.update({
      where: { id: d.bookingId },
      data: bookingUpdateData,
    }),
  );

  if (tripChanges.length > 0) {
    tx.push(
      db.bookingStatusEvent.create({
        data: {
          bookingId: d.bookingId,
          status: bookingUpdateData.status ?? booking.status,
          eventType: "TRIP_EDITED",
          metadata: {
            changes: tripChanges,
            fieldsEdited: tripChanges.map((c) => c.field),
          },
          createdById: actorId,
        },
      }),
    );
  }

  if (
    shouldUpdatePrice &&
    bookingUpdateData.status === "PENDING_PAYMENT" &&
    booking.status !== "PENDING_PAYMENT"
  ) {
    tx.push(
      db.bookingStatusEvent.create({
        data: {
          bookingId: d.bookingId,
          status: "PENDING_PAYMENT",
          eventType: "APPROVAL_CHANGED",
          metadata: {
            approved: true,
            previousStatus: booking.status,
            newStatus: "PENDING_PAYMENT",
          },
          createdById: actorId,
        },
      }),
    );
  }

  await db.$transaction(tx);

  revalidatePath(`/admin/bookings/${d.bookingId}`);

  return { success: true, priceUpdated: shouldUpdatePrice };
}

// =============================================================================
// ✅ Duplicate Booking
// =============================================================================

export async function duplicateBooking(formData: FormData) {
  const { actorId } = await requireAdmin();

  const bookingId = formData.get("bookingId") as string;
  if (!bookingId) return { error: "Missing booking ID." };

  const original = await db.booking.findUnique({
    where: { id: bookingId },
    include: { addons: true },
  });
  if (!original) return { error: "Booking not found." };

  const newBooking = await db.booking.create({
    data: {
      userId: original.userId,
      serviceTypeId: original.serviceTypeId,
      vehicleId: original.vehicleId,
      status: "PENDING_REVIEW",
      pickupAt: original.pickupAt,
      passengers: original.passengers,
      luggage: original.luggage,
      hoursRequested: original.hoursRequested,
      pickupAddress: original.pickupAddress,
      pickupPlaceId: original.pickupPlaceId,
      pickupLat: original.pickupLat,
      pickupLng: original.pickupLng,
      dropoffAddress: original.dropoffAddress,
      dropoffPlaceId: original.dropoffPlaceId,
      dropoffLat: original.dropoffLat,
      dropoffLng: original.dropoffLng,
      distanceMiles: original.distanceMiles,
      durationMinutes: original.durationMinutes,
      specialRequests: original.specialRequests,
      flightAirline: original.flightAirline,
      flightNumber: original.flightNumber,
      flightScheduledAt: original.flightScheduledAt,
      flightTerminal: original.flightTerminal,
      flightGate: original.flightGate,
      currency: original.currency,
      subtotalCents: original.subtotalCents,
      feesCents: original.feesCents,
      taxesCents: original.taxesCents,
      totalCents: original.totalCents,
      guestName: original.guestName,
      guestEmail: original.guestEmail,
      guestPhone: original.guestPhone,
    },
  });

  await db.bookingStatusEvent.create({
    data: {
      bookingId: newBooking.id,
      status: "PENDING_REVIEW",
      eventType: "STATUS_CHANGE",
      metadata: {
        action: "Booking created (duplicated)",
        originalBookingId: bookingId,
        duplicatedFrom: bookingId,
      },
      createdById: actorId,
    },
  });

  if (original.addons.length > 0) {
    await db.bookingAddon.createMany({
      data: original.addons.map((addon) => ({
        bookingId: newBooking.id,
        type: addon.type,
        label: addon.label,
        quantity: addon.quantity,
        unitPriceCents: addon.unitPriceCents,
        totalPriceCents: addon.totalPriceCents,
        notes: addon.notes,
      })),
    });
  }

  return { success: true, newBookingId: newBooking.id };
}

// =============================================================================
// ✅ Issue Refund
// =============================================================================

const RefundSchema = z.object({
  bookingId: z.string().min(1),
  amountCents: z.coerce.number().int().min(1),
});

export async function issueRefund(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = RefundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid refund data." };
  }

  const { bookingId, amountCents } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) return { error: "Booking not found." };

  const payment = booking.payment;
  if (!payment) return { error: "No payment found for this booking." };

  if (!payment.stripePaymentIntentId) {
    return { error: "No Stripe payment intent found. Cannot process refund." };
  }

  const netPaidCents = payment.amountPaidCents - payment.amountRefundedCents;

  if (amountCents > netPaidCents) {
    return {
      error: `Cannot refund more than the net paid amount ($${(netPaidCents / 100).toFixed(2)}).`,
    };
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: amountCents,
      metadata: {
        bookingId: booking.id,
        reason: "admin_requested",
      },
    });

    if (refund.status === "failed") {
      return { error: "Stripe refund failed. Please try again." };
    }

    const newRefundedCents = payment.amountRefundedCents + amountCents;
    const newNetPaidCents = payment.amountPaidCents - newRefundedCents;

    let newPaymentStatus = payment.status;
    if (newNetPaidCents <= 0) {
      newPaymentStatus = "REFUNDED";
    } else if (newRefundedCents > 0) {
      newPaymentStatus = "PARTIALLY_REFUNDED";
    }

    await db.payment.update({
      where: { id: payment.id },
      data: {
        amountRefundedCents: newRefundedCents,
        stripeRefundId: refund.id,
        refundedAt: new Date(),
        status: newPaymentStatus,
      },
    });

    const tx: any[] = [];

    if (newPaymentStatus === "REFUNDED") {
      tx.push(
        db.booking.update({
          where: { id: booking.id },
          data: { status: "REFUNDED" },
        }),
      );
    } else if (newPaymentStatus === "PARTIALLY_REFUNDED") {
      if (booking.status !== "COMPLETED" && booking.status !== "CANCELLED") {
        tx.push(
          db.booking.update({
            where: { id: booking.id },
            data: { status: "PARTIALLY_REFUNDED" },
          }),
        );
      }
    }

    tx.push(
      db.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          status: newPaymentStatus === "REFUNDED" ? "REFUNDED" : booking.status,
          eventType: "REFUND_ISSUED",
          metadata: {
            amountCents: amountCents,
            currency: booking.currency,
            stripeRefundId: refund.id,
            totalRefundedCents: newRefundedCents,
            remainingPaidCents: newNetPaidCents,
            newPaymentStatus: newPaymentStatus,
          },
          createdById: actorId,
        },
      }),
    );

    await db.$transaction(tx);

    revalidatePath(`/admin/bookings/${bookingId}`);

    return {
      success: true,
      refundedCents: amountCents,
      newPaymentStatus,
    };
  } catch (e: any) {
    console.error("Stripe refund error:", e);

    // ✅ Handle "charge_already_refunded" - sync DB with Stripe
    if (e?.code === "charge_already_refunded") {
      try {
        // Fetch actual refund data from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment.stripePaymentIntentId!,
          { expand: ["charges.data.refunds"] },
        );

        const charges = (paymentIntent as any).charges?.data ?? [];
        const totalRefundedFromStripe = charges.reduce(
          (sum: number, charge: any) => sum + (charge.amount_refunded ?? 0),
          0,
        );

        const newNetPaidCents =
          payment.amountPaidCents - totalRefundedFromStripe;
        let newPaymentStatus: "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" =
          "PAID";

        if (newNetPaidCents <= 0) {
          newPaymentStatus = "REFUNDED";
        } else if (totalRefundedFromStripe > 0) {
          newPaymentStatus = "PARTIALLY_REFUNDED";
        }

        // Sync database with Stripe's actual state
        await db.payment.update({
          where: { id: payment.id },
          data: {
            amountRefundedCents: totalRefundedFromStripe,
            refundedAt: new Date(),
            status: newPaymentStatus,
          },
        });

        if (newPaymentStatus === "REFUNDED") {
          await db.booking.update({
            where: { id: booking.id },
            data: { status: "REFUNDED" },
          });
        } else if (newPaymentStatus === "PARTIALLY_REFUNDED") {
          await db.booking.update({
            where: { id: booking.id },
            data: { status: "PARTIALLY_REFUNDED" },
          });
        }

        revalidatePath(`/admin/bookings/${bookingId}`);

        return {
          success: true,
          refundedCents: totalRefundedFromStripe - payment.amountRefundedCents,
          newPaymentStatus,
          note: "Synced with existing Stripe refund",
        };
      } catch (syncError) {
        console.error("Failed to sync refund state:", syncError);
        return {
          error:
            "Charge was already refunded in Stripe. Please refresh the page.",
        };
      }
    }

    return {
      error: e?.message ?? "Failed to process refund. Please try again.",
    };
  }
}
