import styles from "./DashboardTrips.module.css";
import Link from "next/link";
import { Prisma, BookingStatus, PaymentStatus } from "@prisma/client";
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

function paymentLabel(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    case "NONE":
    default:
      return "Not paid";
  }
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
  return "View trip details";
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
    <section className='container' aria-label='My trips'>
      <header className='header'>
        <h1 className='heading h2'>My trips</h1>
        <p className='subheading'>
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
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No trips found.</p>
          <p className={styles.emptyCopy}>
            Book a ride and it will show up here.
          </p>
          <div className={styles.actionsRow}>
            <div className={styles.btnContainer}>
              <Button href='/book' btnType='red' text='Book a ride' arrow />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {trips.map((t) => {
            const payUrl = t.payment?.checkoutUrl ?? null;
            const receiptUrl = t.payment?.receiptUrl ?? null;
            const payNow = showPayNow(t.status, t.payment);
            const cancellable = canCancel(t.status);

            return (
              <article key={t.id} className={styles.card}>
                <header className={styles.cardTop}>
                  <h2 className={`cardTitle h4`}>Trip</h2>
                  <span className={`badge badge_${badgeTone(t.status)}`}>
                    {statusLabel(t.status)}
                  </span>
                </header>

                <div className={styles.tripMeta}>
                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      Date
                    </div>
                    <div className='emptySmall'>
                      {formatDateTime(t.pickupAt)}
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      From
                    </div>
                    <div className='emptySmall'>{t.pickupAddress}</div>
                  </div>

                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      To
                    </div>
                    <div className='emptySmall'>{t.dropoffAddress}</div>
                  </div>

                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      Service
                    </div>
                    <div className='emptySmall'>
                      {t.serviceType?.name ?? "Service"}
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      Vehicle
                    </div>
                    <div className='emptySmall'>
                      {t.vehicle?.name ?? "Vehicle TBD"}
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      Passengers
                    </div>
                    <div className='emptySmall'>
                      {t.passengers} • Luggage: {t.luggage}
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      Total
                    </div>
                    <div className='val'>
                      {moneyFromCents(t.totalCents, t.currency)}
                      {t.payment ? (
                        <span className={styles.pill}>
                          {paymentLabel(t.payment.status)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className={styles.btnRow}>
                  <Link
                    className='primaryBtn'
                    href={primaryActionHref(t.status, t.id)}
                  >
                    {primaryActionLabel(t.status)}
                  </Link>

                  {payNow ? (
                    <a
                      className={styles.primaryBtn}
                      href={payUrl ?? "#"}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Complete payment
                    </a>
                  ) : null}

                  {receiptUrl ? (
                    <a
                      className={styles.tertiaryBtn}
                      href={receiptUrl}
                      target='_blank'
                      rel='noreferrer'
                    >
                      View receipt
                    </a>
                  ) : null}

                  <Link className="tertiaryBtn" href={rebookHref(t.id)}>
                    Rebook
                  </Link>

                  {cancellable ? (
                    <form action={cancelTrip} className={styles.form}>
                      <input type='hidden' name='bookingId' value={t.id} />
                      <CancelTripButton className="dangerBtn" />
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
