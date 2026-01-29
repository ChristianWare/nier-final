/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";
import { sendAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: any) {
  return typeof v === "string" && v.trim() ? v : null;
}

async function finalizePaid(args: {
  bookingId: string;
  checkoutSessionId: string | null;
  paymentIntentId: string | null;
  receiptUrl: string | null;
  amountTotalCents: number | null;
  currency: string | null;
  isBalancePayment?: boolean;
  balanceAmount?: number | null;
  tipCents?: number | null;
}) {
  const {
    bookingId,
    checkoutSessionId,
    paymentIntentId,
    receiptUrl,
    amountTotalCents,
    currency,
    isBalancePayment = false,
    balanceAmount,
    tipCents = 0,
  } = args;

  let shouldSendNotification = false;

  await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        currency: true,
        subtotalCents: true,
        totalCents: true,
      },
    });

    if (!booking) return;

    const existingPayment = await tx.payment.findUnique({
      where: { bookingId },
      select: {
        id: true,
        status: true,
        amountPaidCents: true,
        amountTotalCents: true,
        tipCents: true,
      },
    });

    const previouslyPaidCents = existingPayment?.amountPaidCents ?? 0;
    const previousTipCents = existingPayment?.tipCents ?? 0;

    // Calculate the new payment amount (excluding tip for booking total comparison)
    let newPaymentAmount: number;
    if (isBalancePayment && balanceAmount) {
      newPaymentAmount = balanceAmount;
    } else if (typeof amountTotalCents === "number" && amountTotalCents > 0) {
      newPaymentAmount = amountTotalCents;
    } else {
      newPaymentAmount = booking.totalCents ?? 0;
    }

    // Tip is tracked separately
    const totalTipCents = previousTipCents + (tipCents ?? 0);

    // Amount paid towards the booking fare (excluding tips)
    const baseFarePayment = newPaymentAmount - (tipCents ?? 0);

    const totalPaidCents = isBalancePayment
      ? previouslyPaidCents + baseFarePayment
      : baseFarePayment;

    const safeCurrency = (currency ?? booking.currency ?? "usd").toLowerCase();

    // Check if booking fare is fully paid (tips don't count towards this)
    const isFullyPaid = totalPaidCents >= (booking.totalCents ?? 0);

    console.log(
      `✅ Payment recorded for booking ${bookingId}:`,
      `Previous: $${(previouslyPaidCents / 100).toFixed(2)}`,
      `New payment: $${(newPaymentAmount / 100).toFixed(2)} (base: $${(baseFarePayment / 100).toFixed(2)}, tip: $${((tipCents ?? 0) / 100).toFixed(2)})`,
      `Total paid: $${(totalPaidCents / 100).toFixed(2)}`,
      `Booking total: $${((booking.totalCents ?? 0) / 100).toFixed(2)}`,
      `Total tips: $${(totalTipCents / 100).toFixed(2)}`,
      `Fully paid: ${isFullyPaid}`,
      `Is balance payment: ${isBalancePayment}`,
    );

    await tx.payment.upsert({
      where: { bookingId },
      update: {
        status: "PAID",
        stripeCheckoutSessionId: checkoutSessionId ?? undefined,
        stripePaymentIntentId: paymentIntentId ?? undefined,
        receiptUrl: receiptUrl ?? undefined,
        paidAt: new Date(),
        amountTotalCents: booking.totalCents ?? 0,
        amountPaidCents: totalPaidCents,
        tipCents: totalTipCents,
        currency: safeCurrency,
      },
      create: {
        bookingId,
        status: "PAID",
        stripeCheckoutSessionId: checkoutSessionId ?? undefined,
        stripePaymentIntentId: paymentIntentId ?? undefined,
        receiptUrl: receiptUrl ?? undefined,
        paidAt: new Date(),
        amountSubtotalCents: booking.subtotalCents ?? 0,
        amountTotalCents: booking.totalCents ?? 0,
        amountPaidCents: totalPaidCents,
        tipCents: totalTipCents,
        currency: safeCurrency,
      },
    });

    // Only update booking status if not in a terminal state
    const terminal: BookingStatus[] = ["CANCELLED", "NO_SHOW", "COMPLETED"];
    const shouldUpdateStatus =
      !terminal.includes(booking.status) &&
      (previouslyPaidCents === 0 || booking.status === "PENDING_PAYMENT");

    if (shouldUpdateStatus) {
      const nextStatus: BookingStatus = "CONFIRMED";

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: nextStatus },
      });

      // ✅ Flag to send notification after transaction commits
      shouldSendNotification = true;

      // ✅ Log payment event with eventType and metadata including tip
      await tx.bookingStatusEvent.create({
        data: {
          bookingId,
          status: nextStatus,
          eventType: "PAYMENT_RECEIVED",
          metadata: {
            amountCents: newPaymentAmount,
            baseFareCents: baseFarePayment,
            tipCents: tipCents ?? 0,
            method: "online",
            currency: safeCurrency,
            stripePaymentIntentId: paymentIntentId,
            isBalancePayment: isBalancePayment,
            previouslyPaidCents: previouslyPaidCents,
            totalPaidCents: totalPaidCents,
            totalTipCents: totalTipCents,
          },
        },
      });
    } else {
      // ✅ Still log the payment event even if status doesn't change
      await tx.bookingStatusEvent.create({
        data: {
          bookingId,
          status: booking.status,
          eventType: "PAYMENT_RECEIVED",
          metadata: {
            amountCents: newPaymentAmount,
            baseFareCents: baseFarePayment,
            tipCents: tipCents ?? 0,
            method: "online",
            currency: safeCurrency,
            stripePaymentIntentId: paymentIntentId,
            isBalancePayment: isBalancePayment,
            previouslyPaidCents: previouslyPaidCents,
            totalPaidCents: totalPaidCents,
            totalTipCents: totalTipCents,
          },
        },
      });
    }
  });

  // ✅ Send admin notification AFTER transaction commits successfully
  if (shouldSendNotification) {
    try {
      await sendAdminNotificationsForBookingEvent({
        event: "PAYMENT_RECEIVED",
        bookingId,
      });
    } catch (e) {
      console.error("Failed to send PAYMENT_RECEIVED admin notification:", e);
    }
  }
}

