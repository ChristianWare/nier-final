"use client";

import styles from "./AdminIncompleteApprovals.module.css";
import Link from "next/link";
import { useMemo, useState } from "react";

export type IncompleteApprovalItem = {
  id: string;
  status: string;

  createdAtIso: string;
  pickupAtIso: string;

  pickupAddress: string;
  dropoffAddress: string;

  serviceName: string;
  vehicleName: string | null;

  totalCents: number;
  currency: string;

  customer: {
    name: string;
    email: string | null;
    kind: "guest" | "account" | "corporate";
    accountName?: string;
  };

  approvals: {
    routeApproved: boolean;
    priceApproved: boolean;
    hasDriver: boolean;
    hasVehicleUnit: boolean;
    hasDriverPay: boolean;
    isPaid: boolean;
    hasPaymentLink: boolean;
    isCorporate: boolean;
  };
};

type Props = {
  items: IncompleteApprovalItem[];
  timeZone: string;
  bookingHrefBase?: string;
};

type ApprovalFilter =
  | "all"
  | "route"
  | "price"
  | "driver"
  | "vehicle"
  | "driverPay"
  | "payment";

function shortAddress(address: string) {
  if (!address) return "";
  return address.split(",")[0]?.trim() || address;
}

function formatAt(iso: string, timeZone: string) {
  const d = new Date(iso);
  const now = new Date();

  const label = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(d);

  const diffMs = d.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  const mins = Math.round(absMs / (60 * 1000));
  const hours = Math.round(absMs / (60 * 60 * 1000));
  const days = Math.round(absMs / (24 * 60 * 60 * 1000));

  const short = mins < 90 ? `${mins}m` : hours < 36 ? `${hours}h` : `${days}d`;
  const rel = diffMs >= 0 ? `in ${short}` : `${short} ago`;

  return { label, rel };
}

function getMissingItems(a: IncompleteApprovalItem["approvals"]): string[] {
  const missing: string[] = [];
  if (!a.routeApproved) missing.push("Route");
  if (!a.priceApproved) missing.push("Price");
  if (!a.hasDriver) missing.push("Driver");
  if (!a.hasVehicleUnit) missing.push("Vehicle");
  if (!a.hasDriverPay) missing.push("Driver pay");
  if (!a.isCorporate && !a.isPaid && !a.hasPaymentLink) missing.push("Payment");
  return missing;
}

function missingCount(a: IncompleteApprovalItem["approvals"]): number {
  return getMissingItems(a).length;
}

function matchesFilter(
  a: IncompleteApprovalItem["approvals"],
  filter: ApprovalFilter,
): boolean {
  switch (filter) {
    case "route":
      return !a.routeApproved;
    case "price":
      return !a.priceApproved;
    case "driver":
      return !a.hasDriver;
    case "vehicle":
      return !a.hasVehicleUnit;
    case "driverPay":
      return !a.hasDriverPay;
    case "payment":
      return !a.isCorporate && !a.isPaid && !a.hasPaymentLink;
    default:
      return true;
  }
}

function getAnchor(a: IncompleteApprovalItem["approvals"]): string {
  if (!a.routeApproved) return "#trip-section";
  if (!a.priceApproved) return "#price-section";
  if (!a.hasDriver || !a.hasVehicleUnit) return "#assign-section";
  if (!a.hasDriverPay) return "#driver-pay-section";
  if (!a.isCorporate && !a.isPaid && !a.hasPaymentLink)
    return "#payment-section";
  return "";
}

