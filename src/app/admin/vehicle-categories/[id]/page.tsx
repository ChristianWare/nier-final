/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateVehicleCategory } from "../../../../../actions/admin/vehicleCategories";
import EditVehicleCategoryForm from "./EditVehicleCategoryForm";
import VehicleUsageChart from "@/components/admin/VehicleUsageChart/VehicleUsageChart";
import styles from "./EditVehicleCategoryPage.module.css";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Button from "@/components/shared/Button/Button";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import DeleteVehicleCategoryClient from "./DeleteVehicleCategoryClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function chartAggMonthlyCategoryUsage(
  vehicleCategoryId: string,
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
) {
  const rows = await db.$queryRaw<any[]>`
    SELECT to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${timeZone}), 'YYYY-MM') as key,
      COUNT(*) as count
    FROM "Booking" b
    WHERE b."vehicleId" = ${vehicleCategoryId}
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

type Params = { id?: string };

export default async function EditVehicleCategoryPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;

  if (!id) return notFound();

  const now = new Date();
  const { timezone: companyTz } = await getCompanySettings();

  const category = await db.vehicle.findUnique({
    where: { id },
    include: {
      units: {
        orderBy: [{ active: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          plate: true,
          active: true,
          _count: { select: { assignments: true } },
        },
      },
      _count: {
        select: {
          bookings: true,
          units: true,
        },
      },
    },
  });

  if (!category) return notFound();

  const categoryId = category.id;

  const completedBookings = await db.booking.count({
    where: {
      vehicleId: category.id,
      status: "COMPLETED",
    },
  });

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const bookingsThisMonth = await db.booking.count({
    where: {
      vehicleId: category.id,
      pickupAt: { gte: startOfMonth },
      status: { notIn: ["CANCELLED", "NO_SHOW", "DRAFT"] },
    },
  });

  const revenueAgg = await db.booking.aggregate({
    where: {
      vehicleId: category.id,
      status: { in: ["COMPLETED", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"] },
    },
    _sum: { totalCents: true },
  });
  const totalRevenueCents = revenueAgg._sum.totalCents ?? 0;

  const recentBookings = await db.booking.findMany({
    where: { vehicleId: category.id },
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
      serviceType: { select: { name: true } },
      user: { select: { name: true, email: true } },
      guestName: true,
      guestEmail: true,
    },
  });

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
  const usageChartData = await chartAggMonthlyCategoryUsage(
    category.id,
    usageChartFromUtc,
    usageChartToUtc,
    companyTz,
  );

  const activeUnits = category.units.filter((u) => u.active).length;

  return (
    <DirtyFormProvider>
      <section className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <Link
            href='/admin/vehicle-categories'
            className={`${styles.backBtn} backBtn`}
          >
            <Arrow className='backArrow' /> Back to categories
          </Link>
          <div className={styles.headerTop}>
            <div className={styles.top}>
              <div className={styles.profileInfo}>
                <h1 className={`${styles.heading} h2`}>
                  Category: <b>{category.name}</b>
                </h1>
                <div className={styles.badgesRow}>
                  <span
                    className={`badge ${category.active ? "badge_good" : "badge_neutral"}`}
                  >
                    {category.active ? "Active" : "Inactive"}
                  </span>
                  <span className='badge badge_accent'>
                    {category.capacity} pax
                  </span>
                  {category.luggageCapacity > 0 && (
                    <span className='badge badge_neutral'>
                      {category.luggageCapacity} bags
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Info + Stats + Edit grid */}
        <div className={styles.grid}>
          {/* Category Details Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Category Details</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{category.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Capacity</span>
                <span className={styles.infoValue}>
                  {category.capacity} passengers
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Luggage</span>
                <span className={styles.infoValue}>
                  {category.luggageCapacity} bags
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Min Hours</span>
                <span className={styles.infoValue}>
                  {category.minHours > 0 ? `${category.minHours}h` : "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Status</span>
                <span
                  className={`badge ${category.active ? "badge_good" : "badge_neutral"}`}
                >
                  {category.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Sort Order</span>
                <span className={styles.infoValue}>{category.sortOrder}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Pricing Display</span>
                <span className={styles.infoValue}>
                  {category.callForPricing
                    ? `📞 ${category.callForPricingMessage || "Call for pricing"}`
                    : "Shows calculated price"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Added</span>
                <span className={styles.infoValue}>
                  {tz.formatDateTime(category.createdAt, companyTz)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Category ID</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {category.id}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Pricing</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Base Fare</span>
                <span className={styles.infoValue}>
                  {tz.formatMoney(category.baseFareCents)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Per Mile</span>
                <span className={styles.infoValue}>
                  {tz.formatMoney(category.perMileCents)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Per Minute</span>
                <span className={styles.infoValue}>
                  {tz.formatMoney(category.perMinuteCents)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Per Hour</span>
                <span className={styles.infoValue}>
                  {tz.formatMoney(category.perHourCents)}
                </span>
              </div>
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
                    {category._count.units}
                  </div>
                  <div className={styles.statLabel}>
                    Fleet Units ({activeUnits} active)
                  </div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>
                    {category._count.bookings}
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
              Bookings for this vehicle category over the last 12 months
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

        {/* Fleet - Vehicle Units */}
        {category.units.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className='cardTitle h4'>Fleet</h2>
              <p className='miniNote'>
                Vehicle units assigned to this category
              </p>
            </div>
            <div className={styles.tableCard}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr className={styles.trHead}>
                      <th className={styles.th}>Name</th>
                      <th className={styles.th}>Plate</th>
                      <th className={styles.th}>Status</th>
                      <th className={`${styles.th} ${styles.thRight}`}>
                        Assignments
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {category.units.map((unit) => {
                      const href = `/admin/vehicles/${unit.id}`;
                      return (
                        <tr
                          key={unit.id}
                          className={`${styles.tr} ${!unit.active ? styles.trInactive : ""}`}
                        >
                          <td
                            className={styles.td}
                            data-label='Name'
                            style={{ position: "relative" }}
                          >
                            <Link
                              href={href}
                              className={styles.rowStretchedLink}
                              aria-label='Open vehicle'
                              style={{
                                position: "absolute",
                                inset: 0,
                                zIndex: 5,
                              }}
                            />
                            <Link href={href} className={styles.rowLink}>
                              {unit.name}
                            </Link>
                          </td>
                          <td
                            className={styles.td}
                            data-label='Plate'
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
                            <span className={styles.plateCell}>
                              {unit.plate || "—"}
                            </span>
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
                              className={`badge ${unit.active ? "badge_good" : "badge_neutral"}`}
                            >
                              {unit.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td
                            className={`${styles.td} ${styles.tdRight}`}
                            data-label='Assignments'
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
                            {unit._count.assignments}
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
                href='/admin/vehicles'
                text='Manage All Vehicles'
                btnType='black'
                arrow
              />
            </div>
          </div>
        )}

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className='cardTitle h4'>Recent Bookings</h2>
              <p className='miniNote'>
                Bookings that used this vehicle category
              </p>
            </div>
            <div className={styles.tableCard}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr className={styles.trHead}>
                      <th className={styles.th}>Pickup</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Customer</th>
                      <th className={styles.th}>Service</th>
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
                href={`/admin/bookings?vehicle=${encodeURIComponent(category.id)}`}
                text='View All Bookings'
                btnType='black'
                arrow
              />
            </div>
          </div>
        )}

        {/* Edit Form */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='cardTitle h4'>Edit Category</h2>
            <p className='miniNote'>
              Update category details, pricing, and status
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <EditVehicleCategoryForm
                category={{
                  id: category.id,
                  name: category.name,
                  imageUrl: category.imageUrl,
                  description: category.description,
                  capacity: category.capacity,
                  luggageCapacity: category.luggageCapacity,
                  sortOrder: category.sortOrder,
                  minHours: category.minHours,
                  baseFareCents: category.baseFareCents,
                  perMileCents: category.perMileCents,
                  perMinuteCents: category.perMinuteCents,
                  perHourCents: category.perHourCents,
                  active: category.active,
                  callForPricing: category.callForPricing,
                  callForPricingMessage: category.callForPricingMessage,
                }}
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='cardTitle h4' style={{ color: "var(--darkRed)" }}>
              Danger Zone
            </h2>
            <b className='miniNote'>Irreversible actions for this category</b>
          </div>
          <DeleteVehicleCategoryClient
            categoryId={category.id}
            categoryName={category.name}
            bookingCount={category._count.bookings}
            unitCount={category._count.units}
          />
        </div>
      </section>
    </DirtyFormProvider>
  );
}
