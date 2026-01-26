/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, amountCents, tipCents, currency, isBalancePayment } =
      body;

    if (!bookingId || !amountCents || amountCents <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount." },
        { status: 400 },
      );
    }

    // Fetch booking to verify it exists and get details
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { email: true, name: true } },
        serviceType: { select: { name: true } },
        payment: { select: { stripePaymentIntentId: true, status: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 },
      );
    }

    // Check if booking is in valid state for payment
    const invalidStatuses = [
      "CANCELLED",
      "NO_SHOW",
      "REFUNDED",
      "PENDING_REVIEW",
      "DRAFT",
      "DECLINED",
    ];
    if (invalidStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: "This booking cannot accept payments at this time." },
        { status: 400 },
      );
    }

    const customerEmail = booking.user?.email ?? booking.guestEmail ?? null;
    const customerName = booking.user?.name ?? booking.guestName ?? "Guest";

    // Calculate amounts
    const baseFareCents = amountCents - (tipCents || 0);

    // Check if we should update an existing PaymentIntent or create a new one
    let paymentIntent;
    const existingPaymentIntentId = booking.payment?.stripePaymentIntentId;

    // If there's an existing PaymentIntent that hasn't been paid, update it
    if (existingPaymentIntentId && booking.payment?.status !== "PAID") {
      try {
        paymentIntent = await stripe.paymentIntents.update(
          existingPaymentIntentId,
          {
            amount: amountCents,
            metadata: {
              bookingId: booking.id,
              userId: booking.userId ?? "",
              tipCents: String(tipCents || 0),
              baseFareCents: String(baseFareCents),
              isBalancePayment: isBalancePayment ? "true" : "false",
            },
          },
        );
      } catch (updateError) {
        // If update fails (e.g., PaymentIntent was already confirmed), create a new one
        console.log(
          "Could not update existing PaymentIntent, creating new one",
        );
        paymentIntent = null;
      }
    }

    // Create new PaymentIntent if we don't have one
    if (!paymentIntent) {
      const APP_URL = process.env.APP_URL || "http://localhost:3000";

      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: currency || "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          bookingId: booking.id,
          userId: booking.userId ?? "",
          tipCents: String(tipCents || 0),
          baseFareCents: String(baseFareCents),
          isBalancePayment: isBalancePayment ? "true" : "false",
        },
        receipt_email: customerEmail || undefined,
        description: `${booking.serviceType?.name ?? "Transportation"} - ${booking.pickupAddress} → ${booking.dropoffAddress}`,
      });

      // Store the PaymentIntent ID in the database
      await db.payment.upsert({
        where: { bookingId: booking.id },
        update: {
          stripePaymentIntentId: paymentIntent.id,
          amountTotalCents: baseFareCents,
          currency: currency || "usd",
        },
        create: {
          bookingId: booking.id,
          status: "PENDING",
          stripePaymentIntentId: paymentIntent.id,
          amountSubtotalCents: booking.subtotalCents ?? baseFareCents,
          amountTotalCents: baseFareCents,
          amountPaidCents: 0,
          currency: currency || "usd",
        },
      });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error("Error creating PaymentIntent:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment." },
      { status: 500 },
    );
  }
}
