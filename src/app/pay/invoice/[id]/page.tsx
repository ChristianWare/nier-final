/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Nav from "@/components/shared/Nav/Nav";
import InvoiceCheckoutClient from "./InvoiceCheckoutClient"
import { getStripePublishableKey } from "@/lib/stripe";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceCheckoutPage({ params }: Props) {
  const { id } = await params;

  const invoice = await db.invoice.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      memo: true,
      subtotalCents: true,
      totalCents: true,
      amountPaidCents: true,
      allowTip: true,
      currency: true,
      dueDate: true,
      user: { select: { name: true, email: true } },
      guestName: true,
      guestEmail: true,
      lineItems: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          description: true,
          quantity: true,
          unitAmountCents: true,
        },
      },
    },
  });

  if (!invoice) notFound();

  const balanceDueCents = invoice.totalCents - invoice.amountPaidCents;

  // Already settled → show the success screen
  if (balanceDueCents <= 0) {
    redirect(`/pay/invoice/${id}/success?already_paid=1`);
  }

  // Voided invoices can't be paid
  if (invoice.status === "VOID") {
    redirect(`/pay/invoice/${id}/success?voided=1`);
  }

  const [stripePublishableKey, companySettings] = await Promise.all([
    getStripePublishableKey(),
    getCompanySettings(),
  ]);

  const customerName = invoice.user?.name ?? invoice.guestName ?? "there";
  const customerEmail = invoice.user?.email ?? invoice.guestEmail ?? "";

  return (
    <main>
      <Nav background="white" />
      <InvoiceCheckoutClient
        stripePublishableKey={stripePublishableKey ?? ""}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        memo={invoice.memo}
        companyName={companySettings.companyName ?? "Invoice"}
        currency={invoice.currency ?? "usd"}
        lineItems={invoice.lineItems.map((li) => ({
          id: li.id,
          description: li.description,
          quantity: li.quantity,
          unitAmountCents: li.unitAmountCents,
        }))}
        subtotalCents={invoice.subtotalCents}
        balanceDueCents={balanceDueCents}
        amountPaidCents={invoice.amountPaidCents}
        allowTip={invoice.allowTip}
        customerName={customerName}
        customerEmail={customerEmail}
      />
    </main>
  );
}