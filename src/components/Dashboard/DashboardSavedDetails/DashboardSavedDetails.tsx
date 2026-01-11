import styles from "./DashboardSavedDetails.module.css";
import Link from "next/link";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export default function DashboardSavedDetails({
  profile,
  frequentPickups,
  frequentDropoffs,
  frequentRoutes,
  lastUsed,
}: {
  profile: { name: string; email: string };
  frequentPickups: { label: string; count: number; lastAt: Date }[];
  frequentDropoffs: { label: string; count: number; lastAt: Date }[];
  frequentRoutes: { label: string; count: number; lastAt: Date }[];
  lastUsed: null | {
    service: string | null;
    vehicle: string | null;
    passengers: number;
    luggage: number;
    specialRequests: string | null;
    pickupAt: Date;
    pickupAddress: string;
    dropoffAddress: string;
  };
}) {
  const hasAny =
    frequentPickups.length > 0 ||
    frequentDropoffs.length > 0 ||
    frequentRoutes.length > 0 ||
    Boolean(lastUsed);

  return (
    <section className={styles.container} aria-label='Saved details'>
      <header className={styles.header}>
        <div className={styles.titleBox}>
          <h1 className={`${styles.heading} h2`}>Saved details</h1>
          <p className={styles.subheading}>
            Quick access to your frequent locations and preferences.
            (Auto-generated from your booking history for now.)
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link className={styles.primaryBtn} href='/book'>
            Book a ride
          </Link>
          <Link className={styles.secondaryBtn} href='/dashboard/profile'>
            Profile & security
          </Link>
        </div>
      </header>

      {!hasAny ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing saved yet.</p>
          <p className={styles.emptyCopy}>
            Once you complete a trip, we’ll start surfacing your frequent
            pickup/dropoff locations and preferences here.
          </p>
          <div className={styles.btnRow}>
            <Link className={styles.primaryBtn} href='/book'>
              Book your first ride
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Account</h2>
            </header>

            <div className={styles.rows}>
              <div className={styles.row}>
                <div className={styles.key}>Name</div>
                <div className={styles.val}>{profile.name || "—"}</div>
              </div>
              <div className={styles.row}>
                <div className={styles.key}>Email</div>
                <div className={styles.val}>{profile.email || "—"}</div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Last used</h2>
            </header>

            {!lastUsed ? (
              <p className={styles.muted}>No recent trip details yet.</p>
            ) : (
              <div className={styles.rows}>
                <div className={styles.row}>
                  <div className={styles.key}>Date</div>
                  <div className={styles.val}>
                    {formatDate(lastUsed.pickupAt)}
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.key}>From</div>
                  <div className={styles.val}>{lastUsed.pickupAddress}</div>
                </div>
                <div className={styles.row}>
                  <div className={styles.key}>To</div>
                  <div className={styles.val}>{lastUsed.dropoffAddress}</div>
                </div>
                <div className={styles.row}>
                  <div className={styles.key}>Service</div>
                  <div className={styles.val}>{lastUsed.service ?? "—"}</div>
                </div>
                <div className={styles.row}>
                  <div className={styles.key}>Vehicle</div>
                  <div className={styles.val}>{lastUsed.vehicle ?? "—"}</div>
                </div>
                <div className={styles.row}>
                  <div className={styles.key}>Prefs</div>
                  <div className={styles.val}>
                    {lastUsed.passengers} pax • {lastUsed.luggage} luggage
                  </div>
                </div>
                {lastUsed.specialRequests ? (
                  <div className={styles.row}>
                    <div className={styles.key}>Notes</div>
                    <div className={styles.val}>{lastUsed.specialRequests}</div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Frequent pickups</h2>
            </header>

            {frequentPickups.length === 0 ? (
              <p className={styles.muted}>No pickup history yet.</p>
            ) : (
              <ul className={styles.list}>
                {frequentPickups.map((x) => (
                  <li key={x.label} className={styles.item}>
                    <div className={styles.itemLeft}>
                      <div className={styles.itemTitle}>{x.label}</div>
                      <div className={styles.itemMeta}>
                        {x.count} trip{x.count === 1 ? "" : "s"} • Last:{" "}
                        {formatDate(x.lastAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Frequent dropoffs</h2>
            </header>

            {frequentDropoffs.length === 0 ? (
              <p className={styles.muted}>No dropoff history yet.</p>
            ) : (
              <ul className={styles.list}>
                {frequentDropoffs.map((x) => (
                  <li key={x.label} className={styles.item}>
                    <div className={styles.itemLeft}>
                      <div className={styles.itemTitle}>{x.label}</div>
                      <div className={styles.itemMeta}>
                        {x.count} trip{x.count === 1 ? "" : "s"} • Last:{" "}
                        {formatDate(x.lastAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Frequent routes</h2>
            </header>

            {frequentRoutes.length === 0 ? (
              <p className={styles.muted}>No route history yet.</p>
            ) : (
              <ul className={styles.list}>
                {frequentRoutes.map((x) => (
                  <li key={x.label} className={styles.item}>
                    <div className={styles.itemLeft}>
                      <div className={styles.itemTitle}>{x.label}</div>
                      <div className={styles.itemMeta}>
                        {x.count} time{x.count === 1 ? "" : "s"} • Last:{" "}
                        {formatDate(x.lastAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`${styles.cardTitle} h4`}>Coming soon</h2>
            </header>

            <p className={styles.muted}>
              Soon you’ll be able to save addresses and preferences manually
              (with one-click prefill in the booking flow).
            </p>

            <div className={styles.btnRow}>
              <Link className={styles.secondaryBtn} href='/dashboard/trips'>
                View trips
              </Link>
              <Link className={styles.secondaryBtn} href='/dashboard/support'>
                Ask support
              </Link>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
