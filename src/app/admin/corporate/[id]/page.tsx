/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./CorporateAccountDetailPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import {
  AccountStatusClient,
  AddPassengerClient,
  TogglePassengerBtn,
  EditPaymentSettingsClient,
} from "./AccountActionsClient";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Button from "@/components/shared/Button/Button";
import VehicleUsageChart from "@/components/admin/VehicleUsageChart/VehicleUsageChart";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── Formatting helpers ── */

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function statusBadgeTone(status: string) {
  if (status === "ACTIVE") return "good";
  if (status === "SUSPENDED") return "warn";
  return "bad";
}

function bookingBadgeTone(status: string) {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "neutral";
  if (status === "CONFIRMED" || status === "ASSIGNED" || status === "COMPLETED")
    return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  return "neutral";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_REVIEW: "Pending review",
    PENDING_PAYMENT: "Payment due",
    CONFIRMED: "Confirmed",
    ASSIGNED: "Driver assigned",
    EN_ROUTE: "Driver en route",
    ARRIVED: "Driver arrived",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    NO_SHOW: "No-show",
    REFUNDED: "Refunded",
    PARTIALLY_REFUNDED: "Partially refunded",
    DRAFT: "Draft",
  };
  return labels[status] || String(status).replaceAll("_", " ");
}

function paymentTermsLabel(terms: string) {
  switch (terms) {
    case "NET_15":
      return "NET 15";
    case "NET_30":
      return "NET 30";
    case "NET_45":
      return "NET 45";
    case "DUE_ON_RECEIPT":
      return "Due on Receipt";
    default:
      return terms;
  }
}

function billingCycleLabel(cycle: string) {
  switch (cycle) {
    case "MONTHLY":
      return "Monthly";
    case "WEEKLY":
      return "Weekly";
    case "PER_RIDE":
      return "Per Ride";
    default:
      return cycle;
  }
}

function paymentMethodLabel(method: string) {
  switch (method) {
    case "INVOICE":
      return "Electronic Invoice";
    case "CHECK":
      return "Physical Check";
    case "CARD_ON_FILE":
      return "Card on File";
    default:
      return method;
  }
}

/* ── Chart aggregation ── */

async function chartAggMonthlyCorporateBookings(
  corporateAccountId: string,
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
) {
  const rows = await db.$queryRaw<any[]>`
    SELECT to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${timeZone}), 'YYYY-MM') as key,
      COUNT(*) as count
    FROM "Booking" b
    WHERE b."corporateAccountId" = ${corporateAccountId}
      AND b.status NOT IN ('CANCELLED', 'NO_SHOW', 'DRAFT')
      AND b."pickupAt" >= ${fromUtc}
      AND b."pickupAt" < ${toUtc}
    GROUP BY 1 ORDER BY 1 ASC`;

  const bucket = new Map<string, number>();
  for (const r of rows) {
    bucket.set(String(r.key), Number(r.count || 0));
  }

  const months: string[] = [];
  for (
    let ms = tz.startOfMonth(fromUtc, timeZone);
    ms.getTime() < toUtc.getTime();
    ms = tz.addMonths(ms, 1, timeZone)
  ) {
    months.push(tz.monthKey(ms, timeZone));
  }

  return months.map((k) => {
    const ms =
      tz.monthStartFromKey(k, timeZone) ?? tz.startOfMonth(fromUtc, timeZone);
    return {
      key: k,
      tick: tz.formatMonthTick(ms, timeZone),
      label: tz.formatMonthLabel(ms, timeZone),
      tripCount: bucket.get(k) ?? 0,
    };
  });
}

/* ── Page ── */

