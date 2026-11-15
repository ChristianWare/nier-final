/* eslint-disable @typescript-eslint/no-explicit-any */
// The corporate dashboard's overview: who the company is and who's booking,
// four numbers that open their pages, anything that needs the booker
// (invoices due, rides waiting on approval or payment), the rides coming
// up and who's riding, recent activity with Book again, and the account's
// billing terms.

import styles from "./CorporateDashboard.module.css";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import { SITE } from "@/config/site";
import SectionHeading from "@/components/shared/SectionHeading/SectionHeading";
import Button from "@/components/shared/Button/Button";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import RedoIcon from "@/components/shared/icons/RedoIcon/RedoIcon";
import AddToCalendar from "@/components/Dashboard/AddToCalendar/AddToCalendar";
import { rideCalendarEvent } from "@/components/Dashboard/AddToCalendar/rideEvent";
import { shortPlace } from "@/lib/shortPlace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_TEXT: Record<string, string> = {
  PENDING_REVIEW: "Awaiting approval",
  PENDING_PAYMENT: "Payment due",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Chauffeur assigned",
  EN_ROUTE: "On the way",
  ARRIVED: "Chauffeur arrived",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DECLINED: "Declined",
  NO_SHOW: "No-show",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
};

const STATUS_TONE: Record<string, string> = {
  PENDING_REVIEW: "neutral",
  PENDING_PAYMENT: "warn",
  CONFIRMED: "good",
  ASSIGNED: "good",
  EN_ROUTE: "accent",
  ARRIVED: "accent",
  IN_PROGRESS: "accent",
  COMPLETED: "good",
  CANCELLED: "bad",
  DECLINED: "bad",
  NO_SHOW: "bad",
};

/** Rides that are over, and can be booked again. */
const FINISHED = ["COMPLETED", "CANCELLED", "NO_SHOW", "REFUNDED"];

function firstName(name: string | null | undefined) {
  return (name ?? "").trim().split(/\s+/)[0] || null;
}

/** "ARIA → Wynn", or for hourly rides "3 hours from ARIA". */
function routeLabel(b: {
  pickupAddress: string;
  dropoffAddress: string;
  hoursRequested: number | null;
}) {
  const from = shortPlace(b.pickupAddress);
  const to = shortPlace(b.dropoffAddress);
  if (b.hoursRequested && (from === to || !to)) {
    return `${b.hoursRequested} hour${b.hoursRequested === 1 ? "" : "s"} from ${from}`;
  }
  return null;
}

function limitLevel(pct: number): "ok" | "warning" | "danger" {
  if (pct >= 100) return "danger";
  if (pct >= 80) return "warning";
  return "ok";
}

