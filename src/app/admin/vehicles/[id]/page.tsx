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
import DefaultVehicleImg from "../../../../../public/images/mesaii.jpg"; 

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_TZ = "America/Phoenix";
const PHX_OFFSET_MS = -7 * 60 * 60 * 1000;

function toPhoenixParts(dateUtc: Date) {
  const phxLocalMs = dateUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  return { y: phx.getUTCFullYear(), m: phx.getUTCMonth(), d: phx.getUTCDate() };
}

function startOfMonthPhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  const startLocalMs = Date.UTC(y, m, 1, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function addMonthsPhoenix(monthStartUtc: Date, deltaMonths: number) {
  const phxLocalMs = monthStartUtc.getTime() + PHX_OFFSET_MS;
  const phx = new Date(phxLocalMs);
  const y = phx.getUTCFullYear();
  const m = phx.getUTCMonth();
  const nextStartLocalMs = Date.UTC(y, m + deltaMonths, 1, 0, 0, 0);
  return new Date(nextStartLocalMs - PHX_OFFSET_MS);
}

function monthKeyFromDatePhoenix(dateUtc: Date) {
  const { y, m } = toPhoenixParts(dateUtc);
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function monthStartFromKeyPhoenix(key: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12)
    return null;
  const startLocalMs = Date.UTC(y, m - 1, 1, 0, 0, 0);
  return new Date(startLocalMs - PHX_OFFSET_MS);
}

function formatMonthLabelPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: PHX_TZ,
  }).format(dateUtc);
}

function formatMonthTickPhoenix(dateUtc: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: PHX_TZ,
  }).format(dateUtc);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PHX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatEta(at: Date, now: Date) {
  const diffMs = at.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const mins = Math.round(absMs / (60 * 1000));
  const hours = Math.round(absMs / (60 * 60 * 1000));
  const days = Math.round(absMs / (24 * 60 * 60 * 1000));
  const label = mins < 90 ? `${mins}m` : hours < 36 ? `${hours}h` : `${days}d`;
  if (diffMs >= 0) return `in ${label}`;
  return `${label} ago`;
}

function formatMoney(cents: number, currency = "USD") {
  const n = (cents || 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
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

function badgeTone(status: string) {
  if (status === "PENDING_PAYMENT") return "warn";
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "neutral";
  if (status === "CONFIRMED" || status === "ASSIGNED" || status === "COMPLETED")
    return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  return "neutral";
}

async function chartAggMonthlyVehicleUsage(
  vehicleUnitId: string,
  fromUtc: Date,
  toUtc: Date,
) {
  const rows = await db.$queryRaw<any[]>`
    SELECT to_char(date_trunc('month', b."pickupAt" AT TIME ZONE ${PHX_TZ}), 'YYYY-MM') as key,
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
    let ms = startOfMonthPhoenix(fromUtc);
    ms.getTime() < toUtc.getTime();
    ms = addMonthsPhoenix(ms, 1)
  ) {
    months.push(monthKeyFromDatePhoenix(ms));
  }

  return months.map((k) => {
    const ms = monthStartFromKeyPhoenix(k) ?? startOfMonthPhoenix(fromUtc);
    return {
      key: k,
      tick: formatMonthTickPhoenix(ms),
      label: formatMonthLabelPhoenix(ms),
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

  // Get recent assignments for this vehicle
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

  // Count completed trips
  const completedTrips = await db.assignment.count({
    where: {
      vehicleUnitId: unit.id,
      booking: {
        status: "COMPLETED",
      },
    },
  });

  // Count trips this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const tripsThisMonth = await db.assignment.count({
    where: {
      vehicleUnitId: unit.id,
      assignedAt: { gte: startOfMonth },
    },
  });

  // Get vehicle usage chart data (last 12 months)
  const usageChartFromUtc = addMonthsPhoenix(startOfMonthPhoenix(now), -11);
  const usageChartToUtc = addMonthsPhoenix(startOfMonthPhoenix(now), 1);
  const usageChartData = await chartAggMonthlyVehicleUsage(
    unit.id,
    usageChartFromUtc,
    usageChartToUtc,
  );

  async function updateAction(formData: FormData) {
    "use server";
    formData.set("id", unitId);
    return await updateVehicleUnit(formData);
  }

  return (
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
        {/* Vehicle Details Card */}
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
                {formatDateTime(unit.createdAt)}
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

        {/* Statistics Card */}
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

        {/* Edit Form Card */}
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

      {/* Vehicle Usage Chart */}
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

      {/* Recent Assignments */}
      {recentAssignments.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className='h4'>Recent Assignments</h2>
            <p className='miniNote'>Trips this vehicle has been assigned to</p>
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
                    <th className={`${styles.th} ${styles.thRight}`}>Total</th>
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
                            {formatDate(b.pickupAt)}
                          </Link>
                          <div className={styles.pickupMeta}>
                            <span className={styles.pill}>
                              {formatEta(b.pickupAt, now)}
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
                            className={`badge badge_${badgeTone(b.status)}`}
                          >
                            {statusLabel(b.status)}
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
                          <div className={styles.cellStrong}>{driverName}</div>
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
                          {formatMoney(b.totalCents ?? 0, b.currency ?? "USD")}
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
    </section>
  );
}
