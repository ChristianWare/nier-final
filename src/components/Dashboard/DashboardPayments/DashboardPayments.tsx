import styles from "./DashboardPayments.module.css";
import Link from "next/link";
import { PaymentStatus, Prisma } from "@prisma/client";

type Filter = "all" | "paid" | "pending" | "failed" | "refunded";

type PaymentRow = Prisma.PaymentGetPayload<{
  include: {
    booking: {
      select: {
        id: true;
        pickupAt: true;
        pickupAddress: true;
        dropoffAddress: true;
        status: true;
        totalCents: true;
        currency: true;
        serviceType: { select: { name: true; slug: true } };
      };
    };
  };
}>;

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function moneyFromCents(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format((cents ?? 0) / 100);
  } catch {
    return `$${((cents ?? 0) / 100).toFixed(2)}`;
  }
}

function paymentLabel(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    case "NONE":
    default:
      return "Unpaid";
  }
}

function badgeTone(status: PaymentStatus) {
  if (status === "PAID") return "good";
  if (status === "PENDING" || status === "NONE") return "warn";
  if (status === "FAILED") return "bad";
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED")
    return "neutral";
  return "neutral";
}

function canContinueCheckout(p: PaymentRow) {
  if (!p.checkoutUrl) return false;
  return p.status === "NONE" || p.status === "PENDING" || p.status === "FAILED";
}

export default function DashboardPayments({
  filter,
  counts,
  payments,
}: {
  filter: Filter;
  counts: {
    all: number;
    paid: number;
    pending: number;
    failed: number;
    refunded: number;
  };
  payments: PaymentRow[];
}) {
  return (
    <section className={styles.container} aria-label='Payments and receipts'>
      <header className={styles.header}>
        <div className={styles.titleBox}>
          <h1 className={`${styles.heading} h2`}>Payments & receipts</h1>
          <p className={styles.subheading}>
            View payment status, download receipts, or continue checkout.
          </p>
        </div>

        <nav className={styles.tabs} aria-label='Payment filters'>
          <Link
            href={{ pathname: "/dashboard/payments", query: {} }}
            className={`${styles.tab} ${filter === "all" ? styles.tabActive : ""}`}
          >
            All <span className={styles.count}>{counts.all}</span>
          </Link>

          <Link
            href={{
              pathname: "/dashboard/payments",
              query: { status: "paid" },
            }}
            className={`${styles.tab} ${filter === "paid" ? styles.tabActive : ""}`}
          >
            Paid <span className={styles.count}>{counts.paid}</span>
          </Link>

          <Link
            href={{
              pathname: "/dashboard/payments",
              query: { status: "pending" },
            }}
            className={`${styles.tab} ${filter === "pending" ? styles.tabActive : ""}`}
          >
            Pending <span className={styles.count}>{counts.pending}</span>
          </Link>

          <Link
            href={{
              pathname: "/dashboard/payments",
              query: { status: "failed" },
            }}
            className={`${styles.tab} ${filter === "failed" ? styles.tabActive : ""}`}
          >
            Failed <span className={styles.count}>{counts.failed}</span>
          </Link>

          <Link
            href={{
              pathname: "/dashboard/payments",
              query: { status: "refunded" },
            }}
            className={`${styles.tab} ${filter === "refunded" ? styles.tabActive : ""}`}
          >
            Refunded <span className={styles.count}>{counts.refunded}</span>
          </Link>
        </nav>
      </header>

      {payments.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No payments found.</p>
          <p className={styles.emptyCopy}>
            When you book a ride, receipts and payment history will appear here.
          </p>
          <div className={styles.actionsRow}>
            <Link className={styles.primaryBtn} href='/book'>
              Book a ride
            </Link>
            <Link className={styles.secondaryBtn} href='/dashboard/trips'>
              View trips
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {payments.map((p) => {
            const b = p.booking;
            const continueCheckout = canContinueCheckout(p);
            const hasReceipt = Boolean(p.receiptUrl);
            const paidAt = p.paidAt ? formatDate(p.paidAt) : null;

            const amount =
              p.amountTotalCents && p.amountTotalCents > 0
                ? moneyFromCents(p.amountTotalCents, p.currency)
                : moneyFromCents(b.totalCents, b.currency);

            return (
              <article key={p.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.meta}>
                    <div className={styles.date}>
                      {formatDateTime(b.pickupAt)}
                    </div>
                    <div className={styles.route}>
                      {b.pickupAddress} → {b.dropoffAddress}
                    </div>
                    <div className={styles.smallMeta}>
                      <span>{b.serviceType?.name ?? "Service"}</span>
                      <span className={styles.dot}>•</span>
                      <Link
                        className={styles.tripLink}
                        href={`/dashboard/trips/${b.id}`}
                      >
                        View trip
                      </Link>
                      {paidAt ? (
                        <>
                          <span className={styles.dot}>•</span>
                          <span>Paid: {paidAt}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.rightMeta}>
                    <span
                      className={`${styles.badge} ${styles[`badge_${badgeTone(p.status)}`]}`}
                    >
                      {paymentLabel(p.status)}
                    </span>
                    <div className={styles.total}>{amount}</div>
                  </div>
                </div>

                <div className={styles.actionsRow}>
                  {hasReceipt ? (
                    <a
                      className={styles.secondaryBtn}
                      href={p.receiptUrl ?? "#"}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Open receipt
                    </a>
                  ) : null}

                  {continueCheckout ? (
                    <a
                      className={styles.primaryBtn}
                      href={p.checkoutUrl ?? "#"}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Continue checkout
                    </a>
                  ) : null}

                  <Link
                    className={styles.tertiaryBtn}
                    href={`/dashboard/trips/${b.id}`}
                  >
                    Trip details
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
