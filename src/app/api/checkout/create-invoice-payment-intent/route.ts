/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const stripe = await getStripe();
    const body = await req.json();
    const { invoiceId, tipCents: rawTip } = body ?? {};

    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoice." }, { status: 400 });
    }

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalCents: true,
        amountPaidCents: true,
        allowTip: true,
        currency: true,
        userId: true,
        guestEmail: true,
        guestName: true,
        stripePaymentIntentId: true,
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    if (invoice.status === "VOID") {
      return NextResponse.json(
        { error: "This invoice has been voided." },
        { status: 400 },
      );
    }

    const balanceDueCents = invoice.totalCents - invoice.amountPaidCents;
    if (balanceDueCents <= 0) {
      return NextResponse.json(
        { error: "This invoice is already paid." },
        { status: 400 },
      );
    }

    // ── Tip (server-authoritative) ──
    const tipCents = invoice.allowTip
      ? Math.max(0, Math.round(Number(rawTip) || 0))
      : 0;

    const amountCents = balanceDueCents + tipCents;
    const currency = (invoice.currency || "usd").toLowerCase();

    const customerEmail = invoice.user?.email ?? invoice.guestEmail ?? null;
    const customerName =
      invoice.user?.name ?? invoice.guestName ?? "Customer";

    const metadata: Record<string, string> = {
      kind: "invoice",
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      userId: invoice.userId ?? "",
      tipCents: String(tipCents),
      baseCents: String(balanceDueCents),
    };

    // ── Reuse an existing unpaid PaymentIntent, else create one ──
    let paymentIntent: any = null;

    if (invoice.stripePaymentIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(
          invoice.stripePaymentIntentId,
        );
        if (
          existing &&
          existing.status !== "succeeded" &&
          existing.status !== "canceled"
        ) {
          paymentIntent = await stripe.paymentIntents.update(
            invoice.stripePaymentIntentId,
            { amount: amountCents, metadata },
          );
        }
      } catch {
        paymentIntent = null;
      }
    }

    if (!paymentIntent) {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata,
        receipt_email: customerEmail || undefined,
        description: `Invoice ${invoice.invoiceNumber} — ${customerName}`,
      });

      await db.invoice.update({
        where: { id: invoice.id },
        data: { stripePaymentIntentId: paymentIntent.id },
      });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error("[create-invoice-payment-intent] error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to start payment." },
      { status: 500 },
    );
  }
}