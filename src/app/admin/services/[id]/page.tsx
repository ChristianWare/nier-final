/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./EditServicePage.module.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  updateService,
  deleteService,
} from "../../../../../actions/admin/services";
import EditServiceForm, {
  type ActionResult,
} from "@/components/admin/EditServiceForm/EditServiceForm";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Button from "@/components/shared/Button/Button";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import VehicleUsageChart from "@/components/admin/VehicleUsageChart/VehicleUsageChart";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AirportLegUI = "NONE" | "PICKUP" | "DROPOFF";

function normalizeAirportLeg(v: unknown): AirportLegUI {
  if (v === "PICKUP") return "PICKUP";
  if (v === "DROPOFF") return "DROPOFF";
  return "NONE";
}

function formatMoney(cents: number | null | undefined, currency = "USD") {
  if (cents == null) return "—";
  const n = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

async function chartAggMonthlyServiceUsage(
  serviceTypeId: string,
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
) {
  const rows = await db.$queryRaw<any[]>`
    SELECT to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${timeZone}), 'YYYY-MM') as key,
      COUNT(*) as count
    FROM "Booking" b
    WHERE b."serviceTypeId" = ${serviceTypeId}
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

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const now = new Date();
  const { timezone: companyTz } = await getCompanySettings();

  const [serviceRaw, airportsRaw] = await Promise.all([
    db.serviceType.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        pricingStrategy: true,
        minFareCents: true,
        baseFeeCents: true,
        perMileCents: true,
        perMinuteCents: true,
        perHourCents: true,
        minHours: true,
        sortOrder: true,
        active: true,
        airportLeg: true,
        createdAt: true,
        airports: { select: { id: true } },
        fees: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            label: true,
            amountCents: true,
          },
        },
        _count: {
          select: { bookings: true },
        },
      },
    }),
    db.airport.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, iata: true, address: true },
      take: 500,
    }),
  ]);

  if (!serviceRaw) notFound();

  /* ─── Statistics ─── */
  const completedBookings = await db.booking.count({
    where: { serviceTypeId: id, status: "COMPLETED" },
  });

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const bookingsThisMonth = await db.booking.count({
    where: {
      serviceTypeId: id,
      pickupAt: { gte: startOfMonth },
      status: { notIn: ["CANCELLED", "NO_SHOW", "DRAFT"] },
    },
  });

  const revenueAgg = await db.booking.aggregate({
    where: {
      serviceTypeId: id,
      status: { in: ["COMPLETED", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"] },
    },
    _sum: { totalCents: true },
  });
  const totalRevenueCents = revenueAgg._sum.totalCents ?? 0;

  /* ─── Recent Bookings ─── */
  const recentBookings = await db.booking.findMany({
    where: { serviceTypeId: id },
    orderBy: { pickupAt: "desc" },
    take: 10,
    select: {
      id: true,
      pickupAt: true,
      pickupAddress: true,
      dropoffAddress: true,
      status: true,
      totalCents: true,
      currency: true,
      vehicle: { select: { name: true } },
      user: { select: { name: true, email: true } },
      guestName: true,
      guestEmail: true,
    },
  });

  /* ─── Usage Chart ─── */
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
  const usageChartData = await chartAggMonthlyServiceUsage(
    id,
    usageChartFromUtc,
    usageChartToUtc,
    companyTz,
  );

  /* ─── Prepare service DTO ─── */
  const service = {
    id: serviceRaw.id,
    name: serviceRaw.name,
    slug: serviceRaw.slug,
    pricingStrategy: serviceRaw.pricingStrategy,
    minFareCents: serviceRaw.minFareCents,
    baseFeeCents: serviceRaw.baseFeeCents,
    perMileCents: serviceRaw.perMileCents,
    perMinuteCents: serviceRaw.perMinuteCents,
    perHourCents: serviceRaw.perHourCents,
    minHours: serviceRaw.minHours ?? 0,
    sortOrder: serviceRaw.sortOrder,
    active: serviceRaw.active,
    airportLeg: normalizeAirportLeg(serviceRaw.airportLeg),
    airportIds: (serviceRaw.airports ?? []).map((a) => a.id),
    fees: serviceRaw.fees.map((f) => ({
      id: f.id,
      label: f.label,
      amountCents: f.amountCents,
    })),
  };

  const airports = airportsRaw.map((a) => ({
    id: a.id,
    name: a.name,
    iata: a.iata,
    address: a.address,
  }));

  const airportLegLabel =
    serviceRaw.airportLeg === "PICKUP"
      ? "Airport Pickup"
      : serviceRaw.airportLeg === "DROPOFF"
        ? "Airport Dropoff"
        : "Standard";

  const totalFeesCents = serviceRaw.fees.reduce(
    (sum, f) => sum + f.amountCents,
    0,
  );

  async function updateAction(formData: FormData): Promise<ActionResult> {
    "use server";
    try {
      const res = await updateService(id, formData);
      return (res ?? { success: "ok" }) as ActionResult;
    } catch {
      return { error: "Failed to update service." };
    }
  }

  async function deleteAction(): Promise<ActionResult> {
    "use server";
    try {
      const res = await deleteService(id);
      return (res ?? { success: "ok" }) as ActionResult;
    } catch {
      return { error: "Failed to delete service." };
    }
  }

  return (
    <DirtyFormProvider>
      <section className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <Link href='/admin/services' className={`${styles.backBtn} backBtn`}>
            <Arrow className='backArrow' /> Back to services
          </Link>
          <div className={styles.headerTop}>
            <div className={styles.top}>
              <div className={styles.profileInfo}>
                <h1 className={`${styles.heading} h2`}>
                  Service: <b>{serviceRaw.name}</b>
                </h1>
                <div className={styles.badgesRow}>
                  <span
                    className={`badge ${serviceRaw.active ? "badge_good" : "badge_neutral"}`}
                  >
                    {serviceRaw.active ? "Active" : "Inactive"}
                  </span>
                  <span className='badge badge_accent'>
                    {serviceRaw.pricingStrategy.replace(/_/g, " ")}
                  </span>
                  {serviceRaw.airportLeg !== "NONE" && (
                    <span className='badge badge_neutral'>
                      {airportLegLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Info + Stats grid */}
        <div className={styles.grid}>
          {/* Service Details Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Service Details</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{serviceRaw.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Slug</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {serviceRaw.slug}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Pricing</span>
                <span className={styles.infoValue}>
                  {serviceRaw.pricingStrategy.replace(/_/g, " ")}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Service Kind</span>
                <span className={styles.infoValue}>{airportLegLabel}</span>
              </div>
              {serviceRaw.minHours > 0 && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Min Hours</span>
                  <span className={styles.infoValue}>
                    {serviceRaw.minHours}h
                  </span>
                </div>
              )}
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Status</span>
                <span
                  className={`badge ${serviceRaw.active ? "badge_good" : "badge_neutral"}`}
                >
                  {serviceRaw.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Sort Order</span>
                <span className={styles.infoValue}>{serviceRaw.sortOrder}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Added</span>
                <span className={styles.infoValue}>
                  {tz.formatDateTime(serviceRaw.createdAt, companyTz)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Service ID</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {serviceRaw.id}
                </span>
              </div>
            </div>
          </div>

          {/* Fees Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Service Fees</h2>
            </div>
            <div className={styles.cardBody}>
              {serviceRaw.fees.length === 0 ? (
                <div className='miniNote' style={{ padding: "1rem 0" }}>
                  No service fees configured.
                </div>
              ) : (
                <>
                  {serviceRaw.fees.map((fee) => (
                    <div key={fee.id} className={styles.infoRow}>
                      <span className={styles.infoLabel}>{fee.label}</span>
                      <span className={styles.infoValue}>
                        {formatMoney(fee.amountCents)}
                      </span>
                    </div>
                  ))}
                  {serviceRaw.fees.length > 1 && (
                    <div
                      className={styles.infoRow}
                      style={{
                        borderTop: "2px solid var(--stroke)",
                        paddingTop: "1rem",
                      }}
                    >
                      <span
                        className={styles.infoLabel}
                        style={{ fontWeight: 800 }}
                      >
                        Total Fees
                      </span>
                      <span
                        className={styles.infoValue}
                        style={{ fontWeight: 800 }}
                      >
                        {formatMoney(totalFeesCents)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Statistics Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Statistics</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.statsGrid}>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>
                    {serviceRaw._count.bookings}
                  </div>
                  <div className={styles.statLabel}>Total Bookings</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>{completedBookings}</div>
                  <div className={styles.statLabel}>Completed</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>{bookingsThisMonth}</div>
                  <div className={styles.statLabel}>This Month</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>
                    {tz.formatMoneyShort(totalRevenueCents)}
                  </div>
                  <div className={styles.statLabel}>Total Revenue</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Usage Chart */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='cardTitle h4'>Monthly Usage</h2>
            <p className='miniNote'>
              Bookings for this service over the last 12 months
            </p>
          </div>
          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <h3 className='cardTitle h4'>Bookings per Month</h3>
              <div className='miniNote'>Last 12 months</div>
            </div>
            <div className={styles.chartWrap}>
              <VehicleUsageChart data={usageChartData} />
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className='cardTitle h4'>Recent Bookings</h2>
              <p className='miniNote'>Bookings that used this service type</p>
            </div>
            <div className={styles.tableCard}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr className={styles.trHead}>
                      <th className={styles.th}>Pickup</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Customer</th>
                      <th className={styles.th}>Vehicle</th>
                      <th className={`${styles.th} ${styles.thRight}`}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b) => {
                      const href = `/admin/bookings/${b.id}`;
                      const customerName =
                        b.user?.name?.trim() ||
                        b.guestName?.trim() ||
                        b.user?.email ||
                        b.guestEmail ||
                        "Guest";

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
                              className={`badge badge_${tz.badgeTone(b.status)}`}
                            >
                              {tz.statusLabel(b.status)}
                            </span>
                          </td>
                          <td
                            className={styles.td}
                            data-label='Customer'
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
                              {customerName}
                            </div>
                          </td>
                          <td
                            className={styles.td}
                            data-label='Vehicle'
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
                            {b.vehicle?.name ?? "—"}
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
                            {tz.formatMoneyShort(
                              b.totalCents ?? 0,
                              b.currency ?? "USD",
                            )}
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
                href={`/admin/bookings?service=${encodeURIComponent(id)}`}
                text='View All Bookings'
                btnType='black'
                arrow
              />
            </div>
          </div>
        )}

        {/* Edit Form */}
        <div className={styles.sectionii}>
          <div className={styles.sectionHeader}>
            <h2 className='cardTitle h4'>Edit Service</h2>
            <p className='miniNote'>
              Update service details, pricing strategy, airports, and fees
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <EditServiceForm
                service={service}
                airports={airports}
                onUpdate={updateAction}
                onDelete={deleteAction}
              />
            </div>
          </div>
        </div>
      </section>
    </DirtyFormProvider>
  );
}
