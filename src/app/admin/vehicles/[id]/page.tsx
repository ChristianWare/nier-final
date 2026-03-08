/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateVehicleUnit } from "../../../../../actions/admin/vehicleUnits";
import EditVehicleUnitForm from "./EditVehicleUnitForm";
import VehicleUsageChart from "@/components/admin/VehicleUsageChart/VehicleUsageChart";
import styles from "./VehicleUnitDetailPage.module.css";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Button from "@/components/shared/Button/Button";
import VehiclePhotoUpload from "@/components/admin/VehiclePhotoUpload/VehiclePhotoUpload";
import DefaultVehicleImg from "../../../../../public/images/areas/mesaii.jpg";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import DeleteVehicleUnitClient from "./DeleteVehicleUnitClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function chartAggMonthlyVehicleUsage(
  vehicleUnitId: string,
  fromUtc: Date,
  toUtc: Date,
  timeZone: string,
) {
  const rows = await db.$queryRaw<any[]>`
    SELECT to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${timeZone}), 'YYYY-MM') as key,
      COUNT(*) as count
    FROM "Assignment" a JOIN "Booking" b ON b.id = a."bookingId"
    WHERE a."vehicleUnitId" = ${vehicleUnitId} 
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

export default async function EditVehicleUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const now = new Date();
  const { timezone: companyTz } = await getCompanySettings();

  if (!id) notFound();

  const unit = await db.vehicleUnit.findUnique({
    where: { id },
    include: {
      category: true,
      _count: {
        select: {
          assignments: true,
        },
      },
    },
  });

  if (!unit) notFound();

  const unitId = unit.id;
  const vehicleImage = unit.image ?? null;

  const unitForForm = {
    id: unit.id,
    name: unit.name,
    plate: unit.plate ?? "",
    categoryId: unit.categoryId ?? "",
    active: unit.active,
  };

  const categories = await db.vehicle.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const recentAssignments = await db.assignment.findMany({
    where: { vehicleUnitId: unit.id },
    orderBy: { assignedAt: "desc" },
    take: 10,
    include: {
      booking: {
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
      },
      driver: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const completedTrips = await db.assignment.count({
    where: {
      vehicleUnitId: unit.id,
      booking: {
        status: "COMPLETED",
      },
    },
  });

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const tripsThisMonth = await db.assignment.count({
    where: {
      vehicleUnitId: unit.id,
      assignedAt: { gte: startOfMonth },
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
  const usageChartData = await chartAggMonthlyVehicleUsage(
    unit.id,
    usageChartFromUtc,
    usageChartToUtc,
    companyTz,
  );

  async function updateAction(formData: FormData) {
    "use server";
    formData.set("id", unitId);
    return await updateVehicleUnit(formData);
  }

  return (
    <DirtyFormProvider>
      <section className={styles.container}>
        <header className={styles.header}>
          <Link href='/admin/vehicles' className={`${styles.backBtn} backBtn`}>
            <Arrow className='backArrow' /> Back to vehicles
          </Link>
          <div className={styles.headerTop}>
            <div className={styles.top}>
              <div className={styles.profileSection}>
                <VehiclePhotoUpload
                  vehicleUnitId={unit.id}
                  currentImage={vehicleImage}
                  vehicleName={unit.name}
                  defaultImage={DefaultVehicleImg}
                />
                <div className={styles.profileInfo}>
                  <h1 className={`${styles.heading} h2`}>{unit.name}</h1>
                  <div className={styles.badgesRow}>
                    <span
                      className={`badge ${unit.active ? "badge_good" : "badge_neutral"}`}
                    >
                      {unit.active ? "Active" : "Inactive"}
                    </span>
                    {unit.category && (
                      <span className='badge badge_accent'>
                        {unit.category.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Vehicle Details</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{unit.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>License Plate</span>
                <span className={`${styles.infoValue} ${styles.plateCell}`}>
                  {unit.plate ?? "—"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Category</span>
                <span className={styles.infoValue}>
                  {unit.category?.name ?? "Uncategorized"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Status</span>
                <span
                  className={`badge ${unit.active ? "badge_good" : "badge_neutral"}`}
                >
                  {unit.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Added</span>
                <span className={styles.infoValue}>
                  {tz.formatDateTime(unit.createdAt, companyTz)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Vehicle ID</span>
                <span className={`${styles.infoValue} ${styles.mono}`}>
                  {unit.id}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Statistics</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.statsGrid}>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>
                    {unit._count.assignments}
                  </div>
                  <div className={styles.statLabel}>Total Assignments</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>{completedTrips}</div>
                  <div className={styles.statLabel}>Completed Trips</div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statValue}>{tripsThisMonth}</div>
                  <div className={styles.statLabel}>This Month</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='h4'>Monthly Usage</h2>
            <p className='miniNote'>Trip assignments over the last 12 months</p>
          </div>
          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <h3 className='cardTitle h4'>Trips per Month</h3>
              <div className='miniNote'>Last 12 months</div>
            </div>
            <div className={styles.chartWrap}>
              <VehicleUsageChart data={usageChartData} />
            </div>
          </div>
        </div>

        {recentAssignments.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className='h4'>Recent Assignments</h2>
              <p className='miniNote'>
                Trips this vehicle has been assigned to
              </p>
            </div>
            <div className={styles.tableCard}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr className={styles.trHead}>
                      <th className={styles.th}>Pickup</th>
                      <th className={styles.th}>Status</th>
                      <th className={styles.th}>Driver</th>
                      <th className={styles.th}>Customer</th>
                      <th className={styles.th}>Service</th>
                      <th className={`${styles.th} ${styles.thRight}`}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAssignments.map((a) => {
                      const b = a.booking;
                      const href = `/admin/bookings/${b.id}`;
                      const customerName =
                        b.user?.name?.trim() ||
                        b.guestName?.trim() ||
                        b.user?.email ||
                        b.guestEmail ||
                        "Guest";
                      const driverName = a.driver?.name ?? "Unassigned";

                      return (
                        <tr key={a.id} className={styles.tr}>
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
                            data-label='Driver'
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
                              {driverName}
                            </div>
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
                href={`/admin/bookings?vehicle=${encodeURIComponent(unit.id)}`}
                text='View All Assignments'
                btnType='black'
                arrow
              />
            </div>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className='cardTitle h4'>Edit Vehicle</h2>
            </div>
            <div className={styles.cardBody}>
              <EditVehicleUnitForm
                unit={unitForForm}
                categories={categories}
                onUpdate={updateAction}
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={styles.section}>
          {/* <div className={styles.sectionHeader}>
            <h2 className='h4' style={{ color: "var(--red, #dc2626)" }}>
              Danger Zone
            </h2>
            <p className='miniNote'>Irreversible actions for this vehicle</p>
          </div> */}
          <DeleteVehicleUnitClient
            unitId={unit.id}
            unitName={unit.name}
            assignmentCount={unit._count.assignments}
          />
        </div>
      </section>
    </DirtyFormProvider>
  );
}
