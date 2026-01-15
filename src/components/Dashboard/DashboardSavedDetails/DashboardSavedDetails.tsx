import styles from "./DashboardSavedDetails.module.css";
import Button from "@/components/shared/Button/Button";
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
    <section className='container' aria-label='Saved details'>
      <header className='header'>
        <h1 className={`heading h2`}>Saved details</h1>
        <p className='subheading'>
          Quick access to your frequent locations and preferences.
          (Auto-generated from your booking history.)
        </p>
      </header>

      {!hasAny ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing saved yet.</p>
          <p className={styles.emptyCopy}>
            Once you complete a trip, we’ll start surfacing your frequent
            pickup/dropoff locations and preferences here.
          </p>
          <div className={styles.actionsRow}>
            <div className={styles.btnContainer}>
              <Button
                href='/book'
                btnType='red'
                text='Book your first ride'
                arrow
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`cardTitle h4`}>Account</h2>
              <div className={styles.metaRight}>Profile basics</div>
            </header>

            <div className={styles.rows}>
              <div className={styles.row}>
                <span className="label">Name</span>
                <span className="emptyTitleSmall">{profile.name || "—"}</span>
              </div>
              <div className={styles.row}>
                <span className="label">Email</span>
                <span className="emptyTitleSmall">{profile.email || "—"}</span>
              </div>
            </div>

            <div className={styles.cardActions}>
              <Link className={styles.secondaryBtn} href='/dashboard/profile'>
                Profile & security
              </Link>
              <Link className={styles.secondaryBtn} href='/book'>
                Book a ride
              </Link>
            </div>
          </section>

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`cardTitle h4`}>Last used</h2>
              <div className={styles.metaRight}>
                Recent preferences from your last booking
              </div>
            </header>

            {!lastUsed ? (
              <p className="miniNote">No recent trip details yet.</p>
            ) : (
              <div className={styles.tripMetaBox}>
                <div className={styles.tripMetaLine}>
                  <span className={styles.tripMetaKey}>Date</span>
                  <span className="emptyTitleSmall">
                    {formatDate(lastUsed.pickupAt)}
                  </span>
                </div>

                <div className={styles.tripMetaLine}>
                  <span className={styles.tripMetaKey}>From</span>
                  <span className="emptyTitleSmall">
                    {lastUsed.pickupAddress}
                  </span>
                </div>

                <div className={styles.tripMetaLine}>
                  <span className={styles.tripMetaKey}>To</span>
                  <span className="emptyTitleSmall">
                    {lastUsed.dropoffAddress}
                  </span>
                </div>

                <div className={styles.tripMetaLine}>
                  <span className={styles.tripMetaKey}>Service</span>
                  <span className="emptyTitleSmall">
                    {lastUsed.service ?? "—"}
                  </span>
                </div>

                <div className={styles.tripMetaLine}>
                  <span className={styles.tripMetaKey}>Vehicle</span>
                  <span className="emptyTitleSmall">
                    {lastUsed.vehicle ?? "—"}
                  </span>
                </div>

                <div className={styles.tripMetaLine}>
                  <span className={styles.tripMetaKey}>Prefs</span>
                  <span className="emptyTitleSmall">
                    {lastUsed.passengers} pax • {lastUsed.luggage} luggage
                  </span>
                </div>

                {lastUsed.specialRequests ? (
                  <div className={styles.tripMetaLine}>
                    <span className={styles.tripMetaKey}>Notes</span>
                    <span className="emptyTitleSmall">
                      {lastUsed.specialRequests}
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <header className={styles.cardTop}>
              <h2 className={`cardTitle h4`}>Frequent pickups</h2>
              <div className={styles.metaRight}>Based on your history</div>
            </header>

            {frequentPickups.length === 0 ? (
              <p className="miniNote">No pickup history yet.</p>
            ) : (
              <ul className={styles.list}>
                {frequentPickups.map((x) => (
                  <li key={x.label} className={styles.item}>
                    <div className={styles.itemLeft}>
                      <div className='emptyTitleSmall'>{x.label}</div>
                      <div className="emptySmall">
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
              <h2 className={`cardTitle h4`}>Frequent dropoffs</h2>
              <div className={styles.metaRight}>Based on your history</div>
            </header>

            {frequentDropoffs.length === 0 ? (
              <p className="miniNote">No dropoff history yet.</p>
            ) : (
              <ul className={styles.list}>
                {frequentDropoffs.map((x) => (
                  <li key={x.label} className={styles.item}>
                    <div className={styles.itemLeft}>
                      <div className='emptyTitleSmall'>{x.label}</div>
                      <div className="emptySmall">
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
              <h2 className={`cardTitle h4`}>Frequent routes</h2>
              <div className={styles.metaRight}>Most common pairs</div>
            </header>

            {frequentRoutes.length === 0 ? (
              <p className="miniNote">No route history yet.</p>
            ) : (
              <ul className={styles.list}>
                {frequentRoutes.map((x) => (
                  <li key={x.label} className={styles.item}>
                    <div className={styles.itemLeft}>
                      <div className='emptyTitleSmall'>{x.label}</div>
                      <div className="emptySmall">
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
              <h2 className={`cardTitle h4`}>Coming soon</h2>
              <div className={styles.metaRight}>
                Manual saves + one-click prefill
              </div>
            </header>

            <p className="miniNote">
              Soon you’ll be able to save addresses and preferences manually
              (with one-click prefill in the booking flow).
            </p>

            <div className={styles.formActions}>
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