export default async function CorporateAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const now = new Date();
  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    account,
    recentBookings,
    bookingsThisMonth,
    totalBookings,
    completedBookings,
    invoiceSummary,
    revenueAgg,
  ] = await Promise.all([
    db.corporateAccount.findUnique({
      where: { id },
      include: {
        contacts: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
        passengers: {
          orderBy: [{ active: "desc" }, { name: "asc" }],
        },
      },
    }),
    db.booking.findMany({
      where: { corporateAccountId: id },
      include: {
        serviceType: { select: { name: true } },
        corporatePassenger: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { pickupAt: "desc" },
      take: 10,
    }),
    db.booking.count({
      where: {
        corporateAccountId: id,
        pickupAt: { gte: monthStart },
        status: { notIn: ["CANCELLED", "NO_SHOW", "DRAFT"] },
      },
    }),
    db.booking.count({ where: { corporateAccountId: id } }),
    db.booking.count({
      where: { corporateAccountId: id, status: "COMPLETED" },
    }),
    db.corporateInvoice.aggregate({
      where: { corporateAccountId: id },
      _sum: { totalCents: true, amountPaidCents: true },
      _count: true,
    }),
    db.booking.aggregate({
      where: {
        corporateAccountId: id,
        status: { in: ["COMPLETED", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"] },
      },
      _sum: { totalCents: true },
    }),
  ]);

  if (!account) return notFound();

  const totalInvoiced = invoiceSummary._sum.totalCents ?? 0;
  const totalPaid = invoiceSummary._sum.amountPaidCents ?? 0;
  const outstandingBalance = totalInvoiced - totalPaid;
  const totalRevenueCents = revenueAgg._sum.totalCents ?? 0;
  const invoiceCount = invoiceSummary._count ?? 0;

  const activePassengers = account.passengers.filter((p) => p.active).length;
  const activeContacts = account.contacts.filter((c) => c.active).length;

  const primaryContact = await db.corporateContact.findFirst({
    where: { corporateAccountId: account.id, role: "PRIMARY" },
    include: { user: { select: { password: true } } },
  });
  const primaryContactHasPassword = !!primaryContact?.user?.password;

  // Chart data (last 12 months)
  const usageChartFromUtc = tz.addMonths(
    tz.startOfMonth(now, companyTz),
    -11,
    companyTz,
  );
  const usageChartToUtc = tz.addMonths(
    tz.startOfMonth(now, companyTz),
    1,
    companyTz,
  );
  const usageChartData = await chartAggMonthlyCorporateBookings(
    account.id,
    usageChartFromUtc,
    usageChartToUtc,
    companyTz,
  );

  const billingAddress = [
    account.billingAddress,
    account.billingCity,
    account.billingState,
    account.billingZip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <DirtyFormProvider>
      <section className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <Link href='/admin/corporate' className={`${styles.backBtn} backBtn`}>
            <Arrow className='backArrow' /> Back to accounts
          </Link>
          <div className={styles.headerTop}>
            <div className={styles.top}>
              <div className={styles.profileInfo}>
                <h1 className={`${styles.heading} h2`}>
                  Corporation: <b>{account.name}</b>
                </h1>
                <div className={styles.badgesRow}>
                  <span
                    className={`badge badge_${statusBadgeTone(account.status)}`}
                  >
                    {account.status}
                  </span>
                  <span className='badge badge_neutral'>
                    {billingCycleLabel(account.billingCycle)}
                  </span>
                  <span className='badge badge_neutral'>
                    {paymentMethodLabel(account.paymentMethod)}
                  </span>
                </div>
                <span className={styles.meta}>
                  Created {tz.formatDateTime(account.createdAt, companyTz)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Statistics */}
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{bookingsThisMonth}</div>
            <div className={styles.statLabel}>This Month</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{totalBookings}</div>
            <div className={styles.statLabel}>Total Rides</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{completedBookings}</div>
            <div className={styles.statLabel}>Completed</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>
              {tz.formatMoneyShort(totalRevenueCents)}
            </div>
            <div className={styles.statLabel}>Revenue</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>
              {tz.formatMoneyShort(totalInvoiced)}
            </div>
            <div className={styles.statLabel}>Invoiced</div>
          </div>
          <div
            className={`${styles.statBox} ${outstandingBalance > 0 ? styles.statBoxDanger : ""}`}
          >
            <div className={styles.statValue}>
              {tz.formatMoneyShort(outstandingBalance)}
            </div>
            <div className={styles.statLabel}>Outstanding</div>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className={styles.grid}>
          {/* Account Details Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Account Details</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Company</span>
                <span className={styles.infoValue}>{account.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Billing Email</span>
                <span className={styles.infoValue}>{account.billingEmail}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Address</span>
                <span className={styles.infoValue}>
                  {billingAddress || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Status</span>
                <span
                  className={`badge badge_${statusBadgeTone(account.status)}`}
                >
                  {account.status}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>PO Number</span>
                <span className={styles.infoValue}>
                  {account.poNumber || "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Created</span>
                <span className={styles.infoValue}>
                  {tz.formatDateTime(account.createdAt, companyTz)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Account ID</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {account.id}
                </span>
              </div>
              {account.internalNotes && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Notes</span>
                  <span className={styles.infoValue}>
                    {account.internalNotes}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Settings Card */}
          <div className={styles.card} id='payment-settings-section'>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Payment Settings</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Billing Cycle</span>
                <span className={styles.infoValue}>
                  {billingCycleLabel(account.billingCycle)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Payment Method</span>
                <span className={styles.infoValue}>
                  {paymentMethodLabel(account.paymentMethod)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Payment Terms</span>
                <span className={styles.infoValue}>
                  {paymentTermsLabel(account.paymentTerms)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Discount</span>
                <span className={styles.infoValue}>
                  {account.discountPercent
                    ? `${account.discountPercent}%`
                    : "None"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Monthly Limit</span>
                <span className={styles.infoValue}>
                  {account.monthlyLimitCents
                    ? formatMoney(account.monthlyLimitCents)
                    : "No limit"}
                </span>
              </div>
              {account.paymentMethod === "CHECK" && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Check Payable To</span>
                  <span className={styles.infoValue}>
                    {account.checkPayableTo || "—"}
                  </span>
                </div>
              )}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Invoices</span>
                <span className={styles.infoValue}>{invoiceCount}</span>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <EditPaymentSettingsClient
                accountId={account.id}
                currentBillingCycle={account.billingCycle}
                currentPaymentMethod={account.paymentMethod}
                currentPaymentTerms={account.paymentTerms}
                currentDiscountPercent={
                  account.discountPercent
                    ? Number(account.discountPercent)
                    : null
                }
                currentMonthlyLimitCents={account.monthlyLimitCents}
                currentCheckPayableTo={account.checkPayableTo}
              />
            </div>
          </div>

          {/* People Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>People</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.statsGrid}>
                <div className={styles.miniStatBox}>
                  <div className={styles.miniStatValue}>
                    {account.contacts.length}
                  </div>
                  <div className={styles.miniStatLabel}>
                    Contacts ({activeContacts} active)
                  </div>
                </div>
                <div className={styles.miniStatBox}>
                  <div className={styles.miniStatValue}>
                    {account.passengers.length}
                  </div>
                  <div className={styles.miniStatLabel}>
                    Passengers ({activePassengers} active)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Usage Chart */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='cardTitle h4'>Monthly Ride Volume</h2>
            <p className='miniNote'>
              Bookings for this account over the last 12 months
            </p>
          </div>
          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <h3 className='cardTitle h4'>Rides per Month</h3>
              <div className='miniNote'>Last 12 months</div>
            </div>
            <div className={styles.chartWrap}>
              <VehicleUsageChart data={usageChartData} />
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='cardTitle h4'>Contacts (Admins)</h2>
            <p className='miniNote'>
              Users who can log in and book rides for this account
            </p>
          </div>
          {account.contacts.length === 0 ? (
            <div className={styles.emptyCard}>
              <div className='emptyTitle'>No contacts added yet</div>
              <p className='emptySmall'>
                Contacts are added during onboarding or by an admin.
              </p>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr className={styles.trHead}>
                      <th className={styles.th}>Name</th>
                      <th className={styles.th}>Email</th>
                      <th className={styles.th}>Role</th>
                      <th className={styles.th}>Title</th>
                      <th className={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.contacts.map((c) => (
                      <tr
                        key={c.id}
                        className={`${styles.tr} ${!c.active ? styles.trInactive : ""}`}
                      >
                        <td className={styles.td} data-label='Name'>
                          <div className={styles.cellStrong}>
                            {c.user.name || "—"}
                          </div>
                        </td>
                        <td className={styles.td} data-label='Email'>
                          {c.user.email}
                        </td>
                        <td className={styles.td} data-label='Role'>
                          <span className='badge badge_neutral'>{c.role}</span>
                        </td>
                        <td className={styles.td} data-label='Title'>
                          {c.title || "—"}
                        </td>
                        <td className={styles.td} data-label='Status'>
                          <span
                            className={`badge badge_${c.active ? "good" : "neutral"}`}
                          >
                            {c.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Passengers Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeaderTop}>
            <div className='heading'>
              <h2 className='cardTitle h4'>
                Passengers
                <span
                  className='countPill'
                  style={{ marginLeft: "1rem", display: "inline-block" }}
                >
                  {account.passengers.length}
                </span>
              </h2>
              <p className='miniNote' style={{ marginTop: "1rem" }}>
                People rides can be booked for on this account
              </p>
            </div>
            <AddPassengerClient accountId={account.id} />
          </div>
          {account.passengers.length === 0 ? (
            <div className={styles.emptyCard}>
              <div className='emptyTitle'>No passengers added yet</div>
              <p className='emptySmall'>
                Add passengers so rides can be booked on their behalf.
              </p>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr className={styles.trHead}>
                      <th className={styles.th}>Name</th>
                      <th className={styles.th}>Email</th>
                      <th className={styles.th}>Phone</th>
                      <th className={styles.th}>Department</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.passengers.map((p) => (
                      <tr
                        key={p.id}
                        className={`${styles.tr} ${!p.active ? styles.trInactive : ""}`}
                      >
                        <td className={styles.td} data-label='Name'>
                          <div className={styles.cellStrong}>{p.name}</div>
                        </td>
                        <td className={styles.td} data-label='Email'>
                          {p.email || "—"}
                        </td>
                        <td className={styles.td} data-label='Phone'>
                          {p.phone || "—"}
                        </td>
                        <td className={styles.td} data-label='Department'>
                          {p.department || "—"}
                        </td>
                        <td className={styles.td} data-label='Status'>
                          <span
                            className={`badge badge_${p.active ? "good" : "neutral"}`}
                          >
                            {p.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className={styles.td} data-label='Actions'>
                          <TogglePassengerBtn
                            passengerId={p.id}
                            passengerName={p.name}
                            active={p.active}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Recent Bookings Table */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='cardTitle h4'>Recent Bookings</h2>
            <p className='miniNote'>
              Rides booked under this corporate account
            </p>
          </div>
          {recentBookings.length === 0 ? (
            <div className={styles.emptyCard}>
              <div className='emptyTitle'>No bookings yet</div>
              <p className='emptySmall'>
                Bookings will appear here once rides are created for this
                account.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.tableCard}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead className={styles.thead}>
                      <tr className={styles.trHead}>
                        <th className={styles.th}>Pickup</th>
                        <th className={styles.th}>Status</th>
                        <th className={styles.th}>Passenger</th>
                        <th className={styles.th}>Service</th>
                        <th className={styles.th}>Route</th>
                        <th className={`${styles.th} ${styles.thRight}`}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((b) => {
                        const href = `/admin/bookings/${b.id}`;
                        const passengerName =
                          b.corporatePassenger?.name ||
                          b.user?.name?.trim() ||
                          b.guestName?.trim() ||
                          "—";

                        return (
                          <tr key={b.id} className={styles.tr}>
                            <td
                              className={styles.td}
                              data-label='Pickup'
                              style={{ position: "relative" }}
                            >
                              <Link
                                href={href}
                                className={styles.rowStretchedLink}
                                aria-label='Open booking'
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  zIndex: 5,
                                }}
                              />
                              <Link href={href} className={styles.rowLink}>
                                {tz.formatDate(b.pickupAt, companyTz)}
                              </Link>
                              <div className={styles.pickupMeta}>
                                <span className={styles.pill}>
                                  {tz.formatEta(b.pickupAt, now)}
                                </span>
                              </div>
                            </td>
                            <td
                              className={styles.td}
                              data-label='Status'
                              style={{ position: "relative" }}
                            >
                              <Link
                                href={href}
                                className={styles.rowStretchedLink}
                                aria-hidden='true'
                                tabIndex={-1}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  zIndex: 5,
                                }}
                              />
                              <span
                                className={`badge badge_${bookingBadgeTone(b.status)}`}
                              >
                                {statusLabel(b.status)}
                              </span>
                            </td>
                            <td
                              className={styles.td}
                              data-label='Passenger'
                              style={{ position: "relative" }}
                            >
                              <Link
                                href={href}
                                className={styles.rowStretchedLink}
                                aria-hidden='true'
                                tabIndex={-1}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  zIndex: 5,
                                }}
                              />
                              <div className={styles.cellStrong}>
                                {passengerName}
                              </div>
                            </td>
                            <td
                              className={styles.td}
                              data-label='Service'
                              style={{ position: "relative" }}
                            >
                              <Link
                                href={href}
                                className={styles.rowStretchedLink}
                                aria-hidden='true'
                                tabIndex={-1}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  zIndex: 5,
                                }}
                              />
                              {b.serviceType?.name ?? "—"}
                            </td>
                            <td
                              className={styles.td}
                              data-label='Route'
                              style={{ position: "relative" }}
                            >
                              <Link
                                href={href}
                                className={styles.rowStretchedLink}
                                aria-hidden='true'
                                tabIndex={-1}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  zIndex: 5,
                                }}
                              />
                              <div className={styles.routeCell}>
                                {b.pickupAddress?.split(",")[0]} →{" "}
                                {b.dropoffAddress?.split(",")[0]}
                              </div>
                            </td>
                            <td
                              className={`${styles.td} ${styles.tdRight}`}
                              data-label='Total'
                              style={{ position: "relative" }}
                            >
                              <Link
                                href={href}
                                className={styles.rowStretchedLink}
                                aria-hidden='true'
                                tabIndex={-1}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  zIndex: 5,
                                }}
                              />
                              {formatMoney(b.totalCents)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className={styles.actionsRow}>
                <Button
                  href={`/admin/bookings?corporate=${encodeURIComponent(account.id)}`}
                  text='View All Bookings'
                  btnType='black'
                  arrow
                />
                {/* <Button
                  href={`/admin/corporate/${account.id}/invoices`}
                  text='View Invoices'
                  btnType='blackOutline'
                  arrow
                /> */}
              </div>
            </>
          )}
        </div>

        {/* Account Status / Danger Zone */}
        <AccountStatusClient
          accountId={account.id}
          currentStatus={account.status}
          primaryContactHasPassword={primaryContactHasPassword}
        />
      </section>
    </DirtyFormProvider>
  );
}
