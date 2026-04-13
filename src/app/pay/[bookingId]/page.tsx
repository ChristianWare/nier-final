/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Nav from "@/components/shared/Nav/Nav";
import CheckoutClient from "./CheckoutClient";
import { getStripePublishableKey } from "@/lib/stripe";
import { getSavedCardForBooking } from "../../../../actions/payments/chargeCardOnFileForCheckout";
import { getCompanySettings } from "../../../../actions/admin/companySettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ bookingId: string }>;
  searchParams?: Promise<{ token?: string }>;
};

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { bookingId } = await params;
  const sp = (await searchParams) ?? {};
  const token = sp.token ?? null;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      serviceType: { select: { id: true, name: true } },
      vehicle: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
      payment: {
        select: {
          id: true,
          status: true,
          amountPaidCents: true,
          amountTotalCents: true,
        },
      },
      stops: {
        orderBy: { stopOrder: "asc" },
        select: {
          id: true,
          stopOrder: true,
          address: true,
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  // ── Group booking: use group total instead of individual leg total ──
  // Must be declared BEFORE deposit fields since isDepositAlreadyPaid depends on it
  let effectiveTotalCents = booking.totalCents;
  let effectiveAmountPaidCents = booking.payment?.amountPaidCents ?? 0;

  if (booking.tripGroupId) {
    const tripGroup = await db.tripGroup.findUnique({
      where: { id: booking.tripGroupId },
      include: {
        bookings: { select: { totalCents: true } },
      },
    });
    if (tripGroup) {
      effectiveTotalCents = tripGroup.bookings.reduce(
        (sum, b) => sum + b.totalCents,
        0,
      );
      effectiveAmountPaidCents = tripGroup.amountPaidCents;
    }
  }

  // ── Deposit fields ── (declared after effectiveTotalCents is computed)
  const depositMode = (booking as any).depositMode ?? false;
  const depositPercent = (booking as any).depositPercent ?? null;

  // Always calculate deposit/balance from the effective (group) total,
  // not from the stale cached values on the single-leg booking row
  const depositCents =
    depositMode && depositPercent != null
      ? Math.round((effectiveTotalCents * depositPercent) / 100)
      : ((booking as any).depositCents ?? null);

  const balanceCents =
    depositMode && depositPercent != null && depositCents != null
      ? effectiveTotalCents - depositCents
      : ((booking as any).balanceCents ?? null);

  const depositDueDate =
    (booking as any).depositDueDate instanceof Date
      ? (booking as any).depositDueDate.toISOString()
      : ((booking as any).depositDueDate ?? null);
  const balanceDueDate =
    (booking as any).balanceDueDate instanceof Date
      ? (booking as any).balanceDueDate.toISOString()
      : ((booking as any).balanceDueDate ?? null);

  // Deposit is considered paid if the customer has already paid at least the deposit amount
  const isDepositAlreadyPaid =
    depositMode &&
    depositCents != null &&
    effectiveAmountPaidCents >= depositCents;

  // ── Payment state ──
  const amountPaidCents = effectiveAmountPaidCents;
  const isFullyPaid =
    amountPaidCents >= effectiveTotalCents && effectiveTotalCents > 0;

  if (isFullyPaid) {
    redirect(`/pay/${bookingId}/success?already_paid=1`);
  }

  // Check if booking is in a valid state for payment
  const invalidStatuses = [
    "CANCELLED",
    "NO_SHOW",
    "REFUNDED",
    "PENDING_REVIEW",
    "DRAFT",
    "DECLINED",
  ];
  if (invalidStatuses.includes(booking.status)) {
    redirect(`/pay/${bookingId}/error?reason=invalid_status`);
  }

  // Calculate balance if partial payment exists
  const balanceDueCents = effectiveTotalCents - amountPaidCents;

  // isBalancePayment is true when there's a partial payment that isn't
  // just a deposit waiting to be completed — i.e. the deposit is already
  // paid and now there's a remaining balance to collect.
  const isBalancePayment = amountPaidCents > 0 && balanceDueCents > 0;

  const customerName =
    booking.user?.name ?? (booking as any).guestName ?? "Guest";
  const customerEmail =
    booking.user?.email ?? (booking as any).guestEmail ?? "";

  const stops = booking.stops.map((s) => ({
    id: s.id,
    stopOrder: s.stopOrder,
    address: s.address,
  }));

  const [stripePublishableKey, savedCard, companySettings] = await Promise.all([
    getStripePublishableKey(),
    getSavedCardForBooking(bookingId),
    getCompanySettings(),
  ]);

  const timezone = companySettings.timezone ?? "America/Phoenix";

  // Fetch sibling legs for multi-trip display
  let groupLegs: Array<{
    legNumber: number;
    pickupAt: string;
    pickupAddress: string;
    dropoffAddress: string;
    serviceName: string;
    totalCents: number;
  }> = [];

  if (booking.tripGroupId) {
    const siblings = await db.booking.findMany({
      where: { tripGroupId: booking.tripGroupId },
      select: {
        id: true,
        pickupAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        totalCents: true,
        serviceType: { select: { name: true } },
      },
      orderBy: { pickupAt: "asc" },
    });
    groupLegs = siblings.map((s, idx) => ({
      legNumber: idx + 1,
      pickupAt: s.pickupAt.toISOString(),
      pickupAddress: s.pickupAddress,
      dropoffAddress: s.dropoffAddress,
      serviceName: s.serviceType?.name ?? "Transportation",
      totalCents: s.totalCents,
    }));
  }

  // The base fare shown to the customer depends on payment mode:
  // - If deposit is already paid → show the balance due
  // - Otherwise → show the full booking total (the deposit choice screen
  //   in CheckoutClient handles showing the deposit vs full split)
  const baseFareCents = isBalancePayment
    ? balanceDueCents
    : effectiveTotalCents;

  return (
    <main>
      <Nav background='white' />
      <CheckoutClient
        groupLegs={groupLegs}
        stripePublishableKey={stripePublishableKey ?? ""}
        bookingId={booking.id}
        timezone={timezone}
        serviceName={booking.serviceType?.name ?? "Transportation"}
        vehicleName={booking.vehicle?.name ?? "Vehicle"}
        pickupAt={booking.pickupAt.toISOString()}
        pickupAddress={booking.pickupAddress}
        dropoffAddress={booking.dropoffAddress}
        stops={stops}
        stopSurchargeCents={(booking as any).stopSurchargeCents ?? 0}
        baseFareCents={baseFareCents}
        currency={(booking as any).currency ?? "usd"}
        customerName={customerName}
        customerEmail={customerEmail}
        isBalancePayment={isBalancePayment}
        amountPaidCents={amountPaidCents}
        totalBookingCents={effectiveTotalCents}
        savedCard={savedCard}
        depositMode={depositMode}
        depositCents={depositCents}
        depositPercent={depositPercent}
        balanceCents={balanceCents}
        depositDueDate={depositDueDate}
        balanceDueDate={balanceDueDate}
        isDepositAlreadyPaid={isDepositAlreadyPaid}
      />
    </main>
  );
}
