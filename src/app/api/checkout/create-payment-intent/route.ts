/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const stripe = await getStripe();
    const body = await req.json();
    const {
      bookingId,
      amountCents,
      tipCents,
      currency,
      isBalancePayment,
      isDepositPayment,
      depositAmountCents,
    } = body;

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
        user: {
          select: { id: true, email: true, name: true, stripeCustomerId: true },
        },
        serviceType: { select: { name: true, pricingStrategy: true } },
        vehicle: { select: { overageFeeCents: true } },
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

    // Determine if this is a charter/hourly booking with an overage fee set
    const isHourly = booking.serviceType?.pricingStrategy === "HOURLY";
    const hasOverageFee = (booking.vehicle?.overageFeeCents ?? 0) > 0;
    const requiresSavedCard = isHourly && hasOverageFee;

    // Calculate amounts
    const baseFareCents = amountCents - (tipCents || 0);

    // ── Resolve or create Stripe customer ──────────────────────────────────
    // For charter bookings (hourly + overage fee set), we always need a
    // Stripe customer so we can save the card for potential overage charges.
    // For registered users, use their existing stripeCustomerId.
    // For guests on charter bookings, create a new Stripe customer.
    let stripeCustomerId: string | null =
      booking.user?.stripeCustomerId ?? booking.guestStripeCustomerId ?? null;

    if (requiresSavedCard && !stripeCustomerId && customerEmail) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        metadata: {
          bookingId: booking.id,
          source: "charter_guest_checkout",
        },
      });
      stripeCustomerId = customer.id;

      // Save to booking for guest, or to user record for registered users
      if (booking.userId) {
        await db.user.update({
          where: { id: booking.userId },
          data: { stripeCustomerId: customer.id },
        });
      } else {
        await db.booking.update({
          where: { id: bookingId },
          data: { guestStripeCustomerId: customer.id },
        });
      }
    }

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
              isDepositPayment: isDepositPayment ? "true" : "false",
              depositAmountCents: depositAmountCents ? String(depositAmountCents) : "",
              requiresSavedCard: requiresSavedCard ? "true" : "false",
            },
          },
        );
      } catch (updateError) {
        console.log(
          "Could not update existing PaymentIntent, creating new one",
        );
        paymentIntent = null;
      }
    }

    // Create new PaymentIntent if we don't have one
    if (!paymentIntent) {
      const piParams: any = {
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
          isDepositPayment: isDepositPayment ? "true" : "false",
          depositAmountCents: depositAmountCents ? String(depositAmountCents) : "",
          requiresSavedCard: requiresSavedCard ? "true" : "false",
        },
        receipt_email: customerEmail || undefined,
        description: `${booking.serviceType?.name ?? "Transportation"} - ${booking.pickupAddress} → ${booking.dropoffAddress}`,
      };

      // For charter bookings with overage fees: attach customer and save card
      if (requiresSavedCard && stripeCustomerId) {
        piParams.customer = stripeCustomerId;
        piParams.setup_future_usage = "off_session";
      }

      paymentIntent = await stripe.paymentIntents.create(piParams);

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
