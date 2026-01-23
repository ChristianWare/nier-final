/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";

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
  } = args;

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
      },
    });

    const previouslyPaidCents = existingPayment?.amountPaidCents ?? 0;

    // Calculate the new payment amount
    let newPaymentAmount: number;
    if (isBalancePayment && balanceAmount) {
      // This is a balance payment - the balanceAmount is what was just charged
      newPaymentAmount = balanceAmount;
    } else if (typeof amountTotalCents === "number" && amountTotalCents > 0) {
      // Regular payment - amountTotalCents is what Stripe charged
      newPaymentAmount = amountTotalCents;
    } else {
      // Fallback to booking total
      newPaymentAmount = booking.totalCents ?? 0;
    }

    // For balance payments, add to existing. For new payments, this is the total paid.
    const totalPaidCents = isBalancePayment
      ? previouslyPaidCents + newPaymentAmount
      : newPaymentAmount;

    const safeCurrency = (currency ?? booking.currency ?? "usd").toLowerCase();

    // Determine if fully paid
    const isFullyPaid = totalPaidCents >= (booking.totalCents ?? 0);

    console.log(
      `✅ Payment recorded for booking ${bookingId}:`,
      `Previous: $${(previouslyPaidCents / 100).toFixed(2)}`,
      `New payment: $${(newPaymentAmount / 100).toFixed(2)}`,
      `Total paid: $${(totalPaidCents / 100).toFixed(2)}`,
      `Booking total: $${((booking.totalCents ?? 0) / 100).toFixed(2)}`,
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
        currency: safeCurrency,
      },
    });

    // Only update booking status if this is the first payment or booking isn't in a terminal state
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

      await tx.bookingStatusEvent.create({
        data: { bookingId, status: nextStatus },
      });
    }
  });
}

async function resolveBookingIdFromCheckoutSession(incoming: any) {
  const sessionId = str(incoming?.id);

  let bookingId =
    str(incoming?.metadata?.bookingId) ?? str(incoming?.client_reference_id);

  // Check for balance payment metadata
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

  // Stripe retrieve fallback (but NEVER crash if it fails)
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

      // Trigger events won't have bookingId; that's fine, just acknowledge.
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

      // Calculate total refunded from the charge object
      const amountRefunded = charge?.amount_refunded ?? 0;

      console.log(
        "➡️ Refund event:",
        event.type,
        "paymentIntentId:",
        paymentIntentId,
        "amountRefunded:",
        amountRefunded,
      );

      // Determine new status based on refund amount
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
