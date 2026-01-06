/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { stripe } from "@/lib/stripe";
import { sendPaymentLinkEmail } from "@/lib/email/sendPaymentLink";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.userId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
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
  const session = await requireAdmin();

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
        createdById: session.user.userId,
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
  const session = await requireAdmin();
  const parsed = AssignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid assignment data." };

  const { bookingId, driverId, vehicleUnitId } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true },
  });
  if (!booking) return { error: "Booking not found." };

  // upsert assignment
  await db.$transaction([
    db.assignment.upsert({
      where: { bookingId },
      update: {
        driverId,
        vehicleUnitId: vehicleUnitId || null,
        assignedById: session.user.userId,
      },
      create: {
        bookingId,
        driverId,
        vehicleUnitId: vehicleUnitId || null,
        assignedById: session.user.userId,
      },
    }),
    // only bump status forward if not already beyond ASSIGNED
    db.booking.update({
      where: { id: bookingId },
      data: {
        status:
          booking.status === "COMPLETED" ||
          booking.status === "CANCELLED" ||
          booking.status === "NO_SHOW"
            ? booking.status
            : "ASSIGNED",
      },
    }),
    db.bookingStatusEvent.create({
      data: {
        bookingId,
        status:
          booking.status === "COMPLETED" ||
          booking.status === "CANCELLED" ||
          booking.status === "NO_SHOW"
            ? booking.status
            : "ASSIGNED",
        createdById: session.user.userId,
      },
    }),
  ]);

  return { success: true };
}

const SendPaymentSchema = z.object({
  bookingId: z.string().min(1),
});

export async function createPaymentLinkAndEmail(formData: FormData) {
  await requireAdmin();
  const parsed = SendPaymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request." };

  const booking = await db.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { user: true, serviceType: true, vehicle: true, payment: true },
  });
  if (!booking) return { error: "Booking not found." };
  if (!booking.user?.email) return { error: "Booking user email missing." };

  // must have a price to pay
  if (!booking.totalCents || booking.totalCents <= 0) {
    return { error: "Set a total price before sending payment link." };
  }

  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  // Stripe needs absolute URLs
  const successUrl = `${APP_URL}/account?paid=1&bookingId=${booking.id}`;
  const cancelUrl = `${APP_URL}/account?cancelled=1&bookingId=${booking.id}`;

  // If we already created a checkout session and still have its URL, reuse it
  // (optional; Stripe sessions can expire depending on settings)
  // We'll create a new one each time to be safe.
  const session = await stripe.checkout.sessions.create({
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

  if (!session.url) return { error: "Stripe did not return a checkout URL." };

  await db.$transaction([
    db.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        status: "PENDING",
        stripeCheckoutSessionId: session.id,
        amountSubtotalCents: booking.subtotalCents,
        amountTotalCents: booking.totalCents,
        currency: booking.currency,
        checkoutUrl: session.url,
      },
      create: {
        bookingId: booking.id,
        status: "PENDING",
        stripeCheckoutSessionId: session.id,
        amountSubtotalCents: booking.subtotalCents,
        amountTotalCents: booking.totalCents,
        currency: booking.currency,
        checkoutUrl: session.url,
      },
    }),
    // Ensure status reflects payment required
    db.booking.update({
      where: { id: booking.id },
      data: { status: "PENDING_PAYMENT" },
    }),
    db.bookingStatusEvent.create({
      data: { bookingId: booking.id, status: "PENDING_PAYMENT" },
    }),
  ]);

  // send email
  await sendPaymentLinkEmail({
    to: booking.user.email,
    name: booking.user.name,
    pickupAtISO: booking.pickupAt.toISOString(),
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    totalCents: booking.totalCents,
    currency: booking.currency,
    payUrl: session.url,
    bookingId: booking.id,
  });

  return { success: true };
}
