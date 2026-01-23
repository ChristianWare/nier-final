/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { stripe } from "@/lib/stripe";
import { sendPaymentLinkEmail } from "@/lib/email/sendPaymentLink";
import { queueAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";
import { revalidatePath } from "next/cache";

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

  // Check if there's an existing payment
  const existingPayment = booking.payment;
  const amountPaidCents = existingPayment?.amountPaidCents ?? 0;
  const isPaid = existingPayment?.status === "PAID";

  // Determine the new status
  let newStatus = booking.status;

  // If not paid yet, set to PENDING_PAYMENT
  if (
    !isPaid &&
    booking.status !== "CANCELLED" &&
    booking.status !== "NO_SHOW"
  ) {
    newStatus = "PENDING_PAYMENT";
  }

  // If already paid but price increased, we have a balance due
  // Keep current status but payment status will show partial
  const hasBalanceDue = isPaid && d.totalCents > amountPaidCents;

  await db.$transaction([
    db.booking.update({
      where: { id: booking.id },
      data: {
        currency: d.currency,
        subtotalCents: d.subtotalCents,
        feesCents: d.feesCents,
        taxesCents: d.taxesCents,
        totalCents: d.totalCents,
        status: newStatus,
      },
    }),
    // Only create status event if status actually changed
    ...(newStatus !== booking.status
      ? [
          db.bookingStatusEvent.create({
            data: {
              bookingId: booking.id,
              status: newStatus,
              createdById: actorId,
            },
          }),
        ]
      : []),
    // If there's a balance due, update payment to reflect new total
    ...(hasBalanceDue && existingPayment
      ? [
          db.payment.update({
            where: { id: existingPayment.id },
            data: {
              amountTotalCents: d.totalCents,
              // Keep amountPaidCents unchanged
            },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/admin/bookings/${booking.id}`);

  return {
    success: true,
    hasBalanceDue,
    balanceDueCents: hasBalanceDue ? d.totalCents - amountPaidCents : 0,
  };
}

// =============================================================================
// ✅ NEW: Approve Booking Only (no pricing change)
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

  // Only approve if in PENDING_REVIEW or DRAFT status
  if (booking.status !== "PENDING_REVIEW" && booking.status !== "DRAFT") {
    return { error: "Booking is already approved or in a final state." };
  }

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status: "PENDING_PAYMENT" },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status: "PENDING_PAYMENT",
        createdById: actorId,
      },
    }),
  ]);

  revalidatePath(`/admin/bookings/${bookingId}`);

  return { success: true };
}

// =============================================================================
// ✅ NEW: Unapprove Booking (revert to PENDING_REVIEW)
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

  // Cannot unapprove if already paid
  if (booking.payment?.status === "PAID") {
    return { error: "Cannot unapprove a booking that has already been paid." };
  }

  // Only unapprove if in PENDING_PAYMENT status
  if (booking.status !== "PENDING_PAYMENT") {
    return {
      error: "Booking must be in 'Pending Payment' status to reverse approval.",
    };
  }

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status: "PENDING_REVIEW" },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status: "PENDING_REVIEW",
        createdById: actorId,
      },
    }),
  ]);

  revalidatePath(`/admin/bookings/${bookingId}`);

  return { success: true };
}

// =============================================================================
// ✅ NEW: Update Booking Price Only (no status change)
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
  await requireAdmin();

  const parsed = UpdatePriceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid pricing data." };

  const d = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: d.bookingId },
    include: { payment: true },
  });

  if (!booking) return { error: "Booking not found." };

  // Check if already paid and price is being changed
  const existingPayment = booking.payment;
  const amountPaidCents = existingPayment?.amountPaidCents ?? 0;
  const isPaid = existingPayment?.status === "PAID";

  // If already paid and price increased, we have a balance due
  const hasBalanceDue = isPaid && d.totalCents > amountPaidCents;

  // If already paid and price decreased, we have a refund due
  const hasRefundDue = isPaid && d.totalCents < amountPaidCents;

  await db.$transaction([
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
    // If there's a balance or refund situation, update payment to reflect new total
    ...((hasBalanceDue || hasRefundDue) && existingPayment
      ? [
          db.payment.update({
            where: { id: existingPayment.id },
            data: {
              amountTotalCents: d.totalCents,
            },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/admin/bookings/${booking.id}`);

  return {
    success: true,
    hasBalanceDue,
    balanceDueCents: hasBalanceDue ? d.totalCents - amountPaidCents : 0,
    hasRefundDue,
    refundDueCents: hasRefundDue ? amountPaidCents - d.totalCents : 0,
  };
}

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
    select: { id: true, status: true },
  });
  if (!booking) return { error: "Booking not found." };

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
        createdById: actorId,
      },
    }),
  ]);

  await queueAdminNotificationsForBookingEvent({
    event: "DRIVER_ASSIGNED",
    bookingId,
  });

  return { success: true };
}

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

  // Calculate the amount to charge
  const amountPaidCents = b.payment?.amountPaidCents ?? 0;
  const amountToCharge = isBalancePayment
    ? b.totalCents - amountPaidCents
    : b.totalCents;

  if (amountToCharge <= 0) {
    return { error: "No balance due. The booking is fully paid." };
  }

  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  const successUrl = `${APP_URL}/dashboard?paid=1&bookingId=${b.id}`;
  const cancelUrl = `${APP_URL}/dashboard?cancelled=1&bookingId=${b.id}`;

  const now = Date.now();
  const reuseWindowMs = 23 * 60 * 60 * 1000;

  const existing = b.payment;

  // Only reuse if NOT a balance payment and amounts match
  const canReuse =
    !isBalancePayment &&
    existing?.status === "PENDING" &&
    Boolean(existing.checkoutUrl) &&
    Boolean(existing.stripeCheckoutSessionId) &&
    existing.amountTotalCents === (b.totalCents ?? 0) &&
    (existing.currency ?? "usd") === (b.currency ?? "usd") &&
    now - new Date(existing.updatedAt).getTime() < reuseWindowMs;

  const maybeSetPendingPayment =
    b.status === "DRAFT" || b.status === "PENDING_REVIEW";

  async function emailIt(url: string, isBalance: boolean) {
    // Note: If you want to customize the email for balance payments,
    // you'll need to update your sendPaymentLinkEmail function to accept these params
    await sendPaymentLinkEmail({
      to: recipientEmail,
      name: recipientName,
      pickupAtISO: b.pickupAt.toISOString(),
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      totalCents: isBalance ? amountToCharge : b.totalCents,
      currency: b.currency,
      payUrl: url,
      bookingId: b.id,
    });
  }

  // ✅ REUSE path (only for full payments)
  if (canReuse && existing?.checkoutUrl) {
    try {
      await emailIt(existing.checkoutUrl, false);

      await queueAdminNotificationsForBookingEvent({
        event: "PAYMENT_LINK_SENT",
        bookingId: b.id,
      });

      return { success: true, reused: true, checkoutUrl: existing.checkoutUrl };
    } catch (e) {
      console.error("sendPaymentLinkEmail failed (reuse)", e);
      return {
        error:
          "Payment link created, but the email failed to send. Copy the checkout URL from this page and send it manually.",
        checkoutUrl: existing.checkoutUrl,
      };
    }
  }

  const email = booking.user?.email ?? booking.guestEmail ?? null;
  if (!email) return { error: "Booking email missing." };

  // Create description based on payment type
  const productName = isBalancePayment
    ? `Balance Due — ${booking.serviceType.name} — Nier Transportation`
    : `${booking.serviceType.name} — Nier Transportation`;

  const productDescription = isBalancePayment
    ? `Balance due for trip: ${booking.pickupAddress} → ${booking.dropoffAddress}`
    : `${booking.pickupAddress} → ${booking.dropoffAddress}`;

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: booking.id,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      bookingId: booking.id,
      userId: booking.userId ?? "",
      isBalancePayment: isBalancePayment ? "true" : "false",
      balanceAmount: amountToCharge.toString(),
    },
    payment_intent_data: {
      metadata: {
        bookingId: booking.id,
        userId: booking.userId ?? "",
        isBalancePayment: isBalancePayment ? "true" : "false",
        balanceAmount: amountToCharge.toString(),
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: booking.currency ?? "usd",
          unit_amount: amountToCharge,
          product_data: {
            name: productName,
            description: productDescription,
          },
        },
      },
    ],
  });

  if (!stripeSession.url) {
    return { error: "Stripe did not return a checkout URL." };
  }

  const tx: any[] = [];

  // For balance payments, we update existing payment record
  // For new payments, we create/update as before
  if (isBalancePayment && existing) {
    tx.push(
      db.payment.update({
        where: { id: existing.id },
        data: {
          // Keep existing paid amount, update checkout session for balance
          stripeCheckoutSessionId: stripeSession.id,
          checkoutUrl: stripeSession.url,
          // Don't change status - it's already PAID
        },
      }),
    );
  } else {
    tx.push(
      db.payment.upsert({
        where: { bookingId: b.id },
        update: {
          status: "PENDING",
          stripeCheckoutSessionId: stripeSession.id,
          amountSubtotalCents: b.subtotalCents,
          amountTotalCents: b.totalCents,
          currency: b.currency,
          checkoutUrl: stripeSession.url,
        },
        create: {
          bookingId: b.id,
          status: "PENDING",
          stripeCheckoutSessionId: stripeSession.id,
          amountSubtotalCents: b.subtotalCents,
          amountTotalCents: b.totalCents,
          amountPaidCents: 0,
          currency: b.currency,
          checkoutUrl: stripeSession.url,
        },
      }),
    );
  }

  if (maybeSetPendingPayment && !isBalancePayment) {
    tx.push(
      db.booking.update({
        where: { id: b.id },
        data: { status: "PENDING_PAYMENT" },
      }),
    );
    tx.push(
      db.bookingStatusEvent.create({
        data: {
          bookingId: b.id,
          status: "PENDING_PAYMENT",
          createdById: actorId,
        },
      }),
    );
  }

  await db.$transaction(tx);

  try {
    await emailIt(stripeSession.url, isBalancePayment);
  } catch (e) {
    console.error("sendPaymentLinkEmail failed (new)", e);
    return {
      error:
        "Payment link created, but the email failed to send. Copy the checkout URL from this page and send it manually.",
      checkoutUrl: stripeSession.url,
      debug: errMsg(e),
    };
  }

  await queueAdminNotificationsForBookingEvent({
    event: "PAYMENT_LINK_SENT",
    bookingId: b.id,
  });

  return {
    success: true,
    reused: false,
    checkoutUrl: stripeSession.url,
    isBalancePayment,
    amountCharged: amountToCharge,
  };
}

