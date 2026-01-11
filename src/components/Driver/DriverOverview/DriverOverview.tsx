import Link from "next/link";
import styles from "./DriverOverview.module.css";
import { BookingStatus } from "@prisma/client";

import AdminKPICard from "@/components/admin/AdminKPICard/AdminKPICard";
import { updateDriverBookingStatus } from "../../../../actions/driver-dashboard/actions"; 

type NextTrip = {
  id: string;
  status: BookingStatus;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  passengers: number;
  luggage: number;
  specialRequests: string | null;
  internalNotes: string | null;
  totalCents: number;
  serviceType: { name: string; slug: string };
  vehicle: { name: string } | null;
  user: { name: string | null; email: string };
  assignment: {
    vehicleUnit: { name: string; plate: string | null } | null;
  } | null;
  addons: { type: string; quantity: number }[];
};

type TodayTrip = {
  id: string;
  status: BookingStatus;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  serviceType: { name: string };
};

type AlertItem = {
  id: string;
  createdAt: Date;
  title: string;
  body: string;
  href: string;
};

export type DriverOverviewProps = {
  nextTrip: NextTrip | null;
  todayTrips: TodayTrip[];
  alerts: AlertItem[];
  kpis: {
    tripsToday: number;
    upcoming7Days: number;
    onTimeRate30Days: string;
    earningsWeek: string;
  };
};

function formatTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function minutesUntil(d: Date) {
  const diffMs = d.getTime() - Date.now();
  return Math.round(diffMs / (1000 * 60));
}

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function statusLabel(status: BookingStatus) {
  switch (status) {
    case "ASSIGNED":
      return { label: "Assigned", tone: "neutral" as const };
    case "EN_ROUTE":
      return { label: "En route", tone: "info" as const };
    case "ARRIVED":
      return { label: "Arrived", tone: "warn" as const };
    case "IN_PROGRESS":
      return { label: "In progress", tone: "success" as const };
    case "COMPLETED":
      return { label: "Completed", tone: "muted" as const };
    case "CONFIRMED":
      return { label: "Confirmed", tone: "success" as const };
    case "PENDING_REVIEW":
      return { label: "Pending review", tone: "neutral" as const };
    case "PENDING_PAYMENT":
      return { label: "Pending payment", tone: "warn" as const };
    case "CANCELLED":
      return { label: "Cancelled", tone: "muted" as const };
    case "NO_SHOW":
      return { label: "No-show", tone: "danger" as const };
    default:
      return {
        label: String(status).replaceAll("_", " "),
        tone: "neutral" as const,
      };
  }
}

function StatusPill({ status }: { status: BookingStatus }) {
  const { label, tone } = statusLabel(status);
  const cls =
    tone === "success"
      ? styles.pillSuccess
      : tone === "warn"
        ? styles.pillWarn
        : tone === "info"
          ? styles.pillInfo
          : tone === "danger"
            ? styles.pillDanger
            : tone === "muted"
              ? styles.pillMuted
              : styles.pillNeutral;

  return <span className={`${styles.pill} ${cls}`}>{label}</span>;
}

function Action({
  bookingId,
  nextStatus,
  label,
}: {
  bookingId: string;
  nextStatus: BookingStatus;
  label: string;
}) {
  return (
    <form action={updateDriverBookingStatus} className={styles.actionForm}>
      <input type='hidden' name='bookingId' value={bookingId} />
      <input type='hidden' name='nextStatus' value={nextStatus} />
      <button className={styles.actionBtn}>{label}</button>
    </form>
  );
}

