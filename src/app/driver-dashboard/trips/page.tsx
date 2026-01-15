/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./DriverTripsPage.module.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";
import Button from "@/components/shared/Button/Button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";
type Tab = "today" | "upcoming" | "completed" | "attention";

const TERMINAL: BookingStatus[] = [
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
  BookingStatus.PARTIALLY_REFUNDED,
  BookingStatus.NO_SHOW,
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function normalizeRoles(roles: any): AppRole[] {
  return Array.isArray(roles) && roles.length > 0 ? (roles as AppRole[]) : [];
}

async function resolveViewer(
  session: any
): Promise<{ userId: string; roles: AppRole[] }> {
  const userId =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  const roles = normalizeRoles(session?.user?.roles);

  if (userId) {
    if (roles.length) return { userId, roles };

    const u = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, roles: true },
    });

    if (u?.id) return { userId: u.id, roles: normalizeRoles(u.roles) };
  }

  const email = session?.user?.email ?? null;
  if (!email) throw new Error("Missing identity");

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true, roles: true },
  });

  if (!u?.id) throw new Error("User not found");
  return { userId: u.id, roles: normalizeRoles(u.roles) };
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
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

function tripTypeLabel(service: { slug: string; pricingStrategy: string }) {
  const slug = (service.slug || "").toLowerCase();
  if (slug.includes("airport")) return "Airport";
  if (slug.includes("event")) return "Event";
  if (service.pricingStrategy === "HOURLY") return "Hourly";
  return "Point-to-point";
}

function isTab(x: any): x is Tab {
  return (
    x === "today" || x === "upcoming" || x === "completed" || x === "attention"
  );
}

export default async function DriverTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard/trips");

  const { userId, roles } = await resolveViewer(session);

  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");
  if (!isAdmin && !isDriver) redirect("/");

  const sp = await searchParams;
  const tab: Tab = isTab(sp.tab) ? sp.tab : "today";

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const upcomingEnd = endOfDay(addDays(now, 7));
  const attentionSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const scopeWhere: any = isAdmin ? {} : { assignment: { driverId: userId } };

  const todayWhere: any = { pickupAt: { gte: todayStart, lte: todayEnd } };

  const upcomingWhere: any = {
    pickupAt: { gt: todayEnd, lte: upcomingEnd },
    status: { notIn: TERMINAL },
  };

  const completedWhere: any = { status: { in: TERMINAL } };

  const attentionWhere: any = {
    status: { notIn: TERMINAL },
    OR: [
      { updatedAt: { gte: attentionSince } },
      { statusEvents: { some: { createdAt: { gte: attentionSince } } } },
      { AND: [{ internalNotes: null }, { specialRequests: null }] },
    ],
  };

  const tabWhere: any =
    tab === "today"
      ? todayWhere
      : tab === "upcoming"
        ? upcomingWhere
        : tab === "completed"
          ? completedWhere
          : attentionWhere;

  const [counts, trips] = await Promise.all([
    Promise.all([
      db.booking.count({ where: { ...scopeWhere, ...todayWhere } }),
      db.booking.count({ where: { ...scopeWhere, ...upcomingWhere } }),
      db.booking.count({ where: { ...scopeWhere, ...completedWhere } }),
      db.booking.count({ where: { ...scopeWhere, ...attentionWhere } }),
    ]).then(([today, upcoming, completed, attention]) => ({
      today,
      upcoming,
      completed,
      attention,
    })),
    db.booking.findMany({
      where: { ...scopeWhere, ...tabWhere },
      orderBy:
        tab === "completed" ? [{ pickupAt: "desc" }] : [{ pickupAt: "asc" }],
      take: 200,
      select: {
        id: true,
        pickupAt: true,
        pickupAddress: true,
        dropoffAddress: true,
        status: true,
        updatedAt: true,
        internalNotes: true,
        specialRequests: true,
        user: { select: { name: true } },
        serviceType: {
          select: { name: true, slug: true, pricingStrategy: true },
        },
        statusEvents: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
  ]);

  const tabHref = (t: Tab) =>
    t === "today"
      ? "/driver-dashboard/trips"
      : `/driver-dashboard/trips?tab=${t}`;

  const lastUpdated = (t: (typeof trips)[number]) =>
    t.statusEvents[0]?.createdAt ?? t.updatedAt;

  const attentionBadge = (t: (typeof trips)[number]) => {
    const reasons: string[] = [];
    const lu = lastUpdated(t);
    if (lu >= attentionSince) reasons.push("Updated");
    if (!t.internalNotes && !t.specialRequests) reasons.push("Missing notes");
    return reasons.slice(0, 2).join(" • ");
  };

  const emptyCopy =
    tab === "today"
      ? "No trips scheduled for today."
      : tab === "upcoming"
        ? "No upcoming trips in the next 7 days."
        : tab === "completed"
          ? "No completed trips yet."
          : "Nothing needs attention right now.";

  return (
    <section className='container' aria-label='Trips'>
      <header className='header'>
        <h1 className='heading h2'>Trips</h1>
        <p className='subheading'>Fast access to what you need right now.</p>

        <nav className='tabs' aria-label='Trip filters'>
          <Link
            href={tabHref("today")}
            className={`tab ${tab === "today" ? "tabActive" : ""}`}
          >
            Today <span className='count'>{counts.today}</span>
          </Link>

          <Link
            href={tabHref("upcoming")}
            className={`tab ${tab === "upcoming" ? "tabActive" : ""}`}
          >
            Upcoming <span className='count'>{counts.upcoming}</span>
          </Link>

          <Link
            href={tabHref("completed")}
            className={`tab ${tab === "completed" ? "tabActive" : ""}`}
          >
            Completed <span className='count'>{counts.completed}</span>
          </Link>

          <Link
            href={tabHref("attention")}
            className={`tab ${tab === "attention" ? "tabActive" : ""}`}
          >
            Needs attention <span className='count'>{counts.attention}</span>
          </Link>
        </nav>
      </header>

      {trips.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No trips found.</p>
          <p className={styles.emptyCopy}>{emptyCopy}</p>
          <div className={styles.actionsRow}>
            <div className={styles.btnContainer}>
              <Button
                href='/driver-dashboard'
                btnType='red'
                text='Back to dashboard'
                arrow
              />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {trips.map((t) => {
            const passenger = t.user?.name?.trim() || "Passenger";
            const lu = lastUpdated(t);
            const typeLabel = tripTypeLabel({
              slug: t.serviceType.slug,
              pricingStrategy: t.serviceType.pricingStrategy,
            });

            const notes =
              [t.specialRequests, t.internalNotes]
                .filter(Boolean)
                .join(" • ") || "—";

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
                      <span className={styles.pill}>{typeLabel}</span>
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      Passenger
                    </div>
                    <div className='emptySmall'>{passenger}</div>
                  </div>

                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      Notes
                    </div>
                    <div className='emptySmall'>{notes}</div>
                  </div>

                  <div className={styles.row}>
                    <div className={`${styles.emptyTitleLocal} emptyTitle`}>
                      Updated
                    </div>
                    <div className='emptySmall'>
                      {formatDateTime(lu)}
                      {tab === "attention" ? (
                        <span className={styles.pill}>{attentionBadge(t)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className={styles.btnRow}>
                  <Link
                    className='primaryBtn'
                    href={`/driver-dashboard/trips/${t.id}`}
                  >
                    Open trip →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