// =============================================================================
// ✅ NEW: Quick Status Actions
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

  // Prevent changing status of already finalized bookings (optional guard)
  const finalStatuses = ["REFUNDED", "PARTIALLY_REFUNDED"];
  if (finalStatuses.includes(booking.status)) {
    return { error: "Cannot change status of a refunded booking." };
  }

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { status },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status,
        createdById: actorId,
      },
    }),
  ]);

  // Queue notifications for relevant events
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
// ✅ NEW: Booking Notes
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
// ✅ UPDATED: Edit Trip Details (with route data)
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
  // Flight info
  flightAirline: z.string().optional().nullable(),
  flightNumber: z.string().optional().nullable(),
  flightScheduledAt: z.string().optional().nullable(),
  flightTerminal: z.string().optional().nullable(),
  flightGate: z.string().optional().nullable(),
});

export async function updateTripDetails(formData: FormData) {
  await requireAdmin();

  // Convert empty strings to null for numeric fields
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

  const {
    bookingId,
    pickupAt,
    pickupAddress,
    dropoffAddress,
    pickupPlaceId,
    dropoffPlaceId,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    distanceMiles,
    durationMinutes,
    passengers,
    luggage,
    specialRequests,
    flightAirline,
    flightNumber,
    flightScheduledAt,
    flightTerminal,
    flightGate,
  } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true },
  });
  if (!booking) return { error: "Booking not found." };

  await db.booking.update({
    where: { id: bookingId },
    data: {
      pickupAt: new Date(pickupAt),
      pickupAddress,
      dropoffAddress,
      pickupPlaceId: pickupPlaceId || null,
      dropoffPlaceId: dropoffPlaceId || null,
      pickupLat: pickupLat ?? null,
      pickupLng: pickupLng ?? null,
      dropoffLat: dropoffLat ?? null,
      dropoffLng: dropoffLng ?? null,
      distanceMiles: distanceMiles ?? null,
      durationMinutes: durationMinutes ?? null,
      passengers,
      luggage,
      specialRequests: specialRequests || null,
      flightAirline: flightAirline || null,
      flightNumber: flightNumber || null,
      flightScheduledAt: flightScheduledAt ? new Date(flightScheduledAt) : null,
      flightTerminal: flightTerminal || null,
      flightGate: flightGate || null,
    },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);

  return { success: true };
}