export default function DriverOverview({
  nextTrip,
  todayTrips,
  alerts,
  kpis,
}: DriverOverviewProps) {
  const mins = nextTrip ? minutesUntil(nextTrip.pickupAt) : null;
  const minsLabel =
    mins == null
      ? ""
      : mins < 0
        ? `(${Math.abs(mins)} min ago)`
        : `(in ${mins} min)`;

  const passengerName = nextTrip?.user?.name?.trim() || "Passenger";
  const passengerEmail = nextTrip?.user?.email || "";

  const vehicleUnit = nextTrip?.assignment?.vehicleUnit;
  const vehicleDisplay = vehicleUnit
    ? `${vehicleUnit.name}${vehicleUnit.plate ? ` • ${vehicleUnit.plate}` : ""}`
    : nextTrip?.vehicle?.name || "TBD";

  const extraStops =
    nextTrip?.addons?.find((a) => a.type === "EXTRA_STOP")?.quantity ?? 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.topGrid}>
        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <div className={styles.cardTitle}>Next trip</div>
            {nextTrip ? <StatusPill status={nextTrip.status} /> : null}
          </header>

          {!nextTrip ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No upcoming trips</div>
              <p className={styles.emptyCopy}>
                When dispatch assigns you a job, it’ll appear here.
              </p>
              <Link className={styles.linkBtn} href='/driver-dashboard/trips'>
                View trips
              </Link>
            </div>
          ) : (
            <div className={styles.nextTripBody}>
              <div className={styles.row}>
                <div className={styles.kv}>
                  <div className={styles.k}>Pickup</div>
                  <div className={styles.v}>
                    {formatTime(nextTrip.pickupAt)}{" "}
                    <span className={styles.mins}>{minsLabel}</span>
                  </div>
                </div>

                <a
                  className={styles.smallLink}
                  href={mapsUrl(nextTrip.pickupAddress)}
                  target='_blank'
                  rel='noreferrer'
                >
                  Open in Maps
                </a>
              </div>

              <div className={styles.kvBlock}>
                <div className={styles.k}>Pickup location</div>
                <div className={styles.v}>{nextTrip.pickupAddress}</div>
              </div>

              <div className={styles.kvBlock}>
                <div className={styles.k}>Dropoff</div>
                <div className={styles.v}>{nextTrip.dropoffAddress}</div>
              </div>

              <div className={styles.row}>
                <div className={styles.kv}>
                  <div className={styles.k}>Passenger</div>
                  <div className={styles.v}>{passengerName}</div>
                </div>

                <div className={styles.contactBtns}>
                  <a
                    className={styles.iconBtn}
                    href={`mailto:${passengerEmail}`}
                  >
                    Email
                  </a>
                </div>
              </div>

              <div className={styles.rowChips}>
                <span className={styles.chip}>
                  {nextTrip.passengers} passenger(s)
                </span>
                <span className={styles.chip}>{nextTrip.luggage} luggage</span>
                {extraStops > 0 ? (
                  <span className={styles.chip}>
                    {extraStops} extra stop(s)
                  </span>
                ) : null}
              </div>

              <div className={styles.kvBlock}>
                <div className={styles.k}>Vehicle</div>
                <div className={styles.v}>{vehicleDisplay}</div>
              </div>

              {nextTrip.specialRequests ? (
                <div className={styles.notes}>
                  <div className={styles.k}>Notes</div>
                  <div className={styles.noteText}>
                    {nextTrip.specialRequests}
                  </div>
                </div>
              ) : null}

              <div className={styles.viewTripRow}>
                <Link
                  className={styles.linkBtn}
                  href={`/driver-dashboard/trips/${nextTrip.id}`}
                >
                  View trip details
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <div className={styles.cardTitle}>Quick actions</div>
          </header>

          {!nextTrip ? (
            <div className={styles.emptySmall}>
              <p className={styles.emptyCopy}>
                Actions appear when you have a next trip.
              </p>
            </div>
          ) : (
            <div className={styles.actionsGrid}>
              <Action
                bookingId={nextTrip.id}
                nextStatus='EN_ROUTE'
                label="I'm en route"
              />
              <Action
                bookingId={nextTrip.id}
                nextStatus='ARRIVED'
                label='Arrived'
              />
              <Action
                bookingId={nextTrip.id}
                nextStatus='IN_PROGRESS'
                label='Passenger onboard'
              />
              <Action
                bookingId={nextTrip.id}
                nextStatus='COMPLETED'
                label='Complete trip'
              />
              <Link
                className={`${styles.actionBtn} ${styles.reportBtn}`}
                href={`/driver-dashboard/support?tripId=${nextTrip.id}`}
              >
                Report issue
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className={styles.kpiStrip}>
        <AdminKPICard title='Trips today' value={kpis.tripsToday} />
        <AdminKPICard title='Upcoming (7 days)' value={kpis.upcoming7Days} />
        <AdminKPICard
          title='On-time rate (30 days)'
          value={kpis.onTimeRate30Days}
        />
        <AdminKPICard
          title='Trip totals (this week)'
          value={kpis.earningsWeek}
        />
      </section>

      <div className={styles.bottomGrid}>
        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <div className={styles.cardTitle}>Today’s schedule</div>
            <Link className={styles.smallLink} href='/driver-dashboard/trips'>
              View all
            </Link>
          </header>

          {todayTrips.length === 0 ? (
            <div className={styles.emptySmall}>
              <div className={styles.emptyTitle}>No trips today</div>
              <p className={styles.emptyCopy}>
                If dispatch assigns a trip for today, it’ll show up here.
              </p>
            </div>
          ) : (
            <ul className={styles.timeline}>
              {todayTrips.map((t) => (
                <li key={t.id} className={styles.timelineItem}>
                  <div className={styles.timeCol}>{formatTime(t.pickupAt)}</div>

                  <div className={styles.mainCol}>
                    <div className={styles.route}>
                      <span className={styles.routeStrong}>
                        {t.pickupAddress}
                      </span>
                      <span className={styles.routeArrow}>→</span>
                      <span className={styles.routeStrong}>
                        {t.dropoffAddress}
                      </span>
                    </div>

                    <div className={styles.metaRow}>
                      <StatusPill status={t.status} />
                      <Link
                        className={styles.smallLink}
                        href={`/driver-dashboard/trips/${t.id}`}
                      >
                        View trip
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.card}>
          <header className={styles.cardHeader}>
            <div className={styles.cardTitle}>Alerts</div>
            <Link className={styles.smallLink} href='/driver-dashboard/trips'>
              View all
            </Link>
          </header>

          {alerts.length === 0 ? (
            <div className={styles.emptySmall}>
              <div className={styles.emptyTitle}>All caught up</div>
              <p className={styles.emptyCopy}>
                Trip updates and dispatch notes will appear here.
              </p>
            </div>
          ) : (
            <ul className={styles.alertList}>
              {alerts.map((a) => (
                <li key={a.id} className={styles.alertItem}>
                  <div className={styles.alertTitle}>{a.title}</div>
                  <div className={styles.alertBody}>{a.body}</div>
                  <Link className={styles.smallLink} href={a.href}>
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