async function resolveBookingIdFromCheckoutSession(incoming: any) {
  const sessionId = str(incoming?.id);

  let bookingId =
    str(incoming?.metadata?.bookingId) ?? str(incoming?.client_reference_id);

  const isBalancePayment = incoming?.metadata?.isBalancePayment === "true";
  const balanceAmount = incoming?.metadata?.balanceAmount
    ? parseInt(incoming.metadata.balanceAmount, 10)
    : null;

  // DB fallback by session id
  if (!bookingId && sessionId) {
    const p = await db.payment.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      select: { bookingId: true },
    });
    bookingId = p?.bookingId ?? null;
  }

  // Stripe retrieve fallback
  let fullSession: any | null = null;
  if (!bookingId && sessionId) {
    try {
      fullSession = await stripe.checkout.sessions.retrieve(sessionId);
      bookingId =
        str(fullSession?.metadata?.bookingId) ??
        str(fullSession?.client_reference_id) ??
        null;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.warn("⚠️ checkout.sessions.retrieve failed:", msg);

      if (sessionId.startsWith("cs_test_")) {
        console.warn(
          "⚠️ This is a TEST session (cs_test). If your STRIPE_SECRET_KEY is sk_live, retrieval will fail. Use sk_test locally.",
        );
      }
      if (sessionId.startsWith("cs_live_")) {
        console.warn(
          "⚠️ This is a LIVE session (cs_live). If your STRIPE_SECRET_KEY is sk_test, retrieval will fail.",
        );
      }
    }
  }

  return { bookingId, sessionId, fullSession, isBalancePayment, balanceAmount };
}

