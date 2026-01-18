import BadgeCount from "@/app/admin/BadgeCount/BadgeCount";
import styles from "./AdminUrgentQueue.module.css";
import Link from "next/link";

export type UrgentBookingItem = {
  id: string;
  pickupAt: Date;
  createdAt: Date;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  user: { name: string | null; email: string } | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  serviceType?: { name: string } | null;
  assignment?: { driver: { name: string | null; email: string } } | null;
};

type Props = {
  unassignedSoon: UrgentBookingItem[];
  pendingPaymentSoon: UrgentBookingItem[];
  stuckReview: UrgentBookingItem[];
  timeZone?: string;
};

export default function AdminUrgentQueue({
  unassignedSoon,
  pendingPaymentSoon,
  stuckReview,
  timeZone = "America/Phoenix",
}: Props) {
  const total =
    unassignedSoon.length + pendingPaymentSoon.length + stuckReview.length;

  return (
    <section className={styles.container} aria-label='Urgent queue'>
      <header className={styles.header}>
        <h2 className='cardTitle h4'>Urgent</h2>
        <div className={styles.meta}>
          {total === 0 ? (
            "All clear"
          ) : (
            <BadgeCount value={total} max={99} hideIfZero />
          )}
        </div>
      </header>

      <div className={styles.grid}>
        <UrgentSection
          title='Unassigned pickups (next 24h)'
          emptyText='No unassigned pickups within 24 hours.'
          items={unassignedSoon}
          timeZone={timeZone}
        />

        <UrgentSection
          title='Pending payment (next 24h)'
          emptyText='No pending payments within 24 hours.'
          items={pendingPaymentSoon}
          timeZone={timeZone}
        />

        <UrgentSection
          title='Stuck in review'
          subtitle='Older than 2 hours'
          emptyText='No bookings stuck in review.'
          items={stuckReview}
          timeZone={timeZone}
          variant='tripDetails'
        />
      </div>
    </section>
  );
}

