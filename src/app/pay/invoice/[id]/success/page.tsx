/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Button from "@/components/shared/Button/Button";
import styles from "./InvoiceSuccess.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    redirect_status?: string;
    already_paid?: string;
    voided?: string;
  }>;
};

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
    minimumFractionDigits: 2,
  }).format((cents || 0) / 100);
}

export default async function InvoiceSuccessPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const voided = sp.voided === "1";

  const invoice = await db.invoice.findUnique({
    where: { id },
    select: {
      invoiceNumber: true,
      status: true,
      totalCents: true,
      amountPaidCents: true,
      tipCents: true,
      currency: true,
      user: { select: { name: true, email: true } },
      guestName: true,
      guestEmail: true,
    },
  });

  if (!invoice) notFound();

  const email = invoice.user?.email ?? invoice.guestEmail ?? "";
  const currency = invoice.currency ?? "usd";
  const isPaid =
    invoice.status === "PAID" ||
    invoice.amountPaidCents >= invoice.totalCents;

  return (
    <main>
      <Nav background="white" />
      <LayoutWrapper>
        <div className={styles.wrap}>
          <div className={styles.card}>
            {voided ? (
              <>
                <div className={`${styles.mark} ${styles.markNeutral}`}>—</div>
                <h1 className={styles.title}>This invoice was voided</h1>
                <p className={styles.sub}>
                  Invoice {invoice.invoiceNumber} is no longer payable. If you
                  think this is a mistake, please reach out to us.
                </p>
              </>
            ) : (
              <>
                <div className={styles.mark}>✓</div>
                <h1 className={styles.title}>
                  {isPaid ? "Payment received" : "Thank you"}
                </h1>
                <p className={styles.sub}>
                  {isPaid
                    ? `Invoice ${invoice.invoiceNumber} is paid in full.`
                    : `We've recorded your payment for invoice ${invoice.invoiceNumber}.`}
                </p>

                <div className={styles.receiptBox}>
                  <div className={styles.receiptRow}>
                    <span>Invoice</span>
                    <span>{invoice.invoiceNumber}</span>
                  </div>
                  <div className={styles.receiptRow}>
                    <span>Amount paid</span>
                    <span>
                      {fmt(
                        Math.max(invoice.amountPaidCents, invoice.totalCents),
                        currency,
                      )}
                    </span>
                  </div>
                  {invoice.tipCents > 0 && (
                    <div className={styles.receiptRow}>
                      <span>Includes tip</span>
                      <span>{fmt(invoice.tipCents, currency)}</span>
                    </div>
                  )}
                </div>

                {email && (
                  <p className={styles.emailNote}>
                    A receipt is on its way to <strong>{email}</strong>.
                  </p>
                )}
              </>
            )}

            <div className={styles.actions}>
              <Button href="/" btnType="blackReg" text="Back to home" />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </main>
  );
}