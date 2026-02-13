import Link from "next/link";
import styles from "./TripGroupCard.module.css";

type SiblingLeg = {
  id: string;
  pickupAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  totalCents: number;
  priceApproved: boolean;
  serviceName: string;
  driverName: string | null;
};

type TripGroupData = {
  id: string;
  label: string | null;
  legCount: number;
  totalCents: number;
  paymentStatus: string;
  paidAt: Date | null;
};

function centsToUsd(cents: number) {
  return (cents / 100).toFixed(2);
}

function formatDate(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PENDING_REVIEW: { label: "Pending", color: "#92400e", bg: "#fef3c7" },
    PENDING_PAYMENT: {
      label: "Awaiting Pay",
      color: "#9a3412",
      bg: "#ffedd5",
    },
    CONFIRMED: { label: "Confirmed", color: "#065f46", bg: "#d1fae5" },
    ASSIGNED: { label: "Assigned", color: "#1e40af", bg: "#dbeafe" },
    EN_ROUTE: { label: "En Route", color: "#5b21b6", bg: "#ede9fe" },
    COMPLETED: { label: "Completed", color: "#166534", bg: "#bbf7d0" },
    CANCELLED: { label: "Cancelled", color: "#991b1b", bg: "#fecaca" },
    DECLINED: { label: "Declined", color: "#991b1b", bg: "#fecaca" },
  };

  const s = map[status] ?? { label: status, color: "#374151", bg: "#f3f4f6" };

  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "1.4rem",
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 50,
        color: s.color,
        background: s.bg,
        whiteSpace: "nowrap",
      }}
      className={styles.pill}
    >
      {s.label}
    </span>
  );
}

function truncate(str: string, max = 35) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function TripGroupCard({
  tripGroup,
  siblings,
  currentBookingId,
  timeZone,
}: {
  tripGroup: TripGroupData;
  siblings: SiblingLeg[];
  currentBookingId: string;
  timeZone: string;
}) {
  const currentIndex = siblings.findIndex((s) => s.id === currentBookingId);
  const legNumber = currentIndex >= 0 ? currentIndex + 1 : "?";

  const allPricesApproved = siblings.every((s) => s.priceApproved);
  const groupTotal = siblings.reduce((sum, s) => sum + s.totalCents, 0);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>🗓️</span>
          <span className={styles.title}>
            Multi-day trip · Ride {legNumber} of {siblings.length}
          </span>
        </div>
        {tripGroup.label && (
          <span className={styles.label}>{tripGroup.label}</span>
        )}
      </div>

      <div className={styles.legs}>
        {siblings.map((leg, idx) => {
          const isCurrent = leg.id === currentBookingId;
          return (
            <div
              key={leg.id}
              className={`${styles.leg} ${isCurrent ? styles.legCurrent : ""}`}
            >
              <div className={styles.legNumber}>{idx + 1}</div>
              <div className={styles.legContent}>
                <div className={styles.legTop}>
                  <span className={styles.legService}>{leg.serviceName}</span>
                  <span className={styles.legDate}>
                    {formatDate(leg.pickupAt, timeZone)} @{" "}
                    {formatTime(leg.pickupAt, timeZone)}{" "}
                  </span>
                </div>
                <div className={styles.legRoute}>
                  {truncate(leg.pickupAddress)} → {truncate(leg.dropoffAddress)}
                </div>
                <div className={styles.legMeta}>
                  {statusBadge(leg.status)}
                  {leg.priceApproved ? (
                    <span className={styles.priceApproved}>
                      ✅ ${centsToUsd(leg.totalCents)}
                    </span>
                  ) : (
                    <span className={styles.pricePending}>
                      ⚠️ ${centsToUsd(leg.totalCents)} (price pending)
                    </span>
                  )}
                  {leg.driverName && (
                    <span className={styles.driver}>🚗 {leg.driverName}</span>
                  )}
                </div>
              </div>
              <div className={styles.legAction}>
                {isCurrent ? (
                  <span className={styles.currentBadge}>Current</span>
                ) : (
                  <Link
                    href={`/admin/bookings/${leg.id}`}
                    className={styles.viewLink}
                  >
                    View →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <span className={styles.footerLabel}>Trip total:</span>
          <span className={styles.footerAmount}>${centsToUsd(groupTotal)}</span>
        </div>
        <div className={styles.footerRight}>
          {allPricesApproved ? (
            <span style={{ color: "#065f46", fontSize: "1.2rem" }}>
              ✅ All prices approved
            </span>
          ) : (
            <span style={{ color: "#92400e", fontSize: "1.2rem" }}>
              ⚠️ {siblings.filter((s) => !s.priceApproved).length} price
              {siblings.filter((s) => !s.priceApproved).length > 1
                ? "s"
                : ""}{" "}
              pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