function UrgentSection({
  title,
  subtitle,
  emptyText,
  items,
  timeZone,
  variant = "default",
}: {
  title: string;
  subtitle?: string;
  emptyText: string;
  items: UrgentBookingItem[];
  timeZone: string;
  variant?: "default" | "tripDetails";
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className='emptyTitle underline'>{title}</div>
        <div className='countPill'>{items.length}</div>
        {subtitle ? <div className='miniNote'>{subtitle}</div> : null}
      </div>

      {items.length === 0 ? (
        <div className='emptySmall'>{emptyText}</div>
      ) : (
        <ul className={styles.list}>
          {items.map((b) => {
            if (variant === "tripDetails") {
              return <TripDetailsRow key={b.id} b={b} timeZone={timeZone} />;
            }

            const customer =
              b.user?.name?.trim() ||
              b.user?.email ||
              b.guestName?.trim() ||
              b.guestEmail ||
              "Guest";

            const pickupShort = shortAddress(b.pickupAddress);
            const dropoffShort = shortAddress(b.dropoffAddress);
            const pickupWhen = formatDateTime(b.pickupAt, timeZone);
            const rel = relativeToNow(b.pickupAt);

            return (
              <li key={b.id} className={styles.row}>
                <StatusPill status={b.status} />
                <div className={styles.rowLeft}>
                  <div className={styles.rowMiddle}>
                    <div className={styles.box}>
                      <div className='emptyTitle underline'>
                        Date <span className={styles.rel}>({rel})</span>
                      </div>
                      <span className='emptySmall'>{pickupWhen}</span>
                    </div>

                    <div className={styles.box}>
                      <div className='emptyTitle underline'>Client</div>
                      <span className='emptySmall'>{customer}</span>
                    </div>

                    {b.serviceType?.name ? (
                      <div className={styles.box}>
                        <div className='emptyTitle underline'>Service</div>
                        <span className='emptySmall'>{b.serviceType.name}</span>
                      </div>
                    ) : null}

                    {b.assignment?.driver?.name ||
                    b.assignment?.driver?.email ? (
                      <div className={styles.box}>
                        <div className='emptyTitle underline'>Assigned to</div>
                        <span className='emptySmall'>
                          Driver:{" "}
                          {b.assignment.driver.name ||
                            b.assignment.driver.email}
                        </span>
                      </div>
                    ) : (
                      <div className={styles.box}>
                        <div className='emptyTitle underline'>Assigned to</div>
                        <span className='emptySmall'>Unassigned</span>
                      </div>
                    )}

                    <div className={styles.box}>
                      <div className='emptyTitle underline'>Pickup</div>
                      <div className='emptySmall'>{pickupShort}</div>
                    </div>

                    <div className={styles.box}>
                      <div className='emptyTitle underline'>Drop off</div>
                      <div className='emptySmall'>{dropoffShort}</div>
                    </div>
                  </div>
                </div>

                <div className={styles.rowRight}>
                  <Link className='primaryBtn' href={`/admin/bookings/${b.id}`}>
                    Review
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TripDetailsRow({
  b,
  timeZone,
}: {
  b: UrgentBookingItem;
  timeZone: string;
}) {
  const customer =
    b.user?.name?.trim() ||
    b.user?.email ||
    b.guestName?.trim() ||
    b.guestEmail ||
    "Guest";

  const customerType = b.user ? "Account" : "Guest";

  const pickupShort = shortAddress(b.pickupAddress);
  const dropoffShort = shortAddress(b.dropoffAddress);

  const pickupWhen = formatDateTime(b.pickupAt, timeZone);
  const pickupRel = relativeToNow(b.pickupAt);

  const createdWhen = formatDateTime(b.createdAt, timeZone);
  const createdRel = relativeToNow(b.createdAt);

  const driver =
    b.assignment?.driver?.name?.trim() ||
    b.assignment?.driver?.email ||
    "Unassigned";

  const routeLine = `${pickupShort} → ${dropoffShort}`;

  return (
    <li className={styles.tripRow}>
      <div className={styles.tripLeft}>
        <div className={styles.tripTop}>
          <div className={styles.tripBadges}>
            <StatusPill status={b.status} />
            <span className="pill">{customerType}</span>
          </div>

          <div className={styles.tripActions}>
            <Link className='primaryBtn' href={`/admin/bookings/${b.id}`}>
              Review
            </Link>
          </div>
        </div>

        <div className={styles.tripMain}>
          <div className={styles.tripHeadline}>
            <div className='emptyTitle underline'>
              Pickup <span className={styles.rel}>({pickupRel})</span>
            </div>
            <div className='emptySmall'>{pickupWhen}</div>
          </div>

          <div className={styles.tripRoute}>
            <div className='emptyTitle underline'>Trip</div>
            <div className={styles.routeValue}>{routeLine}</div>
          </div>

          <div className={styles.tripDetails}>
            <Detail label='Client' value={customer} />
            <Detail
              label='Service'
              value={b.serviceType?.name ? b.serviceType.name : "—"}
            />
            <Detail label='Assigned to' value={driver} />
            <Detail label='Created' value={`${createdWhen} (${createdRel})`} />
            <Detail label='Pickup' value={pickupShort} />
            <Detail label='Drop off' value={dropoffShort} />
          </div>

          {!b.user ? (
            <div className={styles.tripGuestMeta}>
              {b.guestEmail ? (
                <div className='miniNote'>Email: {b.guestEmail}</div>
              ) : null}
              {b.guestPhone ? (
                <div className='miniNote'>Phone: {b.guestPhone}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detail}>
      <div className='emptyTitleSmall'>{label}</div>
      <div className='emptySmall'>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = status.replaceAll("_", " ").toLowerCase();
  return <span className='pill pillWarn emptyTitleSmall'>{label}</span>;
}

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function formatDateTime(d: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return fmt.format(d);
}

function relativeToNow(d: Date) {
  const now = Date.now();
  const diffMs = d.getTime() - now;

  const absMin = Math.round(Math.abs(diffMs) / 60000);
  const absHr = Math.floor(absMin / 60);
  const min = absMin % 60;

  const parts: string[] = [];
  if (absHr > 0) parts.push(`${absHr}h`);
  if (absHr < 6 && min > 0) parts.push(`${min}m`);
  const txt = parts.length ? parts.join(" ") : "now";

  return diffMs >= 0 ? `in ${txt}` : `${txt} ago`;
}