// =============================================================================
// ✅ NEW: Update Trip Details AND Price in one action
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
  // Flight info
  flightAirline: z.string().optional().nullable(),
  flightNumber: z.string().optional().nullable(),
  flightScheduledAt: z.string().optional().nullable(),
  flightTerminal: z.string().optional().nullable(),
  flightGate: z.string().optional().nullable(),
  // Price update
  updatePrice: z.string().optional(),
  newTotalCents: z.coerce.number().int().min(0).optional(),
});

export async function updateTripDetailsAndPrice(formData: FormData) {
  const { actorId } = await requireAdmin();

  // Convert empty strings to null for numeric fields
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

  const {
    bookingId,
    pickupAt,
    pickupAddress,
    dropoffAddress,
    pickupPlaceId,
    dropoffPlaceId,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    distanceMiles,
    durationMinutes,
    passengers,
    luggage,
    specialRequests,
    flightAirline,
    flightNumber,
    flightScheduledAt,
    flightTerminal,
    flightGate,
    updatePrice,
    newTotalCents,
  } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      totalCents: true,
      payment: {
        select: {
          status: true,
          amountPaidCents: true,
        },
      },
    },
  });
  if (!booking) return { error: "Booking not found." };

  const shouldUpdatePrice = newTotalCents !== undefined && newTotalCents > 0;

  // Build the update data
  const bookingUpdateData: any = {
    pickupAt: new Date(pickupAt),
    pickupAddress,
    dropoffAddress,
    pickupPlaceId: pickupPlaceId || null,
    dropoffPlaceId: dropoffPlaceId || null,
    pickupLat: pickupLat ?? null,
    pickupLng: pickupLng ?? null,
    dropoffLat: dropoffLat ?? null,
    dropoffLng: dropoffLng ?? null,
    distanceMiles: distanceMiles ?? null,
    durationMinutes: durationMinutes ?? null,
    passengers,
    luggage,
    specialRequests: specialRequests || null,
    flightAirline: flightAirline || null,
    flightNumber: flightNumber || null,
    flightScheduledAt: flightScheduledAt ? new Date(flightScheduledAt) : null,
    flightTerminal: flightTerminal || null,
    flightGate: flightGate || null,
  };

  // If updating price, add price fields
  if (shouldUpdatePrice) {
    bookingUpdateData.subtotalCents = newTotalCents;
    bookingUpdateData.totalCents = newTotalCents;

    // Check if this creates a balance due situation
    const isPaid = booking.payment?.status === "PAID";
    const amountPaidCents = booking.payment?.amountPaidCents ?? 0;

    if (isPaid && newTotalCents > amountPaidCents) {
      // Price increased after payment - there's now a balance due
      // Update the payment record to reflect new total
      await db.payment.update({
        where: { bookingId },
        data: {
          amountTotalCents: newTotalCents,
        },
      });
    }

    // If not paid yet, set status to PENDING_PAYMENT
    if (
      !isPaid &&
      booking.status !== "CANCELLED" &&
      booking.status !== "NO_SHOW"
    ) {
      bookingUpdateData.status = "PENDING_PAYMENT";
    }
  }

  await db.booking.update({
    where: { id: bookingId },
    data: bookingUpdateData,
  });

  // Create status event if status changed to PENDING_PAYMENT
  if (
    shouldUpdatePrice &&
    bookingUpdateData.status === "PENDING_PAYMENT" &&
    booking.status !== "PENDING_PAYMENT"
  ) {
    await db.bookingStatusEvent.create({
      data: {
        bookingId,
        status: "PENDING_PAYMENT",
        createdById: actorId,
      },
    });
  }

  revalidatePath(`/admin/bookings/${bookingId}`);

  return { success: true, priceUpdated: shouldUpdatePrice };
}

