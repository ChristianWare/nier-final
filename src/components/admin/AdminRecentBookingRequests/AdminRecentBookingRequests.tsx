"use client";

import styles from "./AdminRecentBookingRequests.module.css";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { trashBookings } from "../../../../actions/admin/bookingTrash";
import toast from "react-hot-toast";
import BulkConfirmModal from "@/components/admin/BulkConfirmModal/BulkConfirmModal";

export type RecentBookingRequestItem = {
  id: string;
  status: "PENDING_REVIEW" | "PENDING_PAYMENT" | string;

  createdAtIso: string;
  pickupAtIso: string;

  pickupAddress: string;
  dropoffAddress: string;

  serviceName: string;
  vehicleName: string | null;

  airportLeg: "NONE" | "PICKUP" | "DROPOFF";

  specialRequests: string | null;

  customer:
    | {
        kind: "guest";
        name: string;
        email: string | null;
        phone: string | null;
      }
    | {
        kind: "account";
        name: string;
        email: string | null;
        verified: boolean;
      }
    | {
        kind: "corporate";
        name: string;
        email: string | null;
        accountName: string;
      };
};

type Props = {
  items: RecentBookingRequestItem[];
  timeZone: string;
  bookingHrefBase?: string;
};

type Bucket = "review" | "payment" | "all";
type CustomerFilter = "all" | "guests" | "accounts" | "corporate";

// function shortAddress(address: string) {
//   if (!address) return "";
//   return address.split(",")[0]?.trim() || address;
// }

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

