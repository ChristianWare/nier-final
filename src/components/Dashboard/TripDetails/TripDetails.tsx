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
import Arrow from "@/components/shared/icons/Arrow/Arrow";
// import Modal from "@/components/shared/Modal/Modal";

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

  const showPayNow =
    Boolean(payUrl) &&
    (booking.status === "PENDING_PAYMENT" ||
      booking.payment?.status === "PENDING" ||
      booking.payment?.status === "NONE" ||
      booking.payment?.status === "FAILED");

  const showReceipt = Boolean(booking.payment?.receiptUrl);
  const cancellable = canCancel(booking.status);

  const primaryHref =
    booking.status === "DRAFT"
      ? `/book?bookingId=${booking.id}`
      : `/dashboard/trips/${booking.id}`;

  return (
    <section className='container' aria-label='Trip details'>
      <header className='header'>
        <h1 className='heading h2'>Trip details</h1>
        <Link className='backBtn' href='/dashboard/trips'>
          <Arrow className='backArrow' /> Back
        </Link>
      </header>
      <span className={`badge badge_${badgeTone(booking.status)}`}>
        {statusLabel(booking.status)}
      </span>

      <p className='subheading'>
        Pickup:{" "}
        <span className={styles.strong}>
          {formatDateTime(booking.pickupAt)}
        </span>
      </p>

      <div className={styles.headerActions}>
        <Link className='tertiaryBtn' href={`/book?rebook=${booking.id}`}>
          Rebook
        </Link>

        {cancellable ? (
          <form action={cancelTrip} className={styles.inlineForm}>
            <input type='hidden' name='bookingId' value={booking.id} />
            <CancelTripButton className='dangerBtn' />
          </form>
        ) : null}
      </div>

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className='cardTitle h4'>Summary</h2>
            </header>

            <div className={styles.tripMeta}>
              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                  Service
                </div>
                <div className='emptySmall'>{booking.serviceType.name}</div>
              </div>

              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                  Pickup time
                </div>
                <div className='emptySmall'>
                  {formatDateTime(booking.pickupAt)}
                </div>
              </div>

              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                  From
                </div>
                <div className='emptySmall'>{booking.pickupAddress}</div>
              </div>

              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>To</div>
                <div className='emptySmall'>{booking.dropoffAddress}</div>
              </div>

              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                  Vehicle
                </div>
                <div className='emptySmall'>
                  {booking.vehicle?.name ?? "Vehicle TBD"}
                </div>
              </div>

              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                  Passengers
                </div>
                <div className='emptySmall'>
                  {booking.passengers} • Luggage: {booking.luggage}
                </div>
              </div>

              {booking.hoursRequested ? (
                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Hours
                  </div>
                  <div className='emptySmall'>
                    Requested: {booking.hoursRequested}
                    {booking.hoursBilled
                      ? ` • Billed: ${booking.hoursBilled}`
                      : ""}
                  </div>
                </div>
              ) : null}

              {booking.distanceMiles ? (
                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Distance
                  </div>
                  <div className='emptySmall'>
                    {String(booking.distanceMiles)} mi
                  </div>
                </div>
              ) : null}

              {booking.durationMinutes ? (
                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Duration
                  </div>
                  <div className='emptySmall'>
                    {booking.durationMinutes} min
                  </div>
                </div>
              ) : null}

              {booking.specialRequests ? (
                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Requests
                  </div>
                  <div className='emptySmall'>{booking.specialRequests}</div>
                </div>
              ) : null}

              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                  Total
                </div>
                <div className='val'>
                  {moneyFromCents(booking.totalCents, booking.currency)}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className='cardTitle h4'>Add-ons</h2>
            </header>

            {booking.addons.length === 0 ? (
              <p className='emptySmall'>No add-ons for this trip.</p>
            ) : (
              <ul className={styles.addonList}>
                {booking.addons.map((a) => (
                  <li key={a.id} className={styles.addonItem}>
                    <div className={styles.addonMain}>
                      <div className={styles.addonTitle}>
                        {addonLabel(a)}
                        {a.quantity > 1 ? (
                          <span className={styles.qty}> x{a.quantity}</span>
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

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className='cardTitle h4'>Status timeline</h2>
            </header>

            {booking.statusEvents.length === 0 ? (
              <p className='emptySmall'>No status updates yet.</p>
            ) : (
              <ul className={styles.timeline}>
                {booking.statusEvents.map((e) => (
                  <li key={e.id} className={styles.timelineItem}>
                    <div className={styles.timelineTop}>
                      <span className={`badge badge_${badgeTone(e.status)}`}>
                        {statusLabel(e.status)}
                      </span>
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

        <div className={styles.rightCol}>
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className='cardTitle h4'>Payment</h2>
            </header>

            {!booking.payment ? (
              <p className='emptySmall'>No payment record yet.</p>
            ) : (
              <>
                <div className={styles.tripMeta}>
                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      Status
                    </div>
                    <div className='val'>
                      <span className={styles.pill}>
                        {paymentLabel(booking.payment.status)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      Total
                    </div>
                    <div className='val'>
                      {moneyFromCents(booking.totalCents, booking.currency)}
                    </div>
                  </div>
                </div>

                <div className={styles.btnRow}>
                  {showPayNow ? (
                    <a
                      className='primaryBtn'
                      href={booking.payment.checkoutUrl ?? "#"}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Complete payment
                    </a>
                  ) : null}

                  {showReceipt ? (
                    <a
                      className='tertiaryBtn'
                      href={booking.payment.receiptUrl ?? "#"}
                      target='_blank'
                      rel='noreferrer'
                    >
                      View receipt
                    </a>
                  ) : null}

                  <Link className='tertiaryBtn' href='/dashboard/payments'>
                    Payments & receipts
                  </Link>
                </div>
              </>
            )}
          </section>

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className='cardTitle h4'>Pricing</h2>
            </header>

            <div className={styles.tripMeta}>
              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                  Subtotal
                </div>
                <div className='val'>
                  {moneyFromCents(booking.subtotalCents, booking.currency)}
                </div>
              </div>

              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                  Fees
                </div>
                <div className='val'>
                  {moneyFromCents(booking.feesCents, booking.currency)}
                </div>
              </div>

              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                  Taxes
                </div>
                <div className='val'>
                  {moneyFromCents(booking.taxesCents, booking.currency)}
                </div>
              </div>

              <div className={styles.row}>
                <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                  Total
                </div>
                <div className='val'>
                  {moneyFromCents(booking.totalCents, booking.currency)}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className='cardTitle h4'>Driver & vehicle</h2>
            </header>

            {!booking.assignment ? (
              <p className='emptySmall'>Driver hasn’t been assigned yet.</p>
            ) : (
              <div className={styles.tripMeta}>
                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Driver
                  </div>
                  <div className='emptySmall'>
                    {booking.assignment.driver.name?.trim()
                      ? booking.assignment.driver.name
                      : booking.assignment.driver.email}
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                    Vehicle unit
                  </div>
                  <div className='emptySmall'>
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

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className='cardTitle h4'>Need help?</h2>
            </header>

            <p className='emptySmall'>
              If you need to update your trip or have questions, contact support
              and reference this booking.
            </p>

            <div className={styles.btnRow}>
              <Link
                className='primaryBtn'
                href={`/dashboard/support?bookingId=${booking.id}`}
              >
                Contact support
              </Link>
              <Link className='tertiaryBtn' href='/dashboard/support'>
                Support center
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className={styles.footerActions}>
        <Link className='tertiaryBtn' href='/dashboard/trips'>
          Back to trips
        </Link>
        <Link className='tertiaryBtn' href={primaryHref}>
          {booking.status === "DRAFT" ? "Continue booking" : "View in trips"}
        </Link>
      </div>
    </section>
  );
}
