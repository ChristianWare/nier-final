import styles from "./TripDetails.module.css";
import Link from "next/link";
import {
  BookingStatus,
  PaymentStatus,
  AddonType,
  Prisma,
} from "@prisma/client";
import { cancelTrip } from "../../../../actions/bookings/cancelTrips"; 
import CancelTripButton from "../CancelTripButton/CancelTripButton";

type BookingWithDetails = Prisma.BookingGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true } };
    serviceType: { select: { name: true; slug: true; pricingStrategy: true } };
    vehicle: { select: { name: true } };
    addons: true;
    payment: true;
    assignment: {
      include: {
        driver: { select: { id: true; name: true; email: true } };
        vehicleUnit: { select: { name: true; plate: true } };
      };
    };
    statusEvents: {
      include: { createdBy: { select: { name: true; email: true } } };
    };
  };
}>;

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
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

function addonLabel(a: { type: AddonType; label: string | null }) {
  if (a.label?.trim()) return a.label;
  switch (a.type) {
    case "CHILD_SEAT":
      return "Child seat";
    case "WHEELCHAIR":
      return "Wheelchair access";
    case "EXTRA_STOP":
      return "Extra stop";
    case "MEET_GREET":
      return "Meet & greet";
    case "OTHER":
    default:
      return "Addon";
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

export default function TripDetails({
  booking,
}: {
  booking: BookingWithDetails;
}) {
  const payUrl = booking.payment?.checkoutUrl ?? null;

  const showPayNow = booking
    ? Boolean(payUrl) &&
      (booking.status === "PENDING_PAYMENT" ||
        booking.payment?.status === "PENDING" ||
        booking.payment?.status === "NONE" ||
        booking.payment?.status === "FAILED")
    : false;

  const showReceipt = booking ? Boolean(booking.payment?.receiptUrl) : false;

  const cancellable = canCancel(booking.status);

  const primaryHref =
    booking.status === "DRAFT"
      ? `/book?bookingId=${booking.id}`
      : `/dashboard/trips/${booking.id}`;

  return (
    <section className={styles.container} aria-label='Trip details'>
      <header className={styles.header}>
        <div className={styles.titleBox}>
          <Link className={styles.backLink} href='/dashboard/trips'>
            ← Back to trips
          </Link>

          <div className={styles.titleRow}>
            <h1 className={`${styles.heading} h2`}>Trip details</h1>
            <span
              className={`${styles.badge} ${styles[`badge_${badgeTone(booking.status)}`]}`}
            >
              {statusLabel(booking.status)}
            </span>
          </div>

          <p className={styles.subheading}>
            Pickup:{" "}
            <span className={styles.strong}>
              {formatDateTime(booking.pickupAt)}
            </span>
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link
            className={styles.secondaryBtn}
            href={`/book?rebook=${booking.id}`}
          >
            Rebook
          </Link>

          {cancellable ? (
            <form action={cancelTrip} className={styles.inlineForm}>
              <input type='hidden' name='bookingId' value={booking.id} />
              <CancelTripButton className={styles.dangerBtn} />
            </form>
          ) : null}
        </div>
      </header>

      <div className={styles.grid}>
        {/* LEFT COLUMN */}
        <div className={styles.leftCol}>
          {/* Summary */}
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Summary</h2>
            </header>

            <div className={styles.rows}>
              <div className={styles.row}>
                <div className={styles.key}>Service</div>
                <div className={styles.val}>{booking.serviceType.name}</div>
              </div>

              <div className={styles.row}>
                <div className={styles.key}>Pickup time</div>
                <div className={styles.val}>
                  {formatDateTime(booking.pickupAt)}
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.key}>From</div>
                <div className={styles.val}>{booking.pickupAddress}</div>
              </div>

              <div className={styles.row}>
                <div className={styles.key}>To</div>
                <div className={styles.val}>{booking.dropoffAddress}</div>
              </div>

              <div className={styles.row}>
                <div className={styles.key}>Vehicle</div>
                <div className={styles.val}>
                  {booking.vehicle?.name ?? "Vehicle TBD"}
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.key}>Passengers</div>
                <div className={styles.val}>
                  {booking.passengers} • Luggage: {booking.luggage}
                </div>
              </div>

              {booking.hoursRequested ? (
                <div className={styles.row}>
                  <div className={styles.key}>Hours</div>
                  <div className={styles.val}>
                    Requested: {booking.hoursRequested}
                    {booking.hoursBilled
                      ? ` • Billed: ${booking.hoursBilled}`
                      : ""}
                  </div>
                </div>
              ) : null}

              {booking.distanceMiles ? (
                <div className={styles.row}>
                  <div className={styles.key}>Distance</div>
                  <div className={styles.val}>
                    {String(booking.distanceMiles)} mi
                  </div>
                </div>
              ) : null}

              {booking.durationMinutes ? (
                <div className={styles.row}>
                  <div className={styles.key}>Duration</div>
                  <div className={styles.val}>
                    {booking.durationMinutes} min
                  </div>
                </div>
              ) : null}

              {booking.specialRequests ? (
                <div className={styles.row}>
                  <div className={styles.key}>Requests</div>
                  <div className={styles.val}>{booking.specialRequests}</div>
                </div>
              ) : null}
            </div>
          </section>

          {/* Addons */}
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Add-ons</h2>
            </header>

            {booking.addons.length === 0 ? (
              <p className={styles.muted}>No add-ons for this trip.</p>
            ) : (
              <ul className={styles.addonList}>
                {booking.addons.map((a) => (
                  <li key={a.id} className={styles.addonItem}>
                    <div className={styles.addonMain}>
                      <div className={styles.addonTitle}>
                        {addonLabel(a)}{" "}
                        {a.quantity > 1 ? (
                          <span className={styles.qty}>x{a.quantity}</span>
                        ) : null}
                      </div>
                      {a.notes ? (
                        <div className={styles.addonNotes}>{a.notes}</div>
                      ) : null}
                    </div>
                    <div className={styles.addonPrice}>
                      {moneyFromCents(a.totalPriceCents, booking.currency)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Status timeline */}
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Status timeline</h2>
            </header>

            {booking.statusEvents.length === 0 ? (
              <p className={styles.muted}>No status updates yet.</p>
            ) : (
              <ul className={styles.timeline}>
                {booking.statusEvents.map((e) => (
                  <li key={e.id} className={styles.timelineItem}>
                    <div className={styles.timelineLeft}>
                      <div className={styles.timelineStatus}>
                        {statusLabel(e.status)}
                      </div>
                      <div className={styles.timelineMeta}>
                        {formatDateTime(e.createdAt)}
                        {e.createdBy ? (
                          <>
                            {" "}
                            •{" "}
                            {e.createdBy.name?.trim()
                              ? e.createdBy.name
                              : e.createdBy.email}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightCol}>
          {/* Payment */}
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Payment</h2>
            </header>

            {!booking.payment ? (
              <p className={styles.muted}>No payment record yet.</p>
            ) : (
              <div className={styles.paymentBox}>
                <div className={styles.paymentRow}>
                  <div className={styles.key}>Status</div>
                  <div className={styles.val}>
                    <span className={styles.pill}>
                      {paymentLabel(booking.payment.status)}
                    </span>
                  </div>
                </div>

                <div className={styles.paymentRow}>
                  <div className={styles.key}>Total</div>
                  <div className={styles.val}>
                    {moneyFromCents(booking.totalCents, booking.currency)}
                  </div>
                </div>

                <div className={styles.btnRow}>
                  {showPayNow ? (
                    <a
                      className={styles.primaryBtn}
                      href={booking.payment.checkoutUrl ?? "#"}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Complete payment
                    </a>
                  ) : null}

                  {showReceipt ? (
                    <a
                      className={styles.secondaryBtn}
                      href={booking.payment.receiptUrl ?? "#"}
                      target='_blank'
                      rel='noreferrer'
                    >
                      View receipt
                    </a>
                  ) : null}

                  <Link
                    className={styles.tertiaryBtn}
                    href='/dashboard/payments'
                  >
                    Payments & receipts
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Pricing breakdown */}
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Pricing</h2>
            </header>

            <div className={styles.rows}>
              <div className={styles.row}>
                <div className={styles.key}>Subtotal</div>
                <div className={styles.val}>
                  {moneyFromCents(booking.subtotalCents, booking.currency)}
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.key}>Fees</div>
                <div className={styles.val}>
                  {moneyFromCents(booking.feesCents, booking.currency)}
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.key}>Taxes</div>
                <div className={styles.val}>
                  {moneyFromCents(booking.taxesCents, booking.currency)}
                </div>
              </div>

              <div className={styles.hr} />

              <div className={styles.row}>
                <div className={styles.keyStrong}>Total</div>
                <div className={styles.valStrong}>
                  {moneyFromCents(booking.totalCents, booking.currency)}
                </div>
              </div>
            </div>
          </section>

          {/* Driver + vehicle unit */}
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Driver & vehicle</h2>
            </header>

            {!booking.assignment ? (
              <p className={styles.muted}>Driver hasn’t been assigned yet.</p>
            ) : (
              <div className={styles.rows}>
                <div className={styles.row}>
                  <div className={styles.key}>Driver</div>
                  <div className={styles.val}>
                    {booking.assignment.driver.name?.trim()
                      ? booking.assignment.driver.name
                      : booking.assignment.driver.email}
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.key}>Vehicle unit</div>
                  <div className={styles.val}>
                    {booking.assignment.vehicleUnit
                      ? `${booking.assignment.vehicleUnit.name}${
                          booking.assignment.vehicleUnit.plate
                            ? ` • ${booking.assignment.vehicleUnit.plate}`
                            : ""
                        }`
                      : "Not assigned"}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Support CTA */}
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Need help?</h2>
            </header>

            <p className={styles.supportCopy}>
              If you need to update your trip or have questions, contact support
              and reference this booking.
            </p>

            <div className={styles.btnRow}>
              <Link
                className={styles.primaryBtn}
                href={`/dashboard/support?bookingId=${booking.id}`}
              >
                Contact support
              </Link>
              <Link className={styles.secondaryBtn} href='/dashboard/support'>
                Support center
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* Footer quick actions */}
      <div className={styles.footerActions}>
        <Link className={styles.secondaryBtn} href='/dashboard/trips'>
          Back to trips
        </Link>
        <Link className={styles.secondaryBtn} href={primaryHref}>
          {booking.status === "DRAFT" ? "Continue booking" : "View in trips"}
        </Link>
      </div>
    </section>
  );
}
