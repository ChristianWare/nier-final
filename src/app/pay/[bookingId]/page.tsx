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
      // ✅ Include stops
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
      // Recalculate live from siblings (same pattern as the admin page)
      effectiveTotalCents = tripGroup.bookings.reduce(
        (sum, b) => sum + b.totalCents,
        0,
      );
      effectiveAmountPaidCents = tripGroup.amountPaidCents;
    }
  }

  // Check if already fully paid
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
  const isBalancePayment = amountPaidCents > 0 && balanceDueCents > 0;

  const customerName = booking.user?.name ?? booking.guestName ?? "Guest";
  const customerEmail = booking.user?.email ?? booking.guestEmail ?? "";

  // ✅ Prepare stops for client
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
        stopSurchargeCents={booking.stopSurchargeCents ?? 0}
        baseFareCents={isBalancePayment ? balanceDueCents : effectiveTotalCents}
        currency={booking.currency ?? "usd"}
        customerName={customerName}
        customerEmail={customerEmail}
        isBalancePayment={isBalancePayment}
        amountPaidCents={amountPaidCents}
        totalBookingCents={effectiveTotalCents}
        savedCard={savedCard}
      />
    </main>
  );
}
