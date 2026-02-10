/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import BillingClient from "./BillingClient";

export const metadata = { title: "Billing | Corporate" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;

function startOfMonthPhoenix(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function startOfNextMonthPhoenix(monthStartUtc: Date) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const nextLocalMs = Date.UTC(y, m + 1, 1, 0, 0, 0);
  return new Date(nextLocalMs - PHX_OFFSET_MS);
}

export default async function CorporateBillingPage() {
  noStore();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user.id },
    select: {
      corporateAccount: {
        select: {
          id: true,
          name: true,
          billingEmail: true,
          billingCycle: true,
          paymentMethod: true,
          paymentTerms: true,
          discountPercent: true,
          monthlyLimitCents: true,
        },
      },
    },
  });

  if (!contact?.corporateAccount) redirect("/");

  const account = contact.corporateAccount;
  const now = new Date();
  const monthStart = startOfMonthPhoenix(now);
  const nextMonthStart = startOfNextMonthPhoenix(monthStart);
  const cancelledStatuses = ["CANCELLED", "REFUNDED", "NO_SHOW"] as any;

  // ─── Parallel data fetching ───
  const [invoices, spendThisMonthAgg, spendAllTimeAgg, ridesThisMonth] =
    await Promise.all([
      // All invoices — include first line item to get booking ID
      db.corporateInvoice.findMany({
        where: { corporateAccountId: account.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalCents: true,
          amountPaidCents: true,
          periodStart: true,
          periodEnd: true,
          dueDate: true,
          sentAt: true,
          paidAt: true,
          createdAt: true,
          _count: { select: { lineItems: true } },
          lineItems: {
            select: { bookingId: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      }),

      // Spend this month
      (db.booking as any).aggregate({
        where: {
          corporateAccountId: account.id,
          pickupAt: { gte: monthStart, lt: nextMonthStart },
          NOT: { status: { in: cancelledStatuses } },
        },
        _sum: { totalCents: true },
      }),

      // Spend all time
      (db.booking as any).aggregate({
        where: {
          corporateAccountId: account.id,
          NOT: { status: { in: cancelledStatuses } },
        },
        _sum: { totalCents: true },
      }),

      // Rides this month
      db.booking.count({
        where: {
          corporateAccountId: account.id,
          pickupAt: { gte: monthStart, lt: nextMonthStart },
          NOT: { status: { in: cancelledStatuses } },
        },
      }),
    ]);

  const spendThisMonthCents = Number(spendThisMonthAgg?._sum?.totalCents ?? 0);
  const spendAllTimeCents = Number(spendAllTimeAgg?._sum?.totalCents ?? 0);

  // Outstanding balance (sum of unpaid invoices)
  const outstandingCents = invoices.reduce((sum, inv) => {
    if (["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)) {
      return sum + (Number(inv.totalCents) - Number(inv.amountPaidCents ?? 0));
    }
    return sum;
  }, 0);

  const serializedInvoices = invoices.map((inv) => {
    const firstBookingId = inv.lineItems[0]?.bookingId ?? null;

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      bookingConfirmation: firstBookingId
        ? firstBookingId.slice(0, 8).toUpperCase()
        : null,
      status: inv.status,
      totalCents: Number(inv.totalCents),
      amountPaidCents: Number(inv.amountPaidCents ?? 0),
      periodStart: inv.periodStart?.toISOString() ?? "",
      periodEnd: inv.periodEnd?.toISOString() ?? "",
      dueDate: inv.dueDate?.toISOString() ?? "",
      sentAt: inv.sentAt?.toISOString() ?? "",
      paidAt: inv.paidAt?.toISOString() ?? "",
      createdAt: inv.createdAt.toISOString(),
      lineItemCount: inv._count.lineItems,
    };
  });

  return (
    <BillingClient
      account={{
        billingEmail: account.billingEmail,
        billingCycle: account.billingCycle,
        paymentMethod: account.paymentMethod,
        paymentTerms: account.paymentTerms,
        discountPercent: account.discountPercent
          ? Number(account.discountPercent)
          : null,
        monthlyLimitCents: account.monthlyLimitCents
          ? Number(account.monthlyLimitCents)
          : null,
      }}
      invoices={serializedInvoices}
      spendThisMonthCents={spendThisMonthCents}
      spendAllTimeCents={spendAllTimeCents}
      outstandingCents={outstandingCents}
      ridesThisMonth={ridesThisMonth}
    />
  );
}
