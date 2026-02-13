// src/app/book/track/page.tsx
import styles from "./Track.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "../../../../auth";
import { BookingStatus } from "@prisma/client";
import { getCompanySettings } from "../../../../actions/admin/companySettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProgressStep = {
  number: string;
  title: string;
  description: string;
  status: "complete" | "current" | "upcoming";
};

function getProgressSteps(bookingStatus: BookingStatus): ProgressStep[] {
  const isPendingReview = bookingStatus === "PENDING_REVIEW";
  const isPendingPayment = bookingStatus === "PENDING_PAYMENT";
  const isDeclined = bookingStatus === "DECLINED";
  const isPaidOrBeyond = [
    "CONFIRMED",
    "ASSIGNED",
    "EN_ROUTE",
    "ARRIVED",
    "IN_PROGRESS",
    "COMPLETED",
  ].includes(bookingStatus);
  const isCancelled =
    bookingStatus === "CANCELLED" || bookingStatus === "NO_SHOW";

  if (isDeclined || isCancelled) {
    return [];
  }

  return [
    {
      number: "✓",
      title: "Request Received",
      description: "We've got your booking request",
      status: "complete",
    },
    {
      number: isPendingReview ? "⏳" : "✓",
      title: "Review",
      description: isPendingReview
        ? "Our team is reviewing your request"
        : "Your request has been reviewed",
      status: isPendingReview ? "current" : "complete",
    },
    {
      number: isPendingPayment ? "⏳" : isPaidOrBeyond ? "✓" : "3",
      title: "Payment",
      description: isPendingPayment
        ? "Complete your payment to confirm"
        : isPaidOrBeyond
          ? "Payment received"
          : "We'll send a payment link once approved",
      status: isPendingPayment
        ? "current"
        : isPaidOrBeyond
          ? "complete"
          : "upcoming",
    },
    {
      number: isPaidOrBeyond ? "✓" : "4",
      title: "Confirmed!",
      description: isPaidOrBeyond
        ? "Your ride is confirmed"
        : "After payment, your ride is confirmed",
      status: isPaidOrBeyond ? "complete" : "upcoming",
    },
  ];
}

function getStatusDisplay(status: BookingStatus): {
  label: string;
  tone: "blue" | "yellow" | "green" | "red" | "gray";
  message: string;
} {
  switch (status) {
    case "PENDING_REVIEW":
      return {
        label: "Pending Review",
        tone: "blue",
        message:
          "Our team is reviewing your request. We'll email you once it's approved.",
      };
    case "PENDING_PAYMENT":
      return {
        label: "Approved – Awaiting Payment",
        tone: "yellow",
        message:
          "Great news! Your request has been approved. Check your email for the payment link.",
      };
    case "CONFIRMED":
      return {
        label: "Confirmed",
        tone: "green",
        message: "Your ride is confirmed! We'll assign a driver soon.",
      };
    case "ASSIGNED":
      return {
        label: "Driver Assigned",
        tone: "green",
        message: "A driver has been assigned to your trip.",
      };
    case "EN_ROUTE":
      return {
        label: "Driver En Route",
        tone: "green",
        message: "Your driver is on the way to pick you up!",
      };
    case "ARRIVED":
      return {
        label: "Driver Arrived",
        tone: "green",
        message: "Your driver has arrived at the pickup location.",
      };
    case "IN_PROGRESS":
      return {
        label: "In Progress",
        tone: "green",
        message: "Your trip is in progress. Enjoy your ride!",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        tone: "gray",
        message: "This trip has been completed. Thank you for riding with us!",
      };
    case "DECLINED":
      return {
        label: "Declined",
        tone: "red",
        message:
          "Unfortunately, we were unable to accommodate this request. Please contact us for more information.",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        tone: "gray",
        message: "This booking has been cancelled.",
      };
    case "NO_SHOW":
      return {
        label: "No Show",
        tone: "red",
        message: "This booking was marked as a no-show.",
      };
    default:
      return {
        label: String(status).replace(/_/g, " "),
        tone: "gray",
        message: "",
      };
  }
}

function formatDateTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