export default async function CorporateDashboardPage() {
  noStore();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const settings = await getCompanySettings();
  const companyTz = settings.timezone;

  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user.id },
    select: {
      role: true,
      corporateAccount: {
        select: {
          id: true,
          name: true,
          status: true,
          billingCycle: true,
          paymentMethod: true,
          paymentTerms: true,
          discountPercent: true,
          monthlyLimitCents: true,
        },
      },
    },
  });

  const account = contact?.corporateAccount;
  if (!account) redirect("/");

  const now = new Date();
  const monthStart = tz.startOfMonth(now, companyTz);
  const nextMonthStart = tz.addMonths(monthStart, 1, companyTz);

  const cancelledStatuses = ["CANCELLED", "REFUNDED", "NO_SHOW"] as any;
  const rideSelect = {
    id: true,
    status: true,
    createdAt: true,
    pickupAt: true,
    pickupAddress: true,
    dropoffAddress: true,
    hoursRequested: true,
    durationMinutes: true,
    flightAirline: true,
    flightNumber: true,
    totalCents: true,
    currency: true,
    serviceType: { select: { name: true } },
    vehicle: { select: { name: true } },
    corporatePassenger: { select: { name: true } },
    assignment: {
      select: {
        driver: { select: { name: true } },
        vehicleUnit: { select: { name: true, plate: true } },
      },
    },
  } as const;

  const [
    ridesThisMonth,
    totalRidesAllTime,
    activeEmployees,
    totalEmployees,
    upcomingRidesCount,
    spendThisMonthAgg,
    invoicesDue,
    ridesWaiting,
    upcomingRides,
    recentBookings,
  ] = await Promise.all([
    db.booking.count({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: monthStart, lt: nextMonthStart },
        NOT: { status: { in: cancelledStatuses } },
      },
    }),
    db.booking.count({
      where: {
        corporateAccountId: account.id,
        NOT: { status: { in: cancelledStatuses } },
      },
    }),
    db.corporatePassenger.count({
      where: { corporateAccountId: account.id, active: true },
    }),
    db.corporatePassenger.count({
      where: { corporateAccountId: account.id },
    }),
    db.booking.count({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: now },
        NOT: { status: { in: cancelledStatuses } },
      },
    }),
    (db.booking as any).aggregate({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: monthStart, lt: nextMonthStart },
        NOT: { status: { in: cancelledStatuses } },
      },
      _sum: { totalCents: true },
    }),

    // Needs your attention: invoices sent and not yet paid…
    db.corporateInvoice.findMany({
      where: {
        corporateAccountId: account.id,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        dueDate: true,
        totalCents: true,
        amountPaidCents: true,
      },
    }),
    // …and rides waiting on approval or payment.
    db.booking.findMany({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: now },
        status: { in: ["PENDING_REVIEW", "PENDING_PAYMENT"] },
      },
      orderBy: { pickupAt: "asc" },
      take: 5,
      select: rideSelect,
    }),

    db.booking.findMany({
      where: {
        corporateAccountId: account.id,
        pickupAt: { gte: now },
        NOT: {
          status: {
            in: [...cancelledStatuses, "PENDING_REVIEW", "PENDING_PAYMENT"],
          },
        },
      },
      orderBy: { pickupAt: "asc" },
      take: 6,
      select: rideSelect,
    }),

    db.booking.findMany({
      where: { corporateAccountId: account.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: rideSelect,
    }),
  ]);

  const spendThisMonthCents = Number(spendThisMonthAgg?._sum?.totalCents ?? 0);
  const monthlyLimitCents = account.monthlyLimitCents
    ? Number(account.monthlyLimitCents)
    : null;
  const limitPercent =
    monthlyLimitCents && monthlyLimitCents > 0
      ? Math.round((spendThisMonthCents / monthlyLimitCents) * 100)
      : null;

  const companyName = settings.companyName || SITE.name;
  const canBook = account.status === "ACTIVE";
  const greeting = firstName(session.user.name) ?? "there";

  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: companyTz, ...opts }).format(
      d,
    );
  const ymd = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: companyTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const today = ymd(now);

  const kpis = [
    {
      label: "Rides this month",
      value: String(ridesThisMonth),
      sub: `${totalRidesAllTime} all time`,
      href: "/corporate/bookings?range=month",
    },
    {
      label: "Spend this month",
      value: tz.formatMoneyShort(spendThisMonthCents),
      sub: limitPercent === null ? "No monthly limit" : null,
      href: "/corporate/billing",
      limit: limitPercent,
    },
    {
      label: "Employees",
      value: String(activeEmployees),
      sub: `${totalEmployees} on the roster`,
      href: "/corporate/employees",
    },
    {
      label: "Upcoming rides",
      value: String(upcomingRidesCount),
      sub: "Booked ahead",
      href: "/corporate/bookings?range=upcoming",
    },
  ];

  // Only invoices with something left to pay.
  const invoicesOwed = invoicesDue.filter(
    (inv) => inv.totalCents - inv.amountPaidCents > 0,
  );
  const hasAttention = invoicesOwed.length > 0 || ridesWaiting.length > 0;

  return (
    <section className={styles.container}>
      {/* Header: the company, the booker, Book a ride */}
      <header className={styles.header}>
        <div className={styles.intro}>
          <SectionHeading dot text={account.name} />
          <h1 className={`${styles.heading} h3`}>Welcome back, {greeting}</h1>
          <p className={styles.copy}>
            Your company&apos;s rides, who&apos;s riding, and what&apos;s been
            billed.
          </p>
          {canBook ? (
            <Button
              href='/corporate/bookings/new'
              text='Book a ride'
              btnType='black'
              arrow
            />
          ) : null}
        </div>

        <div className={styles.kpis}>
          {kpis.map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className={`${styles.kpi} ${
                k.limit != null && limitLevel(k.limit) !== "ok"
                  ? styles.kpiAccent
                  : ""
              }`}
            >
              <span className={styles.kpiLabel}>{k.label}</span>
              <span className={styles.kpiValue}>{k.value}</span>
              {k.limit != null && monthlyLimitCents ? (
                <span className={styles.limit}>
                  <span className={styles.limitTrack}>
                    <span
                      className={`${styles.limitFill} ${styles[`limit_${limitLevel(k.limit)}`]}`}
                      style={{ width: `${Math.min(k.limit, 100)}%` }}
                    />
                  </span>
                  <span className={styles.kpiSub}>
                    {k.limit}% of {tz.formatMoneyShort(monthlyLimitCents)} limit
                  </span>
                </span>
              ) : (
                <span className={styles.kpiSub}>{k.sub}</span>
              )}
            </Link>
          ))}
        </div>
      </header>

      {/* Needs your attention */}
      {hasAttention ? (
        <section className={styles.section} aria-labelledby='attention'>
          <header className={styles.sectionTop}>
            <h2 id='attention' className='cardTitle h4'>
              Needs your attention
            </h2>
            <span className={styles.count}>
              {invoicesOwed.length + ridesWaiting.length}
            </span>
          </header>
          <ul className={styles.attention}>
            {invoicesOwed.map((inv) => {
              const owed = Math.max(0, inv.totalCents - inv.amountPaidCents);
              const overdue =
                inv.status === "OVERDUE" ||
                (inv.dueDate != null && inv.dueDate < now);
              return (
                <li
                  key={inv.id}
                  className={`${styles.attentionItem} ${overdue ? styles.attentionDanger : styles.attentionWarn}`}
                >
                  <div className={styles.attentionMain}>
                    <span
                      className={`badge ${overdue ? "badge_bad" : "badge_warn"}`}
                    >
                      {overdue ? "Invoice overdue" : "Invoice due"}
                    </span>
                    <p className={styles.attentionTitle}>
                      Invoice {inv.invoiceNumber}
                    </p>
                    <p className={styles.attentionNote}>
                      {inv.dueDate
                        ? `${overdue ? "Was due" : "Due"} ${fmt(inv.dueDate, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`
                        : "Sent, not yet paid"}
                      {inv.amountPaidCents > 0
                        ? ` · ${tz.formatMoneyShort(inv.amountPaidCents)} paid so far`
                        : ""}
                    </p>
                  </div>
                  <div className={styles.attentionSide}>
                    <span className={styles.amount}>
                      {tz.formatMoneyShort(owed)}
                    </span>
                    <Link href='/corporate/billing' className={styles.payBtn}>
                      View invoice
                    </Link>
                  </div>
                </li>
              );
            })}
            {ridesWaiting.map((r) => {
              const isPayment = r.status === "PENDING_PAYMENT";
              return (
                <li
                  key={r.id}
                  className={`${styles.attentionItem} ${isPayment ? styles.attentionWarn : ""}`}
                >
                  <div className={styles.attentionMain}>
                    <span
                      className={`badge ${isPayment ? "badge_warn" : "badge_neutral"}`}
                    >
                      {STATUS_TEXT[r.status]}
                    </span>
                    <p className={styles.attentionTitle}>
                      {r.corporatePassenger?.name ?? "Ride"} ·{" "}
                      {fmt(r.pickupAt, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className={styles.attentionNote}>
                      {routeLabel(r) ?? (
                        <>
                          {shortPlace(r.pickupAddress)}
                          <Arrow
                            className={styles.routeArrow}
                            aria-hidden='true'
                          />
                          {shortPlace(r.dropoffAddress)}
                        </>
                      )}
                    </p>
                  </div>
                  <div className={styles.attentionSide}>
                    <span className={styles.amount}>
                      {r.totalCents ? tz.formatMoneyShort(r.totalCents) : "—"}
                    </span>
                    <Link
                      href={`/corporate/bookings/${r.id}`}
                      className={isPayment ? styles.payBtn : styles.viewBtn}
                    >
                      View
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Coming up: who's riding, when, and with whom */}
      <section className={styles.section} aria-labelledby='upcoming'>
        <header className={styles.sectionTop}>
          <h2 id='upcoming' className='cardTitle h4'>
            Coming up
          </h2>
          <Link href='/corporate/bookings?range=upcoming' className='backBtn'>
            All bookings
          </Link>
        </header>

        {upcomingRides.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>No rides booked right now</p>
            <p className={styles.emptyCopy}>
              Book a ride for anyone on your roster, or pick a past ride below
              to book it again.
            </p>
            {canBook ? (
              <Button
                href='/corporate/bookings/new'
                text='Book a ride'
                btnType='red'
                arrow
              />
            ) : null}
          </div>
        ) : (
          <ul className={styles.rides}>
            {upcomingRides.map((r) => {
              const isToday = ymd(r.pickupAt) === today;
              const unit = r.assignment?.vehicleUnit;
              const chauffeur = firstName(r.assignment?.driver?.name);
              const car = [unit?.name, unit?.plate].filter(Boolean).join(" · ");
              const event = rideCalendarEvent(
                {
                  id: r.id,
                  pickupAt: r.pickupAt,
                  pickupAddress: r.pickupAddress,
                  dropoffAddress: r.dropoffAddress,
                  serviceName: r.serviceType?.name ?? "Ride",
                  vehicleName: r.vehicle?.name ?? null,
                  durationMinutes: r.durationMinutes,
                  hoursRequested: r.hoursRequested,
                  flight: r.flightNumber
                    ? [r.flightAirline, r.flightNumber]
                        .filter(Boolean)
                        .join(" ")
                    : null,
                },
                {
                  name: companyName,
                  dispatchPhone: settings.dispatchPhone,
                  siteUrl: SITE.url,
                },
              );
              event.url = `${SITE.url.replace(/\/$/, "")}/corporate/bookings/${r.id}`;
              if (r.corporatePassenger?.name) {
                event.title = `${event.title} for ${r.corporatePassenger.name}`;
              }
              return (
                <li
                  key={r.id}
                  className={`${styles.ride} ${isToday ? styles.rideToday : ""}`}
                >
                  <span className={styles.date} aria-hidden='true'>
                    <span className={styles.dow}>
                      {isToday
                        ? "Today"
                        : fmt(r.pickupAt, { weekday: "short" })}
                    </span>
                    <span className={styles.day}>
                      {fmt(r.pickupAt, { day: "numeric" })}
                    </span>
                    <span className={styles.mon}>
                      {fmt(r.pickupAt, { month: "short" })}
                    </span>
                  </span>

                  <Link
                    href={`/corporate/bookings/${r.id}`}
                    className={styles.rideInfo}
                  >
                    <span className={styles.rideTop}>
                      <span className={styles.rideTime}>
                        {fmt(r.pickupAt, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className={styles.ridePassenger}>
                        {r.corporatePassenger?.name ?? "No passenger set"}
                      </span>
                    </span>
                    <span className={styles.rideRoute}>
                      {routeLabel(r) ?? (
                        <>
                          {shortPlace(r.pickupAddress)}
                          <Arrow
                            className={styles.routeArrow}
                            aria-hidden='true'
                          />
                          {shortPlace(r.dropoffAddress)}
                        </>
                      )}
                    </span>
                    <span className={styles.rideMeta}>
                      {[r.serviceType?.name, r.vehicle?.name]
                        .filter(Boolean)
                        .join(" · ")}
                      {chauffeur
                        ? ` · Chauffeur ${chauffeur}${car ? `, ${car}` : ""}`
                        : ""}
                    </span>
                  </Link>

                  <span className={styles.rideSide}>
                    <span
                      className={`badge badge_${STATUS_TONE[r.status] ?? "neutral"}`}
                    >
                      {STATUS_TEXT[r.status] ?? r.status}
                    </span>
                    <AddToCalendar
                      icsHref={`/corporate/bookings/${r.id}/calendar`}
                      event={event}
                      compact
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recent activity, with Book again on rides that are over */}
      {recentBookings.length > 0 ? (
        <section className={styles.section} aria-labelledby='recent'>
          <header className={styles.sectionTop}>
            <h2 id='recent' className='cardTitle h4'>
              Recent activity
            </h2>
          </header>
          <ul className={styles.activity}>
            {recentBookings.map((b) => {
              const chauffeur = firstName(b.assignment?.driver?.name);
              const again = canBook && FINISHED.includes(b.status);
              return (
                <li key={b.id} className={styles.activityItem}>
                  <Link
                    href={`/corporate/bookings/${b.id}`}
                    className={styles.activityMain}
                  >
                    <span className={styles.activityTitle}>
                      {routeLabel(b) ?? (
                        <>
                          {shortPlace(b.pickupAddress)}
                          <Arrow
                            className={styles.routeArrow}
                            aria-hidden='true'
                          />
                          {shortPlace(b.dropoffAddress)}
                        </>
                      )}
                    </span>
                    <span className={styles.activityMeta}>
                      {fmt(b.pickupAt, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {fmt(b.pickupAt, { hour: "numeric", minute: "2-digit" })}
                      {b.corporatePassenger?.name
                        ? ` · ${b.corporatePassenger.name}`
                        : ""}
                      {chauffeur ? ` · Chauffeur ${chauffeur}` : ""}
                      {b.totalCents > 0
                        ? ` · ${tz.formatMoneyShort(b.totalCents)}`
                        : ""}
                    </span>
                  </Link>
                  <span className={styles.activitySide}>
                    <span
                      className={`badge badge_${STATUS_TONE[b.status] ?? "neutral"}`}
                    >
                      {STATUS_TEXT[b.status] ?? b.status}
                    </span>
                    {again ? (
                      <Link
                        href={`/corporate/bookings/new?again=${b.id}`}
                        className={styles.again}
                      >
                        <RedoIcon
                          className={styles.againIcon}
                          aria-hidden='true'
                        />
                        Book again
                      </Link>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* The account's terms */}
      <section className={styles.terms} aria-label='Billing terms'>
        <div>
          <span className={styles.termsLabel}>Payment method</span>
          <span className={styles.termsValue}>
            {account.paymentMethod === "INVOICE"
              ? "Electronic invoice"
              : account.paymentMethod === "CHECK"
                ? "Check"
                : "Card on file"}
          </span>
        </div>
        <div>
          <span className={styles.termsLabel}>Billing cycle</span>
          <span className={styles.termsValue}>
            {account.billingCycle === "MONTHLY"
              ? "Monthly"
              : account.billingCycle === "WEEKLY"
                ? "Weekly"
                : "Per ride"}
          </span>
        </div>
        <div>
          <span className={styles.termsLabel}>Payment terms</span>
          <span className={styles.termsValue}>
            {account.paymentTerms === "NET_30"
              ? "Due within 30 days"
              : account.paymentTerms === "NET_15"
                ? "Due within 15 days"
                : account.paymentTerms === "NET_45"
                  ? "Due within 45 days"
                  : "Due on receipt"}
          </span>
        </div>
        {account.discountPercent && Number(account.discountPercent) > 0 ? (
          <div>
            <span className={styles.termsLabel}>Your discount</span>
            <span className={`${styles.termsValue} ${styles.good}`}>
              {Number(account.discountPercent)}% off every ride
            </span>
          </div>
        ) : null}
      </section>
    </section>
  );
}
