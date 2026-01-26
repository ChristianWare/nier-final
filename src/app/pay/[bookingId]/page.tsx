/* eslint-disable @typescript-eslint/no-unused-vars */
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Nav from "@/components/shared/Nav/Nav";
import CheckoutClient from "./CheckoutClient";

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
    },
  });

  if (!booking) {
    notFound();
  }

  // Check if already fully paid
  const amountPaidCents = booking.payment?.amountPaidCents ?? 0;
  const isFullyPaid =
    amountPaidCents >= (booking.totalCents ?? 0) && booking.totalCents > 0;

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
  const balanceDueCents = booking.totalCents - amountPaidCents;
  const isBalancePayment = amountPaidCents > 0 && balanceDueCents > 0;

  const customerName = booking.user?.name ?? booking.guestName ?? "Guest";
  const customerEmail = booking.user?.email ?? booking.guestEmail ?? "";

  return (
    <main>
      <Nav background='white' />
      <CheckoutClient
        bookingId={booking.id}
        serviceName={booking.serviceType?.name ?? "Transportation"}
        vehicleName={booking.vehicle?.name ?? "Vehicle"}
        pickupAt={booking.pickupAt.toISOString()}
        pickupAddress={booking.pickupAddress}
        dropoffAddress={booking.dropoffAddress}
        baseFareCents={isBalancePayment ? balanceDueCents : booking.totalCents}
        currency={booking.currency ?? "usd"}
        customerName={customerName}
        customerEmail={customerEmail}
        isBalancePayment={isBalancePayment}
        amountPaidCents={amountPaidCents}
        totalBookingCents={booking.totalCents}
      />
    </main>
  );
}
