/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";
import { sendAdminNotificationsForBookingEvent } from "@/lib/notifications/queue";
import {
  buildInvoiceDataForBooking,
  sendPaymentConfirmationEmail,
} from "@/lib/email/sendPaymentConfirmationEmail";
import { finalizeInvoicePaid } from "@/lib/invoice/finalizeInvoicePaid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: any) {
  return typeof v === "string" && v.trim() ? v : null;
}

// ── Save card for charter overage charges after payment succeeds ──────────────
async function saveCharterPaymentMethod(
  bookingId: string,
  paymentIntentId: string,
) {
  try {
    const stripe = await getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!pi.setup_future_usage) return;

    const customerId =
      typeof pi.customer === "string"
        ? pi.customer
        : ((pi.customer as any)?.id ?? null);

    if (!customerId) return;

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true, guestStripeCustomerId: true },
    });

    if (!booking) return;

    if (booking.userId) {
      await db.user.updateMany({
        where: { id: booking.userId, stripeCustomerId: null },
        data: { stripeCustomerId: customerId },
      });
    } else {
      await db.booking.update({
        where: { id: bookingId },
        data: { guestStripeCustomerId: customerId },
      });
    }

    console.log(
      `✅ Charter card saved for booking ${bookingId}: customer ${customerId}`,
    );
  } catch (e) {
    console.error("❌ Failed to save charter payment method:", e);
  }
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
  isDepositPayment?: boolean;
  depositAmountCents?: number | null;
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
    isDepositPayment = false,
    depositAmountCents,
  } = args;

  let shouldSendNotification = false;
  let finalTotalPaidCents = 0;
  let finalIsFullyPaid = false;

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

    let newPaymentAmount: number;
    if (isDepositPayment && depositAmountCents) {
      newPaymentAmount = depositAmountCents;
    } else if (isBalancePayment && balanceAmount) {
      newPaymentAmount = balanceAmount;
    } else if (typeof amountTotalCents === "number" && amountTotalCents > 0) {
      newPaymentAmount = amountTotalCents;
    } else {
      newPaymentAmount = booking.totalCents ?? 0;
    }

    const totalTipCents = previousTipCents + (tipCents ?? 0);
    const baseFarePayment = newPaymentAmount - (tipCents ?? 0);
    const totalPaidCents =
      isBalancePayment || isDepositPayment
        ? previouslyPaidCents + baseFarePayment
        : baseFarePayment;

    const safeCurrency = (currency ?? booking.currency ?? "usd").toLowerCase();
    const isFullyPaid = totalPaidCents >= (booking.totalCents ?? 0);

    // For deposit payments that don't cover the full amount, use PARTIALLY_PAID
    const paymentStatusToSet =
      isDepositPayment && !isFullyPaid ? "PARTIALLY_PAID" : "PAID";

    // Capture for use outside the transaction
    finalTotalPaidCents = totalPaidCents;
    finalIsFullyPaid = isFullyPaid;

    console.log(
      `✅ Payment recorded for booking ${bookingId}:`,
      `Previous: $${(previouslyPaidCents / 100).toFixed(2)}`,
      `New payment: $${(newPaymentAmount / 100).toFixed(2)} (base: $${(baseFarePayment / 100).toFixed(2)}, tip: $${((tipCents ?? 0) / 100).toFixed(2)})`,
      `Total paid: $${(totalPaidCents / 100).toFixed(2)}`,
      `Booking total: $${((booking.totalCents ?? 0) / 100).toFixed(2)}`,
      `Total tips: $${(totalTipCents / 100).toFixed(2)}`,
      `Fully paid: ${isFullyPaid}`,
      `Is balance payment: ${isBalancePayment}`,
      `Is deposit payment: ${isDepositPayment}`,
      `Payment status: ${paymentStatusToSet}`,
    );

    await tx.payment.upsert({
      where: { bookingId },
      update: {
        status: paymentStatusToSet,
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
        status: paymentStatusToSet,
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

    const terminal: BookingStatus[] = ["CANCELLED", "NO_SHOW", "COMPLETED"];
    const shouldUpdateStatus =
      !terminal.includes(booking.status) &&
      (previouslyPaidCents === 0 || booking.status === "PENDING_PAYMENT");

    if (shouldUpdateStatus) {
      // Deposit payments still confirm the booking — a deposit is enough to hold the ride
      const nextStatus: BookingStatus = "CONFIRMED";

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: nextStatus },
      });

      shouldSendNotification = true;

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
            isBalancePayment,
            isDepositPayment,
            depositAmountCents: isDepositPayment ? depositAmountCents : null,
            previouslyPaidCents,
            totalPaidCents,
            totalTipCents,
          },
        },
      });
    } else {
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
            isBalancePayment,
            isDepositPayment,
            depositAmountCents: isDepositPayment ? depositAmountCents : null,
            previouslyPaidCents,
            totalPaidCents,
            totalTipCents,
          },
        },
      });
    }
  });

  // ── Trip group: update group payment status and confirm all siblings ──
  try {
    const paidBooking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { tripGroupId: true, status: true },
    });

    if (paidBooking?.tripGroupId) {
      const group = await db.tripGroup.findUnique({
        where: { id: paidBooking.tripGroupId },
        include: {
          bookings: {
            select: {
              id: true,
              totalCents: true,
              subtotalCents: true,
              currency: true,
              status: true,
              payment: {
                select: {
                  id: true,
                  status: true,
                  amountPaidCents: true,
                  tipCents: true,
                },
              },
            },
          },
        },
      });

      if (group) {
        const groupTotal = group.bookings.reduce(
          (sum, b) => sum + b.totalCents,
          0,
        );
        const totalActuallyPaid = group.bookings.reduce(
          (sum, b) => sum + (b.payment?.amountPaidCents ?? 0),
          0,
        );
        const totalTips = group.bookings.reduce(
          (sum, b) => sum + (b.payment?.tipCents ?? 0),
          0,
        );

        // ✅ FIX: Use total coverage, not per-booking payment records.
        // A single payment on one booking can cover the entire group total.
        const isGroupFullyCovered = totalActuallyPaid >= groupTotal;

        await db.tripGroup.update({
          where: { id: paidBooking.tripGroupId },
          data: {
            paymentStatus: isGroupFullyCovered ? "PAID" : "NONE",
            amountPaidCents: totalActuallyPaid + totalTips,
            totalCents: groupTotal,
            paidAt: isGroupFullyCovered ? new Date() : undefined,
          },
        });

        if (isGroupFullyCovered) {
          const upgradableStatuses: BookingStatus[] = [
            "PENDING_PAYMENT",
            "PENDING_REVIEW",
            "ASSIGNED",
            "DRAFT",
          ];

          for (const sibling of group.bookings) {
            if (sibling.id === bookingId) continue; // Already handled in main tx

            // Confirm booking status if eligible
            if (upgradableStatuses.includes(sibling.status as BookingStatus)) {
              await db.booking.update({
                where: { id: sibling.id },
                data: { status: "CONFIRMED" },
              });
            }

            // ✅ FIX: Create payment records for siblings that have none,
            // so they show as paid on their own detail pages.
            if (!sibling.payment) {
              await db.payment.create({
                data: {
                  bookingId: sibling.id,
                  status: "PAID",
                  stripePaymentIntentId: paymentIntentId ?? undefined,
                  paidAt: new Date(),
                  amountSubtotalCents:
                    sibling.subtotalCents ?? sibling.totalCents,
                  amountTotalCents: sibling.totalCents,
                  amountPaidCents: sibling.totalCents,
                  amountRefundedCents: 0,
                  currency: (
                    sibling.currency ??
                    group.currency ??
                    "usd"
                  ).toLowerCase(),
                },
              });
            } else if (
              sibling.payment.status !== "PAID" &&
              sibling.payment.status !== "PARTIALLY_PAID"
            ) {
              await db.payment.update({
                where: { id: sibling.payment.id },
                data: {
                  status: "PAID",
                  paidAt: new Date(),
                  stripePaymentIntentId:
                    paymentIntentId ?? sibling.payment.id ?? undefined,
                },
              });
            }

            await db.bookingStatusEvent.create({
              data: {
                bookingId: sibling.id,
                status: "CONFIRMED",
                eventType: "PAYMENT_RECEIVED",
                metadata: {
                  method: "online",
                  note: "Confirmed via group payment",
                  groupId: paidBooking.tripGroupId,
                  paymentIntentId: paymentIntentId ?? null,
                },
              },
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("❌ Failed to update trip group after payment:", e);
  }

  // ── Send payment confirmation email with PDF invoice ──
  try {
    const bookingForEmail = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        user: { select: { email: true, name: true } },
        guestEmail: true,
        guestName: true,
        totalCents: true,
        currency: true,
        depositMode: true,
        depositPercent: true,
        depositCents: true,
        balanceCents: true,
        balanceDueDate: true,
      },
    });

    const customerEmail = (
      bookingForEmail?.user?.email ??
      bookingForEmail?.guestEmail ??
      ""
    )
      .trim()
      .toLowerCase();

    const customerName =
      bookingForEmail?.user?.name ?? bookingForEmail?.guestName ?? null;

    if (customerEmail) {
      const { invoiceData, emailArgs } =
        await buildInvoiceDataForBooking(bookingId);

      // Format balance due date for the email if applicable
      const balanceDueDateFormatted = bookingForEmail?.balanceDueDate
        ? new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(
            new Date(
              (bookingForEmail.balanceDueDate as any).toISOString?.() ??
                bookingForEmail.balanceDueDate,
            ),
          )
        : null;

      await sendPaymentConfirmationEmail({
        to: customerEmail,
        name: customerName,
        bookingId,
        invoiceData,
        pickupAtISO: emailArgs.pickupAtISO ?? new Date().toISOString(),
        pickupAddress: emailArgs.pickupAddress ?? "",
        dropoffAddress: emailArgs.dropoffAddress ?? "",
        totalCents: emailArgs.totalCents ?? 0,
        amountPaidCents: emailArgs.amountPaidCents ?? 0,
        currency: emailArgs.currency ?? "usd",
        ...emailArgs,
        // Deposit-specific args — only include if this was a deposit payment
        ...(isDepositPayment && bookingForEmail?.depositMode
          ? {
              isDepositPayment: true,
              depositCents: bookingForEmail.depositCents ?? null,
              depositPercent: bookingForEmail.depositPercent ?? null,
              balanceCents: bookingForEmail.balanceCents ?? null,
              balanceDueDate: balanceDueDateFormatted,
            }
          : {}),
      });
    }
  } catch (e) {
    console.error("❌ Failed to send payment confirmation email:", e);
  }

  // ── Admin notification ──
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
  const stripe = await getStripe();
  const sessionId = str(incoming?.id);

  let bookingId =
    str(incoming?.metadata?.bookingId) ?? str(incoming?.client_reference_id);

  const isBalancePayment = incoming?.metadata?.isBalancePayment === "true";
  const balanceAmount = incoming?.metadata?.balanceAmount
    ? parseInt(incoming.metadata.balanceAmount, 10)
    : null;

  const isDepositPayment = incoming?.metadata?.isDepositPayment === "true";
  const depositAmountCents = incoming?.metadata?.depositAmountCents
    ? parseInt(incoming.metadata.depositAmountCents, 10)
    : null;

  if (!bookingId && sessionId) {
    const p = await db.payment.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      select: { bookingId: true },
    });
    bookingId = p?.bookingId ?? null;
  }

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

  return {
    bookingId,
    sessionId,
    fullSession,
    isBalancePayment,
    balanceAmount,
    isDepositPayment,
    depositAmountCents,
  };
}

