import styles from "./DashboardOverview.module.css";
import Link from "next/link";
import { BookingStatus, PaymentStatus } from "@prisma/client";

type NextTrip = {
  id: string;
  status: BookingStatus;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  passengers: number;
  luggage: number;
  currency: string;
  totalCents: number;
  serviceType: { name: string; slug: string };
  vehicle: { name: string } | null;
  payment: {
    status: PaymentStatus;
    checkoutUrl: string | null;
    receiptUrl: string | null;
  } | null;
  assignment: {
    driver: { name: string | null; email: string };
    vehicleUnit: { name: string; plate: string | null } | null;
  } | null;
};

type ActivityItem = {
  id: string;
  status: BookingStatus;
  createdAt: Date;
  booking: {
    id: string;
    pickupAt: Date;
    pickupAddress: string;
    dropoffAddress: string;
    status: BookingStatus;
  };
};

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
  if (status === "PENDING_REVIEW") return "neutral";
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

export default function DashboardOverview({
  nextTrip,
  recentActivity,
}: {
  nextTrip: NextTrip | null;
  recentActivity: ActivityItem[];
}) {
const payUrl = nextTrip?.payment?.checkoutUrl ?? null;

  const showPayNow = nextTrip
    ? Boolean(payUrl) &&
      (nextTrip.status === "PENDING_PAYMENT" ||
        nextTrip.payment?.status === "PENDING" ||
        nextTrip.payment?.status === "NONE")
    : false;

  const showReceipt = nextTrip ? Boolean(nextTrip.payment?.receiptUrl) : false;

  return (
    <section className={styles.container} aria-label='Dashboard overview'>
      <div className={styles.grid}>
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`cardTitle h4`}>Next trip details</h2>
            {nextTrip ? (
              <span className={`badge badge_${badgeTone(nextTrip.status)}`}>
                {statusLabel(nextTrip.status)}
              </span>
            ) : null}
          </header>

          {!nextTrip ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No upcoming trips.</p>
              <p className={styles.emptyCopy}>
                Ready when you are—book a ride anytime.
              </p>
              {/* <div className={styles.btnRow}>
                <Link className={styles.primaryBtn} href='/book'>
                  Book a ride
                </Link>
              </div> */}
            </div>
          ) : (
            <>
              <div className={styles.tripMeta}>
                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Date
                  </div>
                  <div className='emptySmall'>
                    {formatDateTime(nextTrip.pickupAt)}
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    From
                  </div>
                  <div className='emptySmall'>{nextTrip.pickupAddress}</div>
                </div>

                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    To
                  </div>
                  <div className='emptySmall'>{nextTrip.dropoffAddress}</div>
                </div>

                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Service
                  </div>
                  <div className='emptySmall'>{nextTrip.serviceType.name}</div>
                </div>

                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Vehicle
                  </div>
                  <div className='emptySmall'>
                    {nextTrip.vehicle?.name ?? "Not selected"}
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Passengers
                  </div>
                  <div className='emptySmall'>
                    {nextTrip.passengers} • Luggage: {nextTrip.luggage}
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Total
                  </div>
                  <div className='val'>
                    {moneyFromCents(nextTrip.totalCents, nextTrip.currency)}
                    {nextTrip.payment ? (
                      <span className={styles.pill}>
                        {paymentLabel(nextTrip.payment.status)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {nextTrip.assignment ? (
                  <div className={styles.assignment}>
                    <div className={styles.assignmentTitle}>Assigned</div>
                    <div className={styles.assignmentCopy}>
                      Driver:{" "}
                      {nextTrip.assignment.driver.name ??
                        nextTrip.assignment.driver.email}
                    </div>
                    {nextTrip.assignment.vehicleUnit ? (
                      <div className={styles.assignmentCopy}>
                        Vehicle: {nextTrip.assignment.vehicleUnit.name}
                        {nextTrip.assignment.vehicleUnit.plate
                          ? ` • ${nextTrip.assignment.vehicleUnit.plate}`
                          : ""}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className={styles.btnRow}>
                <Link
                  className='primaryBtn'
                  href={`/dashboard/trips/${nextTrip.id}`}
                >
                  View trip details
                </Link>

                {showPayNow ? (
                  <a
                    className={styles.primaryBtn}
                    href={payUrl ?? "#"}
                    target='_blank'
                    rel='noreferrer'
                  >
                    Complete payment
                  </a>
                ) : null}

                {showReceipt ? (
                  <a
                    className={styles.tertiaryBtn}
                    href={nextTrip.payment?.receiptUrl ?? "#"}
                    target='_blank'
                    rel='noreferrer'
                  >
                    View receipt
                  </a>
                ) : null}
              </div>
            </>
          )}
        </section>

        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`cardTitle h4`}>Recent activity</h2>
            {/* <Link className={styles.inlineLink} href='/dashboard/trips'>
              View all
            </Link> */}
          </header>

          {recentActivity.length === 0 ? (
            <p className='emptySmall'>
              No activity yet. Your updates will show up here.
            </p>
          ) : (
            <ul className={styles.activityList}>
              {recentActivity.map((evt) => (
                <li key={evt.id} className={styles.activityItem}>
                  <div className={styles.activityLeft}>
                    {/* <div className={styles.activityTitle}>
                      {statusLabel(evt.status)}
                    </div> */}
                    <span className={`badge badge_${badgeTone(evt.status)}`}>
                      {statusLabel(evt.status)}
                    </span>
                    <div className='miniNote'>
                      {formatDateTime(evt.createdAt)} • Trip:{" "}
                      {formatDateTime(evt.booking.pickupAt)}
                    </div>
                    <div className='emptySmall'>
                      {evt.booking.pickupAddress} → {evt.booking.dropoffAddress}
                    </div>
                  </div>

                  <Link
                    className='primaryBtn'
                    href={`/dashboard/trips/${evt.booking.id}`}
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