function prettyStatus(s: string) {
  if (s === "PENDING_REVIEW") return "Pending review";
  if (s === "PENDING_PAYMENT") return "Payment due";
  const parts = String(s).split("_").filter(Boolean);
  if (!parts.length) return String(s);
  return parts
    .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function statusTone(s: string): "neutral" | "warning" | "danger" | "good" {
  if (s === "PENDING_REVIEW") return "warning";
  if (s === "PENDING_PAYMENT") return "danger";
  return "neutral";
}

export default function AdminRecentBookingRequests({
  items,
  timeZone,
  bookingHrefBase = "/admin/bookings",
}: Props) {
  const [bucket, setBucket] = useState<Bucket>("all");
  const [customerFilter, setCustomerFilter] = useState<CustomerFilter>("all");

  // Rows removed optimistically after a successful trash action.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const liveItems = useMemo(
    () => items.filter((x) => !hiddenIds.has(x.id)),
    [items, hiddenIds],
  );

  const counts = useMemo(() => {
    const total = liveItems.length;
    const guests = liveItems.filter((x) => x.customer.kind === "guest").length;
    const corporate = liveItems.filter(
      (x) => x.customer.kind === "corporate",
    ).length;
    const accounts = total - guests - corporate;
    const review = liveItems.filter(
      (x) => x.status === "PENDING_REVIEW",
    ).length;
    const pay = liveItems.filter((x) => x.status === "PENDING_PAYMENT").length;
    return { total, guests, accounts, corporate, review, pay };
  }, [liveItems]);

  const filtered = useMemo(() => {
    let list = liveItems.slice();

    if (bucket === "review")
      list = list.filter((x) => x.status === "PENDING_REVIEW");
    if (bucket === "payment")
      list = list.filter((x) => x.status === "PENDING_PAYMENT");

    if (customerFilter === "guests")
      list = list.filter((x) => x.customer.kind === "guest");
    if (customerFilter === "accounts")
      list = list.filter((x) => x.customer.kind === "account");
    if (customerFilter === "corporate")
      list = list.filter((x) => x.customer.kind === "corporate");

    list.sort((a, b) => {
      const aw =
        a.status === "PENDING_REVIEW"
          ? 1
          : a.status === "PENDING_PAYMENT"
            ? 2
            : 9;
      const bw =
        b.status === "PENDING_REVIEW"
          ? 1
          : b.status === "PENDING_PAYMENT"
            ? 2
            : 9;
      if (aw !== bw) return aw - bw;

      const at = new Date(a.createdAtIso).getTime();
      const bt = new Date(b.createdAtIso).getTime();
      return bt - at;
    });

    return list;
  }, [liveItems, bucket, customerFilter]);

  // ── Bulk select → Trash ───────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const [trashOpen, setTrashOpen] = useState(false);
  const router = useRouter();

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const visibleIds = filtered.map((b) => b.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const selectedCount = selected.size;
  const selectedPlural = selectedCount === 1 ? "booking" : "bookings";

  const runBulkTrash = async () => {
    if (selectedCount === 0 || pending) return;
    const ids = [...selected];

    setPending(true);
    try {
      const res = await trashBookings(ids);
      if (!res.ok) {
        toast.error(res.error ?? "Failed to move to trash.");
        return;
      }
      toast.success(
        `Moved ${res.count ?? selectedCount} ${selectedPlural} to the Trash.`,
      );

      // 1) Optimistic: rows disappear right now.
      setHiddenIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      setTrashOpen(false);
      setSelected(new Set());
      // 2) Server truth: re-render the dashboard in its own transition.
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={styles.container} aria-label='Recent booking requests'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2
            className={`cardTitle h4 ${counts.total >= 1 ? "yellowBorder" : ""}`}
          >
            New booking requests - needs review
          </h2>

          <div className={styles.kpis}>
            <span className={styles.kpi}>Total: {counts.total}</span>
            <span className={styles.kpi}>Guests: {counts.guests}</span>
            <span className={styles.kpi}>Accounts: {counts.accounts}</span>
            <span className={styles.kpi}>Corporate: {counts.corporate}</span>
            <span className={styles.kpi}>Needs review: {counts.review}</span>
            <span className={styles.kpi}>Awaiting payment: {counts.pay}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <div
            className={styles.tabs}
            role='tablist'
            aria-label='Request bucket'
          >
            <button
              type='button'
              className={`tab ${bucket === "review" ? "tabActive" : ""}`}
              onClick={() => setBucket("review")}
            >
              Needs review
            </button>
            <button
              type='button'
              className={`tab ${bucket === "payment" ? "tabActive" : ""}`}
              onClick={() => setBucket("payment")}
            >
              Awaiting payment
            </button>
            <button
              type='button'
              className={`tab ${bucket === "all" ? "tabActive" : ""}`}
              onClick={() => setBucket("all")}
            >
              All
            </button>
          </div>

          <div
            className={styles.tabs}
            role='tablist'
            aria-label='Customer filter'
          >
            <button
              type='button'
              className={`tab ${customerFilter === "all" ? "tabActive" : ""}`}
              onClick={() => setCustomerFilter("all")}
            >
              All
            </button>
            <button
              type='button'
              className={`tab ${customerFilter === "guests" ? "tabActive" : ""}`}
              onClick={() => setCustomerFilter("guests")}
            >
              Guests
            </button>
            <button
              type='button'
              className={`tab ${customerFilter === "accounts" ? "tabActive" : ""}`}
              onClick={() => setCustomerFilter("accounts")}
            >
              Accounts
            </button>
            <button
              type='button'
              className={`tab ${customerFilter === "corporate" ? "tabActive" : ""}`}
              onClick={() => setCustomerFilter("corporate")}
            >
              Corporate
            </button>
          </div>
        </div>
      </header>

      {selected.size > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkCount}>
            {selected.size} selected{pending ? " — working…" : ""}
          </span>
          <button
            type='button'
            className={styles.bulkBtn}
            onClick={() => setTrashOpen(true)}
            disabled={pending}
          >
            Move to Trash
          </button>
          <button
            type='button'
            className={styles.bulkClear}
            onClick={() => setSelected(new Set())}
            disabled={pending}
          >
            Clear
          </button>
          <Link href='/admin/bookings?status=TRASH' className={styles.bulkLink}>
            View trash →
          </Link>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className='emptySmall'>No items match your filters.</div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.trHead}>
                <th className={`${styles.th} ${styles.thCheck}`}>
                  <input
                    type='checkbox'
                    className={styles.checkbox}
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(visibleIds))
                    }
                    aria-label='Select all visible requests'
                  />
                </th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Created</th>
                <th className={styles.th}>Pickup</th>
                <th className={styles.th}>Client</th>
                <th className={styles.th}>Service</th>
                <th className={styles.th}>Vehicle</th>
                {/* <th className={styles.th}>Route</th> */}
                <th className={`${styles.th} ${styles.thRight}`}></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((b) => {
                const created = formatAt(b.createdAtIso, timeZone);
                const pickup = formatAt(b.pickupAtIso, timeZone);
                const tone = statusTone(b.status);

                // const route = `${shortAddress(b.pickupAddress)} → ${shortAddress(b.dropoffAddress)}`;
                const href = `${bookingHrefBase}/${encodeURIComponent(b.id)}`;

                const customerLine =
                  b.customer.kind === "guest"
                    ? `${b.customer.name}${b.customer.email ? ` • ${b.customer.email}` : ""}${
                        b.customer.phone ? ` • ${b.customer.phone}` : ""
                      }`
                    : b.customer.kind === "corporate"
                      ? `${b.customer.name} • ${b.customer.accountName}`
                      : `${b.customer.name}${b.customer.email ? ` • ${b.customer.email}` : ""}`;

                const customerKindLabel =
                  b.customer.kind === "guest"
                    ? "Guest"
                    : b.customer.kind === "corporate"
                      ? "Corporate"
                      : "Account";

                const primaryCta =
                  b.status === "PENDING_REVIEW"
                    ? "Review"
                    : b.status === "PENDING_PAYMENT"
                      ? "Collect payment"
                      : "View";

                return (
                  <tr key={b.id} className={styles.tr}>
                    <td
                      className={`${styles.td} ${styles.tdCheck}`}
                      data-label='Select'
                    >
                      <input
                        type='checkbox'
                        className={styles.checkbox}
                        checked={selected.has(b.id)}
                        onChange={() => toggleSelected(b.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label='Select booking request'
                      />
                    </td>
                    <td className={styles.td} data-label='Status'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <span
                          className={`${styles.badge} ${styles[`badge_${tone}`]}`}
                        >
                          {prettyStatus(b.status)}
                        </span>
                      </div>
                    </td>

                    <td className={styles.td} data-label='Created'>
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
                          {created.label}
                        </Link>
                        <div className={styles.cellMeta}>
                          <span className={styles.pill}>{created.rel}</span>
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
                          {customerKindLabel}
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

                    {/* <td className={styles.td} data-label='Route'>
                      <Link
                        href={href}
                        className={styles.rowStretchedLink}
                        aria-hidden='true'
                        tabIndex={-1}
                      />
                      <div className={styles.cellInner}>
                        <div className={styles.route}>{route}</div>
                      </div>
                    </td> */}

                    <td
                      className={`${styles.td} ${styles.tdRight}`}
                      data-label='Action'
                    >
                      <Link className='primaryBtn' href={href}>
                        {primaryCta}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <BulkConfirmModal
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        onConfirm={runBulkTrash}
        pending={pending}
        title={`Move ${selectedCount} ${selectedPlural} to the Trash?`}
        body={
          <>
            They will disappear from every list, calendar, and report, and can
            be restored from the <strong>Trash</strong> tab on the Bookings page
            for 7 days. After that, unpaid bookings are permanently deleted;
            bookings with a payment on file are kept.
          </>
        }
        confirmLabel='Move to Trash'
        pendingLabel='Moving...'
      />
    </section>
  );
}