async function getReceiptUrlFromPaymentIntent(paymentIntentId: string | null) {
  if (!paymentIntentId) return null;
  const stripe = await getStripe();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["charges"],
  });
  const charges = (pi as any)?.charges?.data ?? [];
  return charges?.[0]?.receipt_url ?? null;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  const body = await req.text();

  let event: any;
  let stripe;
  try {
    stripe = await getStripe();
    const secret = await getStripeWebhookSecret();
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
        isDepositPayment,
        depositAmountCents,
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
        "isDepositPayment:",
        isDepositPayment,
        "depositAmountCents:",
        depositAmountCents,
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
        isDepositPayment,
        depositAmountCents,
      });

      if (paymentIntentId) {
        await saveCharterPaymentMethod(bookingId, paymentIntentId);
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as any;
      const paymentIntentId = str(pi?.id);

      // ── Ad-hoc invoice payment (kind=invoice) ──
      const invoiceId = str(pi?.metadata?.invoiceId);
      if (pi?.metadata?.kind === "invoice" && invoiceId) {
        const invTipCents = pi?.metadata?.tipCents
          ? parseInt(pi.metadata.tipCents, 10)
          : 0;
        const amountReceivedCents =
          typeof pi?.amount_received === "number"
            ? pi.amount_received
            : typeof pi?.amount === "number"
              ? pi.amount
              : 0;

        let invReceiptUrl: string | null = null;
        try {
          invReceiptUrl = await getReceiptUrlFromPaymentIntent(paymentIntentId);
        } catch (e: any) {
          console.warn(
            "⚠️ could not fetch invoice receipt url:",
            e?.message ?? e,
          );
        }

        await finalizeInvoicePaid({
          invoiceId,
          paymentIntentId,
          amountReceivedCents,
          tipCents: invTipCents,
          receiptUrl: invReceiptUrl,
        });

        return NextResponse.json({ received: true });
      }

      let bookingId = str(pi?.metadata?.bookingId);
      const isBalancePayment = pi?.metadata?.isBalancePayment === "true";
      const balanceAmount = pi?.metadata?.balanceAmount
        ? parseInt(pi.metadata.balanceAmount, 10)
        : null;
      const isDepositPayment = pi?.metadata?.isDepositPayment === "true";
      const depositAmountCents = pi?.metadata?.depositAmountCents
        ? parseInt(pi.metadata.depositAmountCents, 10)
        : null;

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
        "isDepositPayment:",
        isDepositPayment,
        "depositAmountCents:",
        depositAmountCents,
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
        isDepositPayment,
        depositAmountCents,
      });

      if (paymentIntentId) {
        await saveCharterPaymentMethod(bookingId, paymentIntentId);
      }

      return NextResponse.json({ received: true });
    }

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

      if (newStatus === "REFUNDED") {
        await db.booking.update({
          where: { id: payment.bookingId },
          data: { status: "REFUNDED" },
        });

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