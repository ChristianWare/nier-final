/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "../../../../auth";
import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";

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
  return Array.isArray(roles) && roles.length > 0
    ? (roles as AppRole[])
    : (["USER"] as AppRole[]);
}

async function resolveViewer(
  session: any
): Promise<{ userId: string; roles: AppRole[] }> {
  const userId =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  const roles = normalizeRoles(session?.user?.roles);

  if (userId) {
    // If roles missing/stale in session, hydrate from DB
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

function formatDateTime(dt: Date) {
  return dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortStatus(status: BookingStatus) {
  return String(status).replaceAll("_", " ");
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

  // Scope: driver sees assigned; admin sees all assigned trips (MVP)
  const scopeWhere: any = isAdmin ? {} : { assignment: { driverId: userId } };

  const tabWhere: any =
    tab === "today"
      ? { pickupAt: { gte: todayStart, lte: todayEnd } }
      : tab === "upcoming"
        ? {
            pickupAt: { gt: todayEnd, lte: upcomingEnd },
            status: { notIn: TERMINAL },
          }
        : tab === "completed"
          ? { status: { in: TERMINAL } }
          : {
              status: { notIn: TERMINAL },
              OR: [
                // “Time changed / details changed” heuristic
                { updatedAt: { gte: attentionSince } },

                // Status changed recently (driver cares)
                {
                  statusEvents: {
                    some: { createdAt: { gte: attentionSince } },
                  },
                },

                // Missing notes / instructions
                { AND: [{ internalNotes: null }, { specialRequests: null }] },
              ],
            };

  const trips = await db.booking.findMany({
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
      payment: { select: { status: true } },
      statusEvents: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

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


  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <h1 className='h2'>Trips</h1>
          <p style={{ margin: 0, opacity: 0.75 }}>
            Fast access to what you need right now.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <TabLink
            href={tabHref("today")}
            active={tab === "today"}
            label='Today'
          />
          <TabLink
            href={tabHref("upcoming")}
            active={tab === "upcoming"}
            label='Upcoming'
          />
          <TabLink
            href={tabHref("completed")}
            active={tab === "completed"}
            label='Completed'
          />
          <TabLink
            href={tabHref("attention")}
            active={tab === "attention"}
            label='Needs attention'
          />
        </div>
      </header>

      <div style={{ display: "grid", gap: 10 }}>
        {trips.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          trips.map((t) => {
            const passenger = t.user?.name?.trim() || "Passenger";
            const typeLabel = tripTypeLabel({
              slug: t.serviceType.slug,
              pricingStrategy: t.serviceType.pricingStrategy,
            });

            const lu = lastUpdated(t);

            return (
              <Link
                key={t.id}
                href={`/driver-dashboard/trips/${t.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 10,
                  padding: 14,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 700 }}>
                      {formatDateTime(t.pickupAt)}
                    </div>
                    <div style={{ opacity: 0.8 }}>
                      {t.pickupAddress} → {t.dropoffAddress}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Pill text={typeLabel} />
                    <Pill text={shortStatus(t.status)} />
                    <span style={{ fontSize: 12, opacity: 0.65 }}>
                      Updated {formatDateTime(lu)}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{passenger}</span>

                    {tab === "attention" ? (
                      <span style={{ fontSize: 12, opacity: 0.8 }}>
                        {attentionBadge(t)}
                      </span>
                    ) : null}
                  </div>

                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(0,0,0,0.12)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Open trip →
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}

function TabLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        padding: "8px 10px",
        borderRadius: 10,
        border: active
          ? "1px solid rgba(0,0,0,0.35)"
          : "1px solid rgba(0,0,0,0.12)",
        background: active ? "rgba(0,0,0,0.04)" : "transparent",
        color: "inherit",
        fontWeight: 700,
        fontSize: 13,
      }}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: "6px 8px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.12)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const copy =
    tab === "today"
      ? "No trips scheduled for today."
      : tab === "upcoming"
        ? "No upcoming trips in the next 7 days."
        : tab === "completed"
          ? "No completed trips yet."
          : "Nothing needs attention right now.";
  return (
    <div
      style={{
        border: "1px dashed rgba(0,0,0,0.18)",
        borderRadius: 12,
        padding: 18,
        opacity: 0.85,
      }}
    >
      {copy}
    </div>
  );
}