async function getReceiptUrlFromPaymentIntent(paymentIntentId: string | null) {
  if (!paymentIntentId) return null;
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["charges"],
  });
  const charges = (pi as any)?.charges?.data ?? [];
  return charges?.[0]?.receipt_url ?? null;
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  const body = await req.text();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${err?.message ?? "unknown"}`,
      },
      { status: 400 },
    );
  }

  try {
    console.log(`✅ Stripe webhook: ${event.type}`);

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const incoming = event.data.object as any;

      const {
        bookingId,
        sessionId,
        fullSession,
        isBalancePayment,
        balanceAmount,
      } = await resolveBookingIdFromCheckoutSession(incoming);

      console.log(
        "➡️ session.id:",
        sessionId,
        "bookingId:",
        bookingId,
        "isBalancePayment:",
        isBalancePayment,
        "balanceAmount:",
        balanceAmount,
      );

      if (!bookingId) return NextResponse.json({ received: true });

      const session = fullSession ?? incoming;

      const paymentIntentId =
        typeof session?.payment_intent === "string"
          ? session.payment_intent
          : str(session?.payment_intent?.id);

      let receiptUrl: string | null = null;
      try {
        receiptUrl = await getReceiptUrlFromPaymentIntent(paymentIntentId);
      } catch (e: any) {
        console.warn("⚠️ could not fetch receipt url:", e?.message ?? e);
      }

      const amountTotalCents =
        typeof session?.amount_total === "number" ? session.amount_total : null;

      const currency = str(session?.currency);

      await finalizePaid({
        bookingId,
        checkoutSessionId: sessionId,
        paymentIntentId,
        receiptUrl,
        amountTotalCents,
        currency,
        isBalancePayment,
        balanceAmount,
      });

      return NextResponse.json({ received: true });
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as any;
      const paymentIntentId = str(pi?.id);

      let bookingId = str(pi?.metadata?.bookingId);
      const isBalancePayment = pi?.metadata?.isBalancePayment === "true";
      const balanceAmount = pi?.metadata?.balanceAmount
        ? parseInt(pi.metadata.balanceAmount, 10)
        : null;

      // ✅ Extract tip amount from metadata
      const tipCents = pi?.metadata?.tipCents
        ? parseInt(pi.metadata.tipCents, 10)
        : 0;

      if (!bookingId && paymentIntentId) {
        const p = await db.payment.findUnique({
          where: { stripePaymentIntentId: paymentIntentId },
          select: { bookingId: true },
        });
        bookingId = p?.bookingId ?? null;
      }

      console.log(
        "➡️ payment_intent.id:",
        paymentIntentId,
        "bookingId:",
        bookingId,
        "isBalancePayment:",
        isBalancePayment,
        "balanceAmount:",
        balanceAmount,
        "tipCents:",
        tipCents,
      );

      if (!bookingId) return NextResponse.json({ received: true });

      let receiptUrl: string | null = null;
      try {
        receiptUrl = await getReceiptUrlFromPaymentIntent(paymentIntentId);
      } catch {}

      const amountTotalCents =
        typeof pi?.amount_received === "number"
          ? pi.amount_received
          : typeof pi?.amount === "number"
            ? pi.amount
            : null;

      const currency = str(pi?.currency);

      await finalizePaid({
        bookingId,
        checkoutSessionId: null,
        paymentIntentId,
        receiptUrl,
        amountTotalCents,
        currency,
        isBalancePayment,
        balanceAmount,
        tipCents,
      });

      return NextResponse.json({ received: true });
    }

    // Handle refund events
    if (
      event.type === "charge.refunded" ||
      event.type === "charge.refund.updated"
    ) {
      const charge = event.data.object as any;
      const paymentIntentId = str(charge?.payment_intent);

      if (!paymentIntentId) return NextResponse.json({ received: true });

      const payment = await db.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        select: { id: true, bookingId: true, amountPaidCents: true },
      });

      if (!payment) return NextResponse.json({ received: true });

      const amountRefunded = charge?.amount_refunded ?? 0;

      console.log(
        "➡️ Refund event:",
        event.type,
        "paymentIntentId:",
        paymentIntentId,
        "amountRefunded:",
        amountRefunded,
      );

      let newStatus: "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" = "PAID";
      if (amountRefunded >= payment.amountPaidCents) {
        newStatus = "REFUNDED";
      } else if (amountRefunded > 0) {
        newStatus = "PARTIALLY_REFUNDED";
      }

      await db.payment.update({
        where: { id: payment.id },
        data: {
          amountRefundedCents: amountRefunded,
          status: newStatus,
          refundedAt: amountRefunded > 0 ? new Date() : undefined,
        },
      });

      // Update booking status if fully refunded
      if (newStatus === "REFUNDED") {
        await db.booking.update({
          where: { id: payment.bookingId },
          data: { status: "REFUNDED" },
        });

        // ✅ Log refund event from webhook
        await db.bookingStatusEvent.create({
          data: {
            bookingId: payment.bookingId,
            status: "REFUNDED",
            eventType: "REFUND_ISSUED",
            metadata: {
              amountCents: amountRefunded,
              source: "stripe_webhook",
              stripeChargeId: charge?.id,
            },
          },
        });
      } else if (newStatus === "PARTIALLY_REFUNDED") {
        // ✅ Log partial refund event from webhook
        const booking = await db.booking.findUnique({
          where: { id: payment.bookingId },
          select: { status: true },
        });

        await db.bookingStatusEvent.create({
          data: {
            bookingId: payment.bookingId,
            status: booking?.status ?? "PARTIALLY_REFUNDED",
            eventType: "REFUND_ISSUED",
            metadata: {
              amountCents: amountRefunded,
              source: "stripe_webhook",
              stripeChargeId: charge?.id,
              remainingPaidCents: payment.amountPaidCents - amountRefunded,
            },
          },
        });
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("❌ stripe webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
