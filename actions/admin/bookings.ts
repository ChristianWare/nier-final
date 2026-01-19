/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { stripe } from "@/lib/stripe";
import { sendPaymentLinkEmail } from "@/lib/email/sendPaymentLink";

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
    include: { user: true },
  });
  if (!booking) return { error: "Booking not found." };

  await db.$transaction([
    db.booking.update({
      where: { id: booking.id },
      data: {
        currency: d.currency,
        subtotalCents: d.subtotalCents,
        feesCents: d.feesCents,
        taxesCents: d.taxesCents,
        totalCents: d.totalCents,
        status: "PENDING_PAYMENT",
      },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId: booking.id,
        status: "PENDING_PAYMENT",
        createdById: actorId,
      },
    }),
  ]);

  return { success: true };
}

const AssignSchema = z.object({
  bookingId: z.string().min(1),
  driverId: z.string().min(1),
  vehicleUnitId: z.string().optional().nullable(),
});

export async function assignBooking(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = AssignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid assignment data." };

  const { bookingId, driverId, vehicleUnitId } = parsed.data;

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
        assignedById: actorId,
      },
      create: {
        bookingId,
        driverId,
        vehicleUnitId: vehicleUnitId || null,
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

  return { success: true };
}

const SendPaymentSchema = z.object({
  bookingId: z.string().min(1),
});

export async function createPaymentLinkAndEmail(formData: FormData) {
  const { actorId } = await requireAdmin();

  const parsed = SendPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };

  const booking = await db.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { user: true, serviceType: true, vehicle: true, payment: true },
  });
  if (!booking) return { error: "Booking not found." };

  const b = booking;

  if (b.status === "CANCELLED" || b.status === "NO_SHOW") {
    return { error: "This booking is cancelled/no-show. Don’t send payment." };
  }

  const recipientEmail = (b.user?.email ?? b.guestEmail ?? "")
    .trim()
    .toLowerCase();
  const recipientName = (b.user?.name ?? b.guestName ?? "").trim() || null;

  if (!recipientEmail) return { error: "Customer email missing." };

  if (!b.totalCents || b.totalCents <= 0) {
    return { error: "Set a total price before sending payment link." };
  }

  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  const successUrl = `${APP_URL}/dashboard?paid=1&bookingId=${b.id}`;
  const cancelUrl = `${APP_URL}/dashboard?cancelled=1&bookingId=${b.id}`;

  const now = Date.now();
  const reuseWindowMs = 23 * 60 * 60 * 1000;

  const existing = b.payment;

  const canReuse =
    existing?.status === "PENDING" &&
    Boolean(existing.checkoutUrl) &&
    Boolean(existing.stripeCheckoutSessionId) &&
    existing.amountTotalCents === (b.totalCents ?? 0) &&
    (existing.currency ?? "usd") === (b.currency ?? "usd") &&
    now - new Date(existing.updatedAt).getTime() < reuseWindowMs;

  const maybeSetPendingPayment =
    b.status === "DRAFT" || b.status === "PENDING_REVIEW";

  async function emailIt(url: string) {
    await sendPaymentLinkEmail({
      to: recipientEmail,
      name: recipientName,
      pickupAtISO: b.pickupAt.toISOString(),
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      totalCents: b.totalCents,
      currency: b.currency,
      payUrl: url,
      bookingId: b.id,
    });
  }

  if (canReuse && existing?.checkoutUrl) {
    try {
      await emailIt(existing.checkoutUrl);
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

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: recipientEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      bookingId: b.id,
      ...(b.userId ? { userId: b.userId } : {}),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: b.currency ?? "usd",
          unit_amount: b.totalCents,
          product_data: {
            name: `${b.serviceType.name} — Nier Transportation`,
            description: `${b.pickupAddress} → ${b.dropoffAddress}`,
          },
        },
      },
    ],
  });

  if (!stripeSession.url) {
    return { error: "Stripe did not return a checkout URL." };
  }

  const tx: any[] = [];

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
        currency: b.currency,
        checkoutUrl: stripeSession.url,
      },
    }),
  );

  if (maybeSetPendingPayment) {
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
    await emailIt(stripeSession.url);
  } catch (e) {
    console.error("sendPaymentLinkEmail failed (new)", e);
    return {
      error:
        "Payment link created, but the email failed to send. Copy the checkout URL from this page and send it manually.",
      checkoutUrl: stripeSession.url,
      debug: errMsg(e),
    };
  }

  return { success: true, reused: false, checkoutUrl: stripeSession.url };
}
