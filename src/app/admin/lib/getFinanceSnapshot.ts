/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

function sumCents(rows: Array<{ amountTotalCents: number }>) {
  let s = 0;
  for (const r of rows) s += Number(r.amountTotalCents ?? 0);
  return s;
}

export async function getAdminFinanceSnapshot(currency = "USD") {
  const now = new Date();
  const { timezone: companyTz } = await getCompanySettings();

  const todayStart = tz.startOfDay(now, companyTz);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const thisMonthStart = tz.startOfMonth(now, companyTz);
  const nextMonthStart = tz.addMonths(thisMonthStart, 1, companyTz);

  const prevMonthStart = tz.addMonths(thisMonthStart, -1, companyTz);
  const prevMonthNext = thisMonthStart;

  const paidMonth = await db.payment.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: thisMonthStart, lt: nextMonthStart },
    },
    select: { amountTotalCents: true },
  });

  const paidToday = await db.payment.findMany({
    where: { status: "PAID", paidAt: { gte: todayStart, lt: tomorrowStart } },
    select: { amountTotalCents: true },
  });

  const paidPrev = await db.payment.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: prevMonthStart, lt: prevMonthNext },
    },
    select: { amountTotalCents: true },
  });

  const pendingBookings = await db.booking.findMany({
    where: {
      status: "PENDING_PAYMENT",
      pickupAt: { gte: thisMonthStart, lt: nextMonthStart },
    },
    select: { totalCents: true },
  });

  const refundsMonth = await db.payment.findMany({
    where: {
      status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
      updatedAt: { gte: thisMonthStart, lt: nextMonthStart },
    },
    select: { amountTotalCents: true },
  });

  const capturedMonthCents = sumCents(paidMonth as any);
  const capturedTodayCents = sumCents(paidToday as any);

  const paidCountMonth = paidMonth.length;
  const avgOrderValueMonthCents =
    paidCountMonth > 0 ? Math.round(capturedMonthCents / paidCountMonth) : 0;

  const refundsMonthCents = sumCents(refundsMonth as any);
  const refundCountMonth = refundsMonth.length;

  const pendingPaymentCount = pendingBookings.length;
  const pendingPaymentAmountCents = pendingBookings.reduce(
    (s, b) => s + Number(b.totalCents ?? 0),
    0,
  );

  const netMonth = Math.max(0, capturedMonthCents - refundsMonthCents);
  const prevNet = Math.max(0, sumCents(paidPrev as any));
  const monthOverMonthPct =
    prevNet > 0 ? ((netMonth - prevNet) / prevNet) * 100 : null;

  return {
    monthLabel: tz.formatMonthLabel(now, companyTz),
    currency,
    capturedMonthCents,
    capturedTodayCents,
    paidCountMonth,
    avgOrderValueMonthCents,
    refundsMonthCents,
    refundCountMonth,
    pendingPaymentCount,
    pendingPaymentAmountCents,
    monthOverMonthPct,
  };
}