export default async function TrackPage({
  searchParams,
}: {
  searchParams?: Promise<{ t?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const t = (sp.t ?? "").trim();

  if (!t) {
    return (
      <main>
        <Nav background='white' />
        <LayoutWrapper>
          <section className={styles.container}>
            <div className={styles.card}>
              <h1 className={`${styles.heading} cardTitle h2`}>Track your request</h1>
              <p className={styles.subheading}>Missing tracking token.</p>
              <Link href='/book' className={styles.primary}>
                Back to booking
              </Link>
            </div>
          </section>
        </LayoutWrapper>
      </main>
    );
  }

  const { timezone: companyTz } = await getCompanySettings();

  const booking = await db.booking.findFirst({
    where: { guestClaimToken: t },
    select: {
      id: true,
      status: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      passengers: true,
      luggage: true,
      createdAt: true,
      guestEmail: true,
      guestPhone: true,
      totalCents: true,
      currency: true,
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      payment: {
        select: {
          status: true,
          checkoutUrl: true,
        },
      },
    },
  });

  if (!booking) {
    return (
      <main>
        <Nav background='white' />
        <LayoutWrapper>
          <section className={styles.container}>
            <div className={styles.card}>
              <h1 className={`${styles.heading} cardTitle h2`}>Not found</h1>
              <p className={styles.subheading}>
                This tracking link is invalid or expired.
              </p>
              <Link href='/book' className={styles.primary}>
                Back to booking
              </Link>
            </div>
          </section>
        </LayoutWrapper>
      </main>
    );
  }

  const session = await auth();
  const isAuthed = Boolean(session?.user);

  const status = booking.status as BookingStatus;
  const statusDisplay = getStatusDisplay(status);
  const progressSteps = getProgressSteps(status);
  const confirmationCode = booking.id.slice(0, 8).toUpperCase();

  const showPaymentButton =
    status === "PENDING_PAYMENT" && booking.payment?.checkoutUrl;

  const isTerminal = ["COMPLETED", "CANCELLED", "NO_SHOW", "DECLINED"].includes(
    status,
  );

  return (
    <main>
      <Nav background='white' />
      <LayoutWrapper>
        <section className={styles.container}>
          <div className={styles.card}>
            <h1 className={`${styles.heading} cardTitle h2`}>Request Status</h1>

            <div className={styles.confirmationCode}>
              <span className={styles.confirmationLabel}>Confirmation #</span>
              <span className={styles.confirmationValue}>
                {confirmationCode}
              </span>
            </div>

            <div
              className={`${styles.statusBadge} ${styles[`status_${statusDisplay.tone}`]}`}
            >
              {statusDisplay.label}
            </div>

            {statusDisplay.message && (
              <p className={styles.statusMessage}>{statusDisplay.message}</p>
            )}

            {showPaymentButton && (
              <div className={styles.paymentSection}>
                <a
                  href={booking.payment!.checkoutUrl!}
                  className={styles.paymentButton}
                >
                  Complete Payment →
                </a>
              </div>
            )}

            {!isTerminal && progressSteps.length > 0 && (
              <div className={styles.progressSection}>
                <h3 className={styles.progressTitle}>Progress</h3>
                <div className={styles.progressSteps}>
                  {progressSteps.map((step, index) => (
                    <div key={index} className={styles.progressStep}>
                      <div
                        className={`${styles.stepNumber} ${styles[`step_${step.status}`]}`}
                      >
                        {step.number}
                      </div>
                      <div className={styles.stepContent}>
                        <div className={styles.stepTitle}>{step.title}</div>
                        <div className={styles.stepDescription}>
                          {step.description}
                        </div>
                      </div>
                      {index < progressSteps.length - 1 && (
                        <div className={styles.stepConnector} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.detailsSection}>
              <h3 className={styles.detailsTitle}>Trip Details</h3>
              <div className={styles.grid}>
                <div className={styles.gridItem}>
                  <div className={styles.k}>📅 Pickup</div>
                  <div className={styles.v}>
                    {formatDateTime(booking.pickupAt, companyTz)}
                  </div>
                </div>
                <div className={styles.gridItem}>
                  <div className={styles.k}>🚗 Service</div>
                  <div className={styles.v}>
                    {booking.serviceType?.name ?? "—"} •{" "}
                    {booking.vehicle?.name ?? "—"}
                  </div>
                </div>
                <div className={styles.gridItem}>
                  <div className={styles.k}>👥 Travelers</div>
                  <div className={styles.v}>
                    {booking.passengers} passenger
                    {booking.passengers !== 1 ? "s" : ""} • {booking.luggage}{" "}
                    bag{booking.luggage !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className={styles.gridItem}>
                  <div className={styles.k}>📍 Pickup Location</div>
                  <div className={styles.v}>{booking.pickupAddress}</div>
                </div>
                <div className={styles.gridItem}>
                  <div className={styles.k}>🏁 Dropoff Location</div>
                  <div className={styles.v}>{booking.dropoffAddress}</div>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              {!isAuthed ? (
                <>
                  <p className={styles.accountPrompt}>
                    Create an account to manage all your bookings in one place.
                  </p>
                  <div className={styles.actionButtons}>
                    <Link
                      href={`/register?next=${encodeURIComponent(`/book/track?t=${t}`)}`}
                      className={styles.primary}
                    >
                      Create account
                    </Link>
                    <Link
                      href={`/login?next=${encodeURIComponent(`/book/track?t=${t}`)}`}
                      className={styles.secondary}
                    >
                      Sign in
                    </Link>
                  </div>
                </>
              ) : (
                <Link href='/dashboard/trips' className={styles.primary}>
                  View all trips
                </Link>
              )}
            </div>

            <div className={styles.note}>
              Questions? Reply to your confirmation email or contact support.
            </div>
          </div>
        </section>
      </LayoutWrapper>
    </main>
  );
}