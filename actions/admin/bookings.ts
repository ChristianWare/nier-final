/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { stripe } from "@/lib/stripe";
import { sendPaymentLinkEmail } from "@/lib/email/sendPaymentLink";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function getActorId(session: any) {
  // Prefer canonical id, fallback to userId for migration safety
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
  if (!booking.user?.email) return { error: "Booking user email missing." };

  if (!booking.totalCents || booking.totalCents <= 0) {
    return { error: "Set a total price before sending payment link." };
  }

  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  const successUrl = `${APP_URL}/dashboard?paid=1&bookingId=${booking.id}`;
  const cancelUrl = `${APP_URL}/dashboard?cancelled=1&bookingId=${booking.id}`;

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.user.email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      bookingId: booking.id,
      userId: booking.userId,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: booking.currency ?? "usd",
          unit_amount: booking.totalCents,
          product_data: {
            name: `${booking.serviceType.name} — Nier Transportation`,
            description: `${booking.pickupAddress} → ${booking.dropoffAddress}`,
          },
        },
      },
    ],
  });

  if (!stripeSession.url) {
    return { error: "Stripe did not return a checkout URL." };
  }

  await db.$transaction([
    db.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        status: "PENDING",
        stripeCheckoutSessionId: stripeSession.id,
        amountSubtotalCents: booking.subtotalCents,
        amountTotalCents: booking.totalCents,
        currency: booking.currency,
        checkoutUrl: stripeSession.url,
      },
      create: {
        bookingId: booking.id,
        status: "PENDING",
        stripeCheckoutSessionId: stripeSession.id,
        amountSubtotalCents: booking.subtotalCents,
        amountTotalCents: booking.totalCents,
        currency: booking.currency,
        checkoutUrl: stripeSession.url,
      },
    }),
    db.booking.update({
      where: { id: booking.id },
      data: { status: "PENDING_PAYMENT" },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId: booking.id,
        status: "PENDING_PAYMENT",
        createdById: actorId,
      },
    }),
  ]);

  await sendPaymentLinkEmail({
    to: booking.user.email,
    name: booking.user.name,
    pickupAtISO: booking.pickupAt.toISOString(),
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    totalCents: booking.totalCents,
    currency: booking.currency,
    payUrl: stripeSession.url,
    bookingId: booking.id,
  });

  return { success: true };
}
