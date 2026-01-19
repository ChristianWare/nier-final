/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { BookingStatus, PaymentStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function asString(v: unknown) {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function lowerCurrency(v: unknown) {
  if (typeof v !== "string" || !v) return "usd";
  return v.toLowerCase();
}

async function getReceiptUrl(paymentIntentId: string | null) {
  if (!paymentIntentId) return null;
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["charges"],
  });
  const charges = (pi as any)?.charges?.data ?? [];
  return charges?.[0]?.receipt_url ?? null;
}

function nextStatus(current: BookingStatus | null | undefined) {
  return current === "ASSIGNED"
    ? ("ASSIGNED" as BookingStatus)
    : ("CONFIRMED" as BookingStatus);
}

async function applyPaid(args: {
  bookingId: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  amountTotalCents?: number | null;
  currency?: string | null;
  receiptUrl?: string | null;
}) {
  const booking = await db.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      status: true,
      currency: true,
      subtotalCents: true,
      totalCents: true,
    },
  });
  if (!booking) return;

  const ns = nextStatus(booking.status);
  const shouldEvent = ns !== booking.status;

  const amountTotalCents =
    args.amountTotalCents ??
    (booking.totalCents && booking.totalCents > 0 ? booking.totalCents : 0);

  const currency = lowerCurrency(args.currency ?? booking.currency ?? "usd");

  await db.$transaction([
    db.payment.upsert({
      where: { bookingId: booking.id },
      update: {
        status: PaymentStatus.PAID,
        stripeCheckoutSessionId: args.stripeCheckoutSessionId ?? undefined,
        stripePaymentIntentId: args.stripePaymentIntentId ?? undefined,
        receiptUrl: args.receiptUrl ?? undefined,
        paidAt: new Date(),
        amountSubtotalCents: booking.subtotalCents ?? 0,
        amountTotalCents,
        currency,
      },
      create: {
        bookingId: booking.id,
        status: PaymentStatus.PAID,
        stripeCheckoutSessionId: args.stripeCheckoutSessionId ?? null,
        stripePaymentIntentId: args.stripePaymentIntentId ?? null,
        receiptUrl: args.receiptUrl ?? null,
        paidAt: new Date(),
        amountSubtotalCents: booking.subtotalCents ?? 0,
        amountTotalCents,
        currency,
      },
    }),
    db.booking.update({
      where: { id: booking.id },
      data: { status: ns },
    }),
    ...(shouldEvent
      ? [
          db.bookingStatusEvent.create({
            data: { bookingId: booking.id, status: ns },
          }),
        ]
      : []),
  ]);
}

export async function POST(req: Request) {
  const secret = requireEnv("STRIPE_WEBHOOK_SECRET");

  const sig = (await headers()).get("stripe-signature");
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
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      const bookingId =
        asString(session?.metadata?.bookingId) ??
        asString(session?.client_reference_id);
      if (!bookingId) return NextResponse.json({ received: true });

      const paymentIntentId = asString(session?.payment_intent);
      const receiptUrl = await getReceiptUrl(paymentIntentId);

      await applyPaid({
        bookingId,
        stripeCheckoutSessionId: asString(session?.id),
        stripePaymentIntentId: paymentIntentId,
        amountTotalCents: asNumber(session?.amount_total),
        currency: lowerCurrency(session?.currency),
        receiptUrl,
      });

      return NextResponse.json({ received: true });
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as any;

      const bookingId = asString(pi?.metadata?.bookingId);
      if (!bookingId) return NextResponse.json({ received: true });

      await applyPaid({
        bookingId,
        stripePaymentIntentId: asString(pi?.id),
        amountTotalCents: asNumber(pi?.amount_received) ?? asNumber(pi?.amount),
        currency: lowerCurrency(pi?.currency),
        receiptUrl: null,
      });

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("stripe webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