export default function AdminIncompleteApprovals({
  items,
  timeZone,
  bookingHrefBase = "/admin/bookings",
}: Props) {
  const [filter, setFilter] = useState<ApprovalFilter>("all");

  const counts = useMemo(() => {
    const total = items.length;
    const route = items.filter((x) => !x.approvals.routeApproved).length;
    const price = items.filter((x) => !x.approvals.priceApproved).length;
    const driver = items.filter((x) => !x.approvals.hasDriver).length;
    const vehicle = items.filter((x) => !x.approvals.hasVehicleUnit).length;
    const driverPay = items.filter((x) => !x.approvals.hasDriverPay).length;
    const payment = items.filter(
      (x) =>
        !x.approvals.isCorporate &&
        !x.approvals.isPaid &&
        !x.approvals.hasPaymentLink,
    ).length;
    return { total, route, price, driver, vehicle, driverPay, payment };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items.slice();

    if (filter !== "all") {
      list = list.filter((x) => matchesFilter(x.approvals, filter));
    }

    // Sort by most missing items first, then by pickup soonest
    list.sort((a, b) => {
      const am = missingCount(a.approvals);
      const bm = missingCount(b.approvals);
      if (am !== bm) return bm - am;

      const at = new Date(a.pickupAtIso).getTime();
      const bt = new Date(b.pickupAtIso).getTime();
      return at - bt;
    });

    return list;
  }, [items, filter]);

  if (items.length === 0) return null;

  return (
    <>
      <header className={styles.header}>
        <h2
          className={`cardTitle h4 ${counts.total >= 1 ? styles.orangeBorder : ""}`}
        >
          <span style={{ marginRight: 20 }}>⚠️</span> Incomplete booking
          approvals
        </h2>
        <div className={styles.titleRow}>
          <div className={styles.kpis}>
            <span className={styles.kpi}>Total: {counts.total}</span>
            <span className={styles.kpi}>Route: {counts.route}</span>
            <span className={styles.kpi}>Price: {counts.price}</span>
            <span className={styles.kpi}>Driver: {counts.driver}</span>
            <span className={styles.kpi}>Vehicle: {counts.vehicle}</span>
            <span className={styles.kpi}>Driver pay: {counts.driverPay}</span>
            <span className={styles.kpi}>Payment: {counts.payment}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <div
            className={styles.tabs}
            role='tablist'
            aria-label='Approval filter'
          >
            {(
              [
                { key: "all", label: "All", count: counts.total },
                { key: "route", label: "Route", count: counts.route },
                { key: "price", label: "Price", count: counts.price },
                { key: "driver", label: "Driver", count: counts.driver },
                { key: "vehicle", label: "Vehicle", count: counts.vehicle },
                {
                  key: "driverPay",
                  label: "Driver pay",
                  count: counts.driverPay,
                },
                { key: "payment", label: "Payment", count: counts.payment },
              ] as { key: ApprovalFilter; label: string; count: number }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type='button'
                className={`tab ${filter === tab.key ? "tabActive " + styles.tabActive : ""}`}
                onClick={() => setFilter(tab.key)}
              >
                {tab.label}
                <span className='countPill' style={{ marginLeft: 4 }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>
      <section
        // className={styles.container}
        className={`${styles.container} ${counts.total >= 1 ? styles.containerAlert : ""}`}
        aria-label='Incomplete booking approvals'
      >
        {filtered.length === 0 ? (
          <div className='emptySmall'>No items match your filter.</div>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr className={styles.trHead}>
                  <th className={styles.th}>Missing</th>
                  <th className={styles.th}>Pickup</th>
                  <th className={styles.th}>Client</th>
                  <th className={styles.th}>Service</th>
                  <th className={styles.th}>Vehicle</th>
                  <th className={styles.th}>Route</th>
                  <th className={`${styles.th} ${styles.thRight}`}></th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((b) => {
                  const pickup = formatAt(b.pickupAtIso, timeZone);
                  const missing = getMissingItems(b.approvals);
                  const anchor = getAnchor(b.approvals);
                  const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}${anchor}`;
                  const route = `${shortAddress(b.pickupAddress)} → ${shortAddress(b.dropoffAddress)}`;

                  const customerLine =
                    b.customer.kind === "corporate"
                      ? `${b.customer.name} • ${b.customer.accountName ?? "Corporate"}`
                      : `${b.customer.name}${b.customer.email ? ` • ${b.customer.email}` : ""}`;

                  return (
                    <tr key={b.id} className={styles.tr}>
                      <td className={styles.td} data-label='Missing'>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                        />
                        <div className={styles.cellInner}>
                          <div className={styles.missingPills}>
                            {missing.map((m) => (
                              <span key={m} className={styles.missingPill}>
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      <td className={styles.td} data-label='Pickup'>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                        />
                        <div
                          className={`${styles.cellStack} ${styles.cellInner}`}
                        >
                          <Link href={href} className={styles.rowLink}>
                            {pickup.label}
                          </Link>
                          <div className={styles.cellMeta}>
                            <span className={styles.pill}>{pickup.rel}</span>
                          </div>
                        </div>
                      </td>

                      <td className={styles.td} data-label='Client'>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                        />
                        <div
                          className={`${styles.cellStack} ${styles.cellInner}`}
                        >
                          <Link href={href} className={styles.rowLink}>
                            {b.customer.kind === "corporate"
                              ? "Corporate"
                              : b.customer.kind === "account"
                                ? "Account"
                                : "Guest"}
                          </Link>
                          <div className={styles.cellSub}>{customerLine}</div>
                        </div>
                      </td>

                      <td className={styles.td} data-label='Service'>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                        />
                        <div className={styles.cellInner}>
                          <div className={styles.rowLink}>{b.serviceName}</div>
                        </div>
                      </td>

                      <td className={styles.td} data-label='Vehicle'>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                        />
                        <div className={styles.cellInner}>
                          <div className={styles.rowLink}>
                            {b.vehicleName ?? "—"}
                          </div>
                        </div>
                      </td>

                      <td className={styles.td} data-label='Route'>
                        <Link
                          href={href}
                          className={styles.rowStretchedLink}
                          aria-hidden='true'
                          tabIndex={-1}
                        />
                        <div className={styles.cellInner}>
                          <div className={styles.route}>{route}</div>
                        </div>
                      </td>

                      <td
                        className={`${styles.td} ${styles.tdRight}`}
                        data-label='Action'
                      >
                        <Link className='primaryBtn' href={href}>
                          Fix
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
