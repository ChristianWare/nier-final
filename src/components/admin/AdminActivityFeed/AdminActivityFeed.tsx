/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import Button from "@/components/shared/Button/Button";
import styles from "./AdminActivityFeed.module.css";
import Link from "next/link";
import { useMemo, useState } from "react";

export type AdminActivityItem = {
  kind: "STATUS" | "ASSIGNMENT" | "PAYMENT_RECEIVED" | "PAYMENT_LINK_SENT";
  at: Date;
  title: string;
  subtitle: string;
  bookingId: string;
  href?: string;
  ctaLabel?: string;
};

type Props = {
  items: AdminActivityItem[];
  timeZone?: string;
  title?: string;
  emptyText?: string;
  hrefBase?: string;
};

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";
type KindBucket =
  | "all"
  | "status"
  | "assignment"
  | "payment_received"
  | "payment_link_sent";
type ToneBucket = "all" | "good" | "warn" | "bad" | "accent" | "neutral";

function formatDateTime(d: Date, timeZone?: string) {
  // You didn’t ask to change this format, so keeping it as-is for activity feed.
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(d);
}

function kindLabel(kind: AdminActivityItem["kind"]) {
  switch (kind) {
    case "STATUS":
      return "Trip update";
    case "ASSIGNMENT":
      return "Driver assigned";
    case "PAYMENT_RECEIVED":
      return "Payment received";
    case "PAYMENT_LINK_SENT":
      return "Payment link sent";
    default:
      return "Update";
  }
}

function toneFromStatusTitle(titleRaw: string): BadgeTone {
  const t = (titleRaw ?? "").trim().toLowerCase();

  // BAD
  if (
    t.includes("cancelled") ||
    t.includes("canceled") ||
    t.includes("no-show") ||
    t.includes("no show") ||
    t.includes("failed") ||
    t.includes("declined")
  ) {
    return "bad";
  }

  // GOOD (explicitly treat approval as good, even if it mentions pending payment)
  if (
    t.includes("approved") ||
    t.includes("booking approved") ||
    t.includes("confirmed") ||
    t.includes("completed") ||
    t.includes("assigned")
  ) {
    return "good";
  }

  // ACCENT (in-motion)
  if (
    t.includes("en route") ||
    t.includes("en-route") ||
    t.includes("arrived") ||
    t.includes("in progress") ||
    t.includes("in-progress") ||
    t.includes("started") ||
    t.includes("driver en route") ||
    t.includes("driver arrived")
  ) {
    return "accent";
  }

  // WARN
  if (
    t.includes("payment due") ||
    t.includes("payment link") ||
    t.includes("pending payment")
  ) {
    return "warn";
  }

  // NEUTRAL
  if (t.includes("pending review") || t.includes("draft")) return "neutral";

  return "neutral";
}

/**
 * Activity-feed tone:
 * - for non-STATUS items we know the intent, so tone is deterministic
 * - for STATUS items we infer tone from the status text (your `it.title`)
 */
function kindTone(it: AdminActivityItem): BadgeTone {
  switch (it.kind) {
    case "PAYMENT_RECEIVED":
      return "good";
    case "PAYMENT_LINK_SENT":
      return "warn";
    case "ASSIGNMENT":
      return "good";
    case "STATUS":
    default:
      return toneFromStatusTitle(it.title);
  }
}

function kindBucketLabel(b: KindBucket) {
  switch (b) {
    case "all":
      return "All";
    case "status":
      return "Trip updates";
    case "assignment":
      return "Assignments";
    case "payment_received":
      return "Payments received";
    case "payment_link_sent":
      return "Payment links";
    default:
      return "All";
  }
}

function toneBucketLabel(t: ToneBucket) {
  switch (t) {
    case "all":
      return "All";
    case "good":
      return "Good";
    case "warn":
      return "Warn";
    case "bad":
      return "Bad";
    case "accent":
      return "In motion";
    case "neutral":
      return "Neutral";
    default:
      return "All";
  }
}

function matchesKindBucket(
  kind: AdminActivityItem["kind"],
  bucket: KindBucket,
) {
  if (bucket === "all") return true;
  if (bucket === "status") return kind === "STATUS";
  if (bucket === "assignment") return kind === "ASSIGNMENT";
  if (bucket === "payment_received") return kind === "PAYMENT_RECEIVED";
  if (bucket === "payment_link_sent") return kind === "PAYMENT_LINK_SENT";
  return true;
}

