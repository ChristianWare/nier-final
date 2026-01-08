/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export const runtime = "nodejs"; // Stripe lib expects Node runtime

export async function POST(req: Request) {
  const body = await req.text(); // IMPORTANT: raw body
  const sig = (await headers()).get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${err?.message ?? "unknown"}`,
      },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;

        const bookingId = session?.metadata?.bookingId as string | undefined;
        if (!bookingId) break;

        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;

        // Optional: fetch receipt URL (requires a retrieve)
        let receiptUrl: string | null = null;
        if (paymentIntentId) {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ["charges"],
          });
          const charges = (pi as any)?.charges?.data ?? [];
          receiptUrl = charges?.[0]?.receipt_url ?? null;
        }

        // Update DB atomically
        await db.$transaction(async (tx) => {
          // Mark payment paid
          await tx.payment.update({
            where: { bookingId },
            data: {
              status: "PAID",
              stripePaymentIntentId: paymentIntentId,
              receiptUrl: receiptUrl ?? undefined,
              paidAt: new Date(),
            },
          });

          // Move booking forward:
          // - If already ASSIGNED (you allowed assignment pre-payment), keep it ASSIGNED
          // - Otherwise set CONFIRMED
          const current = await tx.booking.findUnique({
            where: { id: bookingId },
            select: { status: true },
          });

          const nextStatus =
            current?.status === "ASSIGNED" ? "ASSIGNED" : "CONFIRMED";

          await tx.booking.update({
            where: { id: bookingId },
            data: { status: nextStatus },
          });

          await tx.bookingStatusEvent.create({
            data: { bookingId, status: nextStatus },
          });
        });

        break;
      }

      case "checkout.session.expired": {
        // optional: mark payment as FAILED or leave as-is
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("stripe webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
