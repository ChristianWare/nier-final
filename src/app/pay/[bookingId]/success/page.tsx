import { db } from "@/lib/db";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import PaymentSuccessClient from "./Paymentsuccessclient";
import Button from "@/components/shared/Button/Button";
import styles from "./PaymentSuccess.module.css";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import InvoiceSection from "@/app/dashboard/trips/[id]/InvoiceSection";
import type { InvoiceData, InvoiceLineItem } from "@/lib/invoice/types";
import { formatInvoiceDate, formatTripDateTime } from "@/lib/invoice/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ bookingId: string }>;
  searchParams?: Promise<{
    payment_intent?: string;
    redirect_status?: string;
    already_paid?: string;
  }>;
};

function buildPaymentMethodDisplay(
  payment: {
    stripePaymentIntentId?: string | null;
  } | null,
): string | null {
  if (!payment) return null;
  if (payment.stripePaymentIntentId) return "Credit Card (online)";
  return "Manual Payment (Cash)";
}

function decimalToNumber(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    return (val as { toNumber: () => number }).toNumber();
  }
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: Props) {
  const { bookingId } = await params;
  const sp = (await searchParams) ?? {};
  const redirectStatus = sp.redirect_status ?? null;
  const alreadyPaid = sp.already_paid === "1";

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      user: { select: { name: true, email: true, phone: true } },
      payment: {
        select: {
          status: true,
          amountPaidCents: true,
          amountTotalCents: true,
          tipCents: true,
          amountRefundedCents: true,
          paidAt: true,
          stripePaymentIntentId: true,
        },
      },
      stops: {
        orderBy: { stopOrder: "asc" },
        select: { address: true, stopOrder: true },
      },
      tripGroup: {
        include: {
          bookings: {
            select: {
              id: true,
              pickupAt: true,
              pickupAddress: true,
              dropoffAddress: true,
              totalCents: true,
              serviceType: { select: { name: true } },
            },
            orderBy: { pickupAt: "asc" },
          },
        },
      },
    },
  });

  if (!booking) {
    return (
      <main>
        <Nav background='white' />
        <section className={styles.container}>
          <LayoutWrapper>
            <div className={styles.singleContent}>
              <div className={styles.card}>
                <div className={styles.iconError}>
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <circle cx='12' cy='12' r='10' />
                    <line x1='15' y1='9' x2='9' y2='15' />
                    <line x1='9' y1='9' x2='15' y2='15' />
                  </svg>
                </div>
                <h1 className={styles.title}>Booking Not Found</h1>
                <p className={styles.subtitle}>
                  We couldn&#39;t find this booking. Please contact support if
                  you believe this is an error.
                </p>
                <div className={styles.actions}>
                  <Button href='/' text='Return Home' btnType='black' arrow />
                </div>
              </div>
            </div>
          </LayoutWrapper>
        </section>
      </main>
    );
  }

  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone ?? "America/Phoenix";

  const isPaid = booking.payment?.status === "PAID";
  const paymentFailed = redirectStatus === "failed";

  const pickupDate = booking.pickupAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: companyTz,
  });
  const pickupTime = booking.pickupAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: companyTz,
  });

  if (paymentFailed) {
    return (
      <main>
        <Nav background='white' />
        <section className={styles.container}>
          <LayoutWrapper>
            <div className={styles.singleContent}>
              <div className={styles.card}>
                <div className={styles.iconError}>
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                  >
                    <circle cx='12' cy='12' r='10' />
                    <line x1='15' y1='9' x2='9' y2='15' />
                    <line x1='9' y1='9' x2='15' y2='15' />
                  </svg>
                </div>
                <h1 className={styles.title}>Payment Failed</h1>
                <p className={styles.subtitle}>
                  Your payment could not be processed. Please try again or use a
                  different payment method.
                </p>
                <div className={styles.actions}>
                  <Button
                    href={`/pay/${bookingId}`}
                    text='Try Again'
                    btnType='black'
                    arrow
                  />
                  <Button href='/' text='Return Home' btnType='red' arrow />
                </div>
              </div>
            </div>
          </LayoutWrapper>
        </section>
      </main>
    );
  }

  // ── Build invoice data ──
  let invoiceData: InvoiceData | null = null;

  const amountPaidCents = booking.payment?.amountPaidCents ?? 0;
  const amountRefundedCents = booking.payment?.amountRefundedCents ?? 0;
  const tipCents = booking.payment?.tipCents ?? 0;

  const invoiceCustomerName =
    booking.user?.name?.trim() ||
    booking.guestName?.trim() ||
    booking.user?.email ||
    booking.guestEmail ||
    "Guest";

  const invoiceCustomerEmail = booking.user?.email || booking.guestEmail || "";
  const invoiceCustomerPhone =
    booking.user?.phone?.trim() || booking.guestPhone?.trim() || null;

  if (booking.tripGroup && isPaid) {
    // Multi-leg group invoice
    const siblings = booking.tripGroup.bookings;
    const groupTotal = siblings.reduce((sum, b) => sum + b.totalCents, 0);
    const groupInvoiceNumber = booking.tripGroup.id.slice(0, 8).toUpperCase();

    invoiceData = {
      invoiceNumber: groupInvoiceNumber,
      invoiceDate: formatInvoiceDate(booking.createdAt),
      paidDate: booking.payment?.paidAt
        ? formatInvoiceDate(booking.payment.paidAt)
        : null,
      logoUrl: (companySettings as Record<string, unknown>).logoUrl as
        | string
        | undefined,
      company: {
        name: companySettings.officeName || "Nier Transportation",
        address: companySettings.officeAddress || "",
        city: companySettings.officeCity || "",
        phone: companySettings.dispatchPhone || "",
        email: companySettings.supportEmail || "",
      },
      customer: {
        name: invoiceCustomerName,
        email: invoiceCustomerEmail,
        phone: invoiceCustomerPhone,
      },
      trip: {
        date: formatTripDateTime(
          siblings[0]?.pickupAt ?? booking.pickupAt,
          companyTz,
        ),
        pickupAddress: siblings[0]?.pickupAddress ?? booking.pickupAddress,
        dropoffAddress:
          siblings[siblings.length - 1]?.dropoffAddress ??
          booking.dropoffAddress,
        stops: [],
        serviceName: "Multi-leg Trip",
        vehicleName: `${siblings.length} rides`,
        passengers: booking.passengers,
        luggage: booking.luggage,
        distanceMiles: null,
        durationMinutes: null,
      },
      lineItems: siblings.map((sibling, idx) => ({
        description: `Ride ${idx + 1}: ${sibling.serviceType.name} — ${formatTripDateTime(sibling.pickupAt, companyTz)}`,
        amount: sibling.totalCents,
      })),
      legs: siblings.map((sibling, idx) => ({
        legNumber: idx + 1,
        date: formatTripDateTime(sibling.pickupAt, companyTz),
        pickupAddress: sibling.pickupAddress,
        dropoffAddress: sibling.dropoffAddress,
        serviceName: sibling.serviceType.name,
        amountCents: sibling.totalCents,
      })),
      subtotalCents: groupTotal,
      feesCents: 0,
      taxesCents: 0,
      totalCents: groupTotal,
      tipCents,
      amountPaidCents: groupTotal,
      amountRefundedCents: 0,
      currency: booking.currency ?? "usd",
      paymentMethodDisplay: buildPaymentMethodDisplay(booking.payment),
      bookingConfirmation: groupInvoiceNumber,
    };
  } else if (isPaid) {
    // Single ride invoice
    const stopCount = booking.stops?.length ?? 0;
    const stopSurchargeCents = booking.stopSurchargeCents ?? stopCount * 1500;
    const baseFareCents = booking.subtotalCents - stopSurchargeCents;

    const lineItems: InvoiceLineItem[] = [];

    lineItems.push({
      description: `${booking.serviceType?.name ?? "Transportation"} - ${booking.vehicle?.name ?? "Vehicle"}`,
      amount: baseFareCents,
    });

    if (stopCount > 0 && stopSurchargeCents > 0) {
      lineItems.push({
        description: `Extra Stop${stopCount > 1 ? "s" : ""} (${stopCount} × $15.00)`,
        amount: stopSurchargeCents,
      });
    }

    if (booking.feesCents > 0) {
      lineItems.push({ description: "Service Fee", amount: booking.feesCents });
    }

    if (booking.taxesCents > 0) {
      lineItems.push({ description: "Tax", amount: booking.taxesCents });
    }

    const invoiceAmountPaidCents =
      Math.abs(amountPaidCents - booking.totalCents) <= 100
        ? amountPaidCents + tipCents
        : amountPaidCents;

    invoiceData = {
      invoiceNumber: booking.id.slice(0, 8).toUpperCase(),
      invoiceDate: formatInvoiceDate(booking.createdAt),
      paidDate: booking.payment?.paidAt
        ? formatInvoiceDate(booking.payment.paidAt)
        : null,
      logoUrl: (companySettings as Record<string, unknown>).logoUrl as
        | string
        | undefined,
      company: {
        name: companySettings.officeName || "Nier Transportation",
        address: companySettings.officeAddress || "",
        city: companySettings.officeCity || "",
        phone: companySettings.dispatchPhone || "",
        email: companySettings.supportEmail || "",
      },
      customer: {
        name: invoiceCustomerName,
        email: invoiceCustomerEmail,
        phone: invoiceCustomerPhone,
      },
      trip: {
        date: formatTripDateTime(booking.pickupAt, companyTz),
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        stops: booking.stops.map((s) => ({
          address: s.address,
          stopOrder: s.stopOrder,
        })),
        serviceName: booking.serviceType?.name ?? "Transportation",
        vehicleName: booking.vehicle?.name ?? "Vehicle",
        passengers: booking.passengers,
        luggage: booking.luggage,
        distanceMiles: decimalToNumber(booking.distanceMiles),
        durationMinutes: booking.durationMinutes,
      },
      lineItems,
      subtotalCents: booking.subtotalCents,
      feesCents: booking.feesCents,
      taxesCents: booking.taxesCents,
      totalCents: booking.totalCents,
      tipCents,
      amountPaidCents: invoiceAmountPaidCents,
      amountRefundedCents,
      currency: booking.currency ?? "usd",
      paymentMethodDisplay: buildPaymentMethodDisplay(booking.payment),
      bookingConfirmation: booking.id.slice(0, 8).toUpperCase(),
    };
  }

  return (
    <main>
      <Nav background='white' />
      <PaymentSuccessClient />
      <section className={styles.container}>
        <LayoutWrapper>
          <div className={invoiceData ? styles.twoCol : styles.singleContent}>
            {/* ── LEFT: Success summary ── */}
            <div className={styles.left}>
              <div className={styles.card}>
                <div className={styles.iconSuccess}>
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2.5'
                  >
                    <path
                      d='M20 6L9 17l-5-5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </div>

                <h1 className={styles.title}>
                  {alreadyPaid ? "Already Paid" : "Payment Successful!"}
                </h1>
                <p className={styles.subtitle}>
                  {alreadyPaid
                    ? "This booking has already been paid. You're all set!"
                    : "Thank you for your payment. Your reservation is confirmed."}
                </p>

                <div className={styles.confirmationBox}>
                  <div className={styles.confirmationHeader}>
                    <span className={styles.confirmationLabel}>
                      Confirmation Number
                    </span>
                    <span className={styles.confirmationId}>
                      {bookingId.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className={styles.tripSummary}>
                  <h2 className={styles.tripTitle}>Trip Details</h2>

                  <div className={styles.tripRow}>
                    <div className={styles.tripIcon}>🚗</div>
                    <div className={styles.tripInfo}>
                      <span className={styles.tripLabel}>Service</span>
                      <span className={styles.tripValue}>
                        {booking.serviceType?.name} • {booking.vehicle?.name}
                      </span>
                    </div>
                  </div>

                  <div className={styles.tripRow}>
                    <div className={styles.tripIcon}>📅</div>
                    <div className={styles.tripInfo}>
                      <span className={styles.tripLabel}>Pickup Time</span>
                      <span className={styles.tripValue}>
                        {pickupDate} at {pickupTime}
                      </span>
                    </div>
                  </div>

                  <div className={styles.tripRow}>
                    <div className={styles.tripIcon}>📍</div>
                    <div className={styles.tripInfo}>
                      <span className={styles.tripLabel}>Pickup Location</span>
                      <span className={styles.tripValue}>
                        {booking.pickupAddress}
                      </span>
                    </div>
                  </div>

                  <div className={styles.tripRow}>
                    <div className={styles.tripIcon}>🏁</div>
                    <div className={styles.tripInfo}>
                      <span className={styles.tripLabel}>Dropoff Location</span>
                      <span className={styles.tripValue}>
                        {booking.dropoffAddress}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.nextSteps}>
                  <h3 className={styles.nextStepsTitle}>What&#39;s Next?</h3>
                  <ul className={styles.nextStepsList}>
                    <li>
                      A confirmation email has been sent to your email address
                    </li>
                    <li>Your driver will contact you before pickup</li>
                    <li>You can track your ride status in your dashboard</li>
                  </ul>
                </div>

                <div className={styles.actions}>
                  <Button
                    href='/dashboard'
                    text='Go to Dashboard'
                    btnType='black'
                    arrow
                  />
                  <Button
                    href='/book'
                    text='Book Another Ride'
                    btnType='red'
                    arrow
                  />
                </div>

                <p className={styles.helpText}>
                  Questions? Contact us at{" "}
                  <a
                    href='mailto:support@niertransportation.com'
                    className={styles.helpLink}
                  >
                    support@niertransportation.com
                  </a>
                </p>
              </div>
            </div>

            {/* ── RIGHT: Invoice preview ── */}
            {invoiceData && (
              <div className={styles.right}>
                <div className={styles.invoiceWrapper}>
                  <InvoiceSection invoice={invoiceData} bookingId={bookingId} />
                </div>
              </div>
            )}
          </div>
        </LayoutWrapper>
      </section>
    </main>
  );
}