export default function AdminActivityFeed({
  items,
  timeZone,
  title = "Recent activity",
  emptyText = "No activity yet.",
  hrefBase = "/admin/bookings",
}: Props) {
  // default tabs: All / All (like recent booking requests defaulting to all)
  const [kindBucket, setKindBucket] = useState<KindBucket>("all");
  const [toneBucket, setToneBucket] = useState<ToneBucket>("all");

  const derived = useMemo(() => {
    const list = items.map((it) => ({
      ...it,
      tone: kindTone(it),
    }));

    const counts = {
      total: list.length,

      status: list.filter((x) => x.kind === "STATUS").length,
      assignment: list.filter((x) => x.kind === "ASSIGNMENT").length,
      payment_received: list.filter((x) => x.kind === "PAYMENT_RECEIVED")
        .length,
      payment_link_sent: list.filter((x) => x.kind === "PAYMENT_LINK_SENT")
        .length,

      good: list.filter((x) => x.tone === "good").length,
      warn: list.filter((x) => x.tone === "warn").length,
      bad: list.filter((x) => x.tone === "bad").length,
      accent: list.filter((x) => x.tone === "accent").length,
      neutral: list.filter((x) => x.tone === "neutral").length,
    };

    return { list, counts };
  }, [items]);

  const filtered = useMemo(() => {
    let list = derived.list.slice();

    // Kind tab filter
    list = list.filter((x) => matchesKindBucket(x.kind, kindBucket));

    // Tone tab filter
    if (toneBucket !== "all") {
      list = list.filter((x) => x.tone === toneBucket);
    }

    // newest first
    list.sort((a, b) => b.at.getTime() - a.at.getTime());

    return list;
  }, [derived.list, kindBucket, toneBucket]);

  return (
    <section className={styles.container} aria-label='Admin activity feed'>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className='cardTitle h4'>{title}</h2>

          <div className={styles.kpis}>
            <span className={styles.kpi}>Total: {derived.counts.total}</span>
            <span className={styles.kpi}>
              Trip updates: {derived.counts.status}
            </span>
            <span className={styles.kpi}>
              Assignments: {derived.counts.assignment}
            </span>
            <span className={styles.kpi}>
              Payments: {derived.counts.payment_received}
            </span>
            <span className={styles.kpi}>
              Payment links: {derived.counts.payment_link_sent}
            </span>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.tabs} role='tablist' aria-label='Kind filter'>
            {(
              [
                "all",
                "status",
                "assignment",
                "payment_received",
                "payment_link_sent",
              ] as KindBucket[]
            ).map((b) => (
              <button
                key={b}
                type='button'
                className={`tab ${kindBucket === b ? "tabActive" : ""}`}
                onClick={() => setKindBucket(b)}
              >
                {kindBucketLabel(b)}
              </button>
            ))}
          </div>

          {/* <div className={styles.tabs} role='tablist' aria-label='Tone filter'>
            {(
              [
                "all",
                "good",
                "warn",
                "bad",
                "accent",
                "neutral",
              ] as ToneBucket[]
            ).map((t) => (
              <button
                key={t}
                type='button'
                className={`tab ${toneBucket === t ? "tabActive" : ""}`}
                onClick={() => setToneBucket(t)}
              >
                {toneBucketLabel(t)}
              </button>
            ))}
          </div> */}
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className='emptySmall'>No items match your filters.</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((it) => {
            const href = it.href ?? `${hrefBase}/${it.bookingId}`;
            const key = `${it.bookingId}-${it.kind}-${it.at.toISOString()}`;

            return (
              <li key={key} className={styles.row}>
                <div className={styles.left}>
                  <span className='emptyTitle underline'>
                    {kindLabel(it.kind)}
                  </span>

                  <div className={styles.box}>
                    <span className='miniNote'>
                      {formatDateTime(it.at, timeZone)}
                    </span>
                    <span className={`badge badge_${it.tone}`}>{it.title}</span>
                  </div>

                  <div className='emptySmall'>{it.subtitle}</div>
                </div>

                <Link className='primaryBtn' href={href}>
                  {it.ctaLabel ?? "Open"}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
       {/* <div className={styles.btnContainer}>
              <Button
                href='/admin/activity'
                text='See all activity'
                btnType='black'
                arrow
              />
            </div> */}
    </section>
  );
}