// =============================================================================
// ✅ NEW: Duplicate Booking
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

  // Create a new booking with same details but fresh status
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

  // Create initial status event
  await db.bookingStatusEvent.create({
    data: {
      bookingId: newBooking.id,
      status: "PENDING_REVIEW",
      createdById: actorId,
    },
  });

  // Copy addons
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
// ✅ NEW: Issue Refund
// =============================================================================

const RefundSchema = z.object({
  bookingId: z.string().min(1),
  amountCents: z.coerce.number().int().min(1),
});

export async function issueRefund(formData: FormData) {
  await requireAdmin();

  const parsed = RefundSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Invalid refund data." };
  }

  const { bookingId, amountCents } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });

  if (!booking) {
    return { error: "Booking not found." };
  }

  const payment = booking.payment;
  if (!payment) {
    return { error: "No payment found for this booking." };
  }

  if (!payment.stripePaymentIntentId) {
    return { error: "No Stripe payment intent found. Cannot process refund." };
  }

  // Calculate how much can be refunded
  const netPaidCents = payment.amountPaidCents - payment.amountRefundedCents;

  if (amountCents > netPaidCents) {
    return {
      error: `Cannot refund more than the net paid amount ($${(netPaidCents / 100).toFixed(2)}).`,
    };
  }

  try {
    // Create refund in Stripe
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

    // Calculate new totals
    const newRefundedCents = payment.amountRefundedCents + amountCents;
    const newNetPaidCents = payment.amountPaidCents - newRefundedCents;

    // Determine new payment status
    let newPaymentStatus = payment.status;
    if (newNetPaidCents <= 0) {
      newPaymentStatus = "REFUNDED";
    } else if (newRefundedCents > 0) {
      newPaymentStatus = "PARTIALLY_REFUNDED";
    }

    // Update payment record
    await db.payment.update({
      where: { id: payment.id },
      data: {
        amountRefundedCents: newRefundedCents,
        stripeRefundId: refund.id,
        refundedAt: new Date(),
        status: newPaymentStatus,
      },
    });

    // Update booking status if fully refunded
    if (newPaymentStatus === "REFUNDED") {
      await db.booking.update({
        where: { id: booking.id },
        data: { status: "REFUNDED" },
      });

      await db.bookingStatusEvent.create({
        data: {
          bookingId: booking.id,
          status: "REFUNDED",
        },
      });
    } else if (newPaymentStatus === "PARTIALLY_REFUNDED") {
      // Only update booking status if it makes sense
      if (booking.status !== "COMPLETED" && booking.status !== "CANCELLED") {
        await db.booking.update({
          where: { id: booking.id },
          data: { status: "PARTIALLY_REFUNDED" },
        });

        await db.bookingStatusEvent.create({
          data: {
            bookingId: booking.id,
            status: "PARTIALLY_REFUNDED",
          },
        });
      }
    }

    revalidatePath(`/admin/bookings/${bookingId}`);

    return {
      success: true,
      refundedCents: amountCents,
      newPaymentStatus,
    };
  } catch (e: any) {
    console.error("Stripe refund error:", e);
    return {
      error: e?.message ?? "Failed to process refund. Please try again.",
    };
  }
}
