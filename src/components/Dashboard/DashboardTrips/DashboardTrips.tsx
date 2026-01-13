import styles from "./DashboardTrips.module.css";
import Link from "next/link";
import { Prisma, BookingStatus } from "@prisma/client";
import { cancelTrip } from "../../../../actions/bookings/cancelTrips"; 
import CancelTripButton from "../CancelTripButton/CancelTripButton";
import Button from "@/components/shared/Button/Button";

type Tab = "upcoming" | "past" | "drafts";

type Trip = Prisma.BookingGetPayload<{
  include: {
    serviceType: { select: { name: true; slug: true } };
    vehicle: { select: { name: true } };
    payment: { select: { status: true; checkoutUrl: true; receiptUrl: true } };
  };
}>;

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function moneyFromCents(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format((cents ?? 0) / 100);
  } catch {
    return `$${((cents ?? 0) / 100).toFixed(2)}`;
  }
}

function statusLabel(status: BookingStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return "Pending review";
    case "PENDING_PAYMENT":
      return "Payment due";
    case "CONFIRMED":
      return "Confirmed";
    case "ASSIGNED":
      return "Driver assigned";
    case "EN_ROUTE":
      return "Driver en route";
    case "ARRIVED":
      return "Driver arrived";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-show";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    case "DRAFT":
      return "Draft";
    default:
      return status;
  }
}

function badgeTone(status: BookingStatus) {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "neutral";
  if (status === "CONFIRMED" || status === "ASSIGNED") return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  if (status === "COMPLETED") return "good";
  return "neutral";
}

function canCancel(status: BookingStatus) {
  return (
    status === "DRAFT" ||
    status === "PENDING_REVIEW" ||
    status === "PENDING_PAYMENT" ||
    status === "CONFIRMED" ||
    status === "ASSIGNED"
  );
}

function showPayNow(status: BookingStatus, payment: Trip["payment"]) {
  if (!payment?.checkoutUrl) return false;
  if (status !== "PENDING_PAYMENT") return false;
  return (
    payment.status === "NONE" ||
    payment.status === "PENDING" ||
    payment.status === "FAILED"
  );
}

function primaryActionLabel(status: BookingStatus) {
  if (status === "DRAFT") return "Continue booking";
  return "View details";
}

function primaryActionHref(status: BookingStatus, id: string) {
  if (status === "DRAFT") return `/book?bookingId=${id}`;
  return `/dashboard/trips/${id}`;
}

function rebookHref(id: string) {
  return `/book?rebook=${id}`;
}

export default function DashboardTrips({
  tab,
  counts,
  trips,
}: {
  tab: Tab;
  counts: { upcoming: number; past: number; drafts: number };
  trips: Trip[];
}) {
  return (
    <section className="container" aria-label='My trips'>
      <header className="header">
        <h1 className={`${styles.heading} h2`}>My trips</h1>
        <p className={styles.subheading}>
          Manage upcoming rides, view history, and handle payments.
        </p>
        <nav className='tabs' aria-label='Trip filters'>
          <Link
            href={{ pathname: "/dashboard/trips", query: { tab: "upcoming" } }}
            className={`tab ${tab === "upcoming" ? "tabActive" : ""}`}
          >
            Upcoming <span className='count'>{counts.upcoming}</span>
          </Link>

          <Link
            href={{ pathname: "/dashboard/trips", query: { tab: "past" } }}
            className={`tab ${tab === "past" ? "tabActive" : ""}`}
          >
            Past <span className='count'>{counts.past}</span>
          </Link>

          <Link
            href={{ pathname: "/dashboard/trips", query: { tab: "drafts" } }}
            className={`tab ${tab === "drafts" ? "tabActive" : ""}`}
          >
            Drafts <span className='count'>{counts.drafts}</span>
          </Link>
        </nav>
      </header>

      {trips.length === 0 ? (
        <div className="empty">
          <p className="emptyTitle">No trips found.</p>
          <p className="emptyCopy">
            Book a ride and it will show up here.
          </p>
          <div className="actionsRow">
            <div className={styles.btnContainer}>
            <Button href='/book' btnType='red' text='Book a ride' arrow />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {trips.map((t) => {
            const payNow = showPayNow(t.status, t.payment);
            const cancellable = canCancel(t.status);

            return (
              <article key={t.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.meta}>
                    <div className={styles.date}>
                      {formatDateTime(t.pickupAt)}
                    </div>
                    <div className={styles.route}>
                      {t.pickupAddress} → {t.dropoffAddress}
                    </div>
                    <div className={styles.smallMeta}>
                      <span>{t.serviceType?.name ?? "Service"}</span>
                      <span className={styles.dot}>•</span>
                      <span>{t.vehicle?.name ?? "Vehicle TBD"}</span>
                      <span className={styles.dot}>•</span>
                      <span>
                        {t.passengers} pax / {t.luggage} luggage
                      </span>
                    </div>
                  </div>

                  <div className={styles.rightMeta}>
                    <span
                      className={`${styles.badge} ${styles[`badge_${badgeTone(t.status)}`]}`}
                    >
                      {statusLabel(t.status)}
                    </span>

                    <div className={styles.total}>
                      {moneyFromCents(t.totalCents, t.currency)}
                    </div>

                    {t.payment ? (
                      <div className={styles.paymentLine}>
                        Payment:{" "}
                        <span className={styles.paymentStatus}>
                          {t.payment.status === "NONE"
                            ? "Not paid"
                            : t.payment.status === "PENDING"
                              ? "Pending"
                              : t.payment.status === "PAID"
                                ? "Paid"
                                : t.payment.status === "FAILED"
                                  ? "Failed"
                                  : t.payment.status === "REFUNDED"
                                    ? "Refunded"
                                    : t.payment.status === "PARTIALLY_REFUNDED"
                                      ? "Partially refunded"
                                      : t.payment.status}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className={styles.actionsRow}>
                  <Link
                    className={styles.primaryBtn}
                    href={primaryActionHref(t.status, t.id)}
                  >
                    {primaryActionLabel(t.status)}
                  </Link>

                  {payNow ? (
                    <a
                      className={styles.secondaryBtn}
                      href={t.payment?.checkoutUrl ?? "#"}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Pay now
                    </a>
                  ) : null}

                  <Link className={styles.secondaryBtn} href={rebookHref(t.id)}>
                    Rebook
                  </Link>

                  {cancellable ? (
                    <form action={cancelTrip} className={styles.form}>
                      <input type='hidden' name='bookingId' value={t.id} />
                      <CancelTripButton className={styles.dangerBtn} />
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
