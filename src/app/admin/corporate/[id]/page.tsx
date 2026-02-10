/* eslint-disable @typescript-eslint/no-unused-vars */
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

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

export default async function CorporateAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    account,
    recentBookings,
    bookingsThisMonth,
    totalBookings,
    invoiceSummary,
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
      },
      orderBy: { pickupAt: "desc" },
      take: 10,
    }),
    db.booking.count({
      where: { corporateAccountId: id, pickupAt: { gte: monthStart } },
    }),
    db.booking.count({ where: { corporateAccountId: id } }),
    db.corporateInvoice.aggregate({
      where: { corporateAccountId: id },
      _sum: { totalCents: true, amountPaidCents: true },
      _count: true,
    }),
  ]);

  if (!account) return notFound();

  const totalInvoiced = invoiceSummary._sum.totalCents ?? 0;
  const totalPaid = invoiceSummary._sum.amountPaidCents ?? 0;
  const outstandingBalance = totalInvoiced - totalPaid;

  const primaryContact = await db.corporateContact.findFirst({
    where: { corporateAccountId: account.id, role: "PRIMARY" },
    include: { user: { select: { password: true } } },
  });

  const primaryContactHasPassword = !!primaryContact?.user?.password;

  return (
    <section className={styles.container}>
      <Link href='/admin/corporate' className='backBtn'>
        ← Back to Accounts
      </Link>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.top}>
          <h1 className={`${styles.heading} h2`}>{account.name}</h1>
        </div>
        <div className={styles.headerMeta}>
          <span className={`badge badge_${statusBadgeTone(account.status)}`}>
            {account.status}
          </span>
          <span className={styles.meta}>
            Created {formatDate(account.createdAt)}
          </span>
        </div>
      </header>

      {/* KPI Cards */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Rides This Month</div>
          <div className='kpiValue'>{bookingsThisMonth}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Rides</div>
          <div className='kpiValue'>{totalBookings}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Total Invoiced</div>
          <div className='kpiValue'>{formatMoney(totalInvoiced)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Outstanding</div>
          <div
            className={`kpiValue ${outstandingBalance > 0 ? "colorRed" : ""}`}
          >
            {formatMoney(outstandingBalance)}
          </div>
        </div>
      </div>

      {/* Account Details */}
      <Card title='Account Details'>
        <div className={styles.kvGrid}>
          <KeyVal k='Company Name' v={account.name} />
          <KeyVal k='Billing Email' v={account.billingEmail} />
          <KeyVal
            k='Billing Address'
            v={
              [
                account.billingAddress,
                account.billingCity,
                account.billingState,
                account.billingZip,
              ]
                .filter(Boolean)
                .join(", ") || "—"
            }
          />
          <KeyVal k='Internal Notes' v={account.internalNotes || "—"} />
        </div>
      </Card>

      {/* Payment Settings — with inline edit */}
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <div className={styles.cardTopRow}>
            <div className='cardTitle h4'>Payment Settings</div>
          </div>
        </div>
        <div className={styles.kvGrid}>
          <KeyVal
            k='Billing Cycle'
            v={billingCycleLabel(account.billingCycle)}
          />
          <KeyVal
            k='Payment Method'
            v={paymentMethodLabel(account.paymentMethod)}
          />
          <KeyVal
            k='Payment Terms'
            v={paymentTermsLabel(account.paymentTerms)}
          />
          <KeyVal
            k='Discount'
            v={account.discountPercent ? `${account.discountPercent}%` : "None"}
          />
          <KeyVal
            k='Monthly Limit'
            v={
              account.monthlyLimitCents
                ? formatMoney(account.monthlyLimitCents)
                : "No limit"
            }
          />
          {account.paymentMethod === "CHECK" && (
            <KeyVal k='Check Payable To' v={account.checkPayableTo || "—"} />
          )}
        </div>
        <EditPaymentSettingsClient
          accountId={account.id}
          currentBillingCycle={account.billingCycle}
          currentPaymentMethod={account.paymentMethod}
          currentPaymentTerms={account.paymentTerms}
          currentDiscountPercent={
            account.discountPercent ? Number(account.discountPercent) : null
          }
          currentMonthlyLimitCents={account.monthlyLimitCents}
          currentCheckPayableTo={account.checkPayableTo}
        />
      </div>

      {/* Contacts */}
      <Card title='Contacts (Admins)'>
        {account.contacts.length === 0 ? (
          <p className='subheading'>No contacts added yet.</p>
        ) : (
          <div className={styles.miniTableWrap}>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th className={styles.miniTh}>Name</th>
                  <th className={styles.miniTh}>Email</th>
                  <th className={styles.miniTh}>Role</th>
                  <th className={styles.miniTh}>Title</th>
                  <th className={styles.miniTh}>Status</th>
                </tr>
              </thead>
              <tbody>
                {account.contacts.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.miniTd}>{c.user.name || "—"}</td>
                    <td className={styles.miniTd}>{c.user.email}</td>
                    <td className={styles.miniTd}>
                      <span className='badge badge_neutral'>{c.role}</span>
                    </td>
                    <td className={styles.miniTd}>{c.title || "—"}</td>
                    <td className={styles.miniTd}>
                      <span
                        className={`badge badge_${c.active ? "good" : "bad"}`}
                      >
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Passengers */}
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <div className={styles.cardTopRow}>
            <div className='cardTitle h4'>
              Passengers
              <span className='countPill' style={{ marginLeft: "0.5rem" }}>
                {account.passengers.length}
              </span>
            </div>
            <AddPassengerClient accountId={account.id} />
          </div>
        </div>
        {account.passengers.length === 0 ? (
          <p className='subheading'>No passengers added yet.</p>
        ) : (
          <div className={styles.miniTableWrap}>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th className={styles.miniTh}>Name</th>
                  <th className={styles.miniTh}>Email</th>
                  <th className={styles.miniTh}>Phone</th>
                  <th className={styles.miniTh}>Department</th>
                  <th className={styles.miniTh}>Status</th>
                  <th className={styles.miniTh}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {account.passengers.map((p) => (
                  <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5 }}>
                    <td className={styles.miniTd}>{p.name}</td>
                    <td className={styles.miniTd}>{p.email || "—"}</td>
                    <td className={styles.miniTd}>{p.phone || "—"}</td>
                    <td className={styles.miniTd}>{p.department || "—"}</td>
                    <td className={styles.miniTd}>
                      <span
                        className={`badge badge_${p.active ? "good" : "bad"}`}
                      >
                        {p.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.miniTd}>
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
        )}
      </div>

      {/* Recent Bookings */}
      <Card title='Recent Bookings'>
        {recentBookings.length === 0 ? (
          <p className='subheading'>No bookings yet.</p>
        ) : (
          <div className={styles.miniTableWrap}>
            <table className={styles.miniTable}>
              <thead>
                <tr>
                  <th className={styles.miniTh}>Date</th>
                  <th className={styles.miniTh}>Service</th>
                  <th className={styles.miniTh}>Passenger</th>
                  <th className={styles.miniTh}>Route</th>
                  <th className={styles.miniTh}>Status</th>
                  <th className={styles.miniTh}>Total</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} className={styles.miniTrClickable}>
                    <td
                      className={styles.miniTd}
                      style={{ position: "relative" }}
                    >
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className={styles.rowStretchedLink}
                      />
                      {formatDate(b.pickupAt)}
                    </td>
                    <td
                      className={styles.miniTd}
                      style={{ position: "relative" }}
                    >
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className={styles.rowStretchedLink}
                        aria-hidden
                        tabIndex={-1}
                      />
                      {b.serviceType.name}
                    </td>
                    <td
                      className={styles.miniTd}
                      style={{ position: "relative" }}
                    >
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className={styles.rowStretchedLink}
                        aria-hidden
                        tabIndex={-1}
                      />
                      {b.corporatePassenger?.name || "—"}
                    </td>
                    <td
                      className={styles.miniTd}
                      style={{ position: "relative" }}
                    >
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className={styles.rowStretchedLink}
                        aria-hidden
                        tabIndex={-1}
                      />
                      <div className={styles.routeCell}>
                        {b.pickupAddress?.split(",")[0]} →{" "}
                        {b.dropoffAddress?.split(",")[0]}
                      </div>
                    </td>
                    <td
                      className={styles.miniTd}
                      style={{ position: "relative" }}
                    >
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className={styles.rowStretchedLink}
                        aria-hidden
                        tabIndex={-1}
                      />
                      <span className='badge badge_neutral'>{b.status}</span>
                    </td>
                    <td
                      className={styles.miniTd}
                      style={{ position: "relative" }}
                    >
                      <Link
                        href={`/admin/bookings/${b.id}`}
                        className={styles.rowStretchedLink}
                        aria-hidden
                        tabIndex={-1}
                      />
                      {formatMoney(b.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AccountStatusClient
        accountId={account.id}
        currentStatus={account.status}
        primaryContactHasPassword={primaryContactHasPassword}
      />
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className='cardTitle h4'>{title}</div>
      </div>
      {children}
    </div>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.keyVal}>
      <div className='emptyTitle'>{k}</div>
      <p className='subheading'>{v}</p>
    </div>
  );
}
