"use client";

import styles from "./DashboardNotifications.module.css";
import Button from "@/components/shared/Button/Button";
import Link from "next/link";
import { useMemo, useState } from "react";

type NotificationItem = {
  id: string;
  createdAt: string;
  title: string;
  subtitle: string;
  bookingId: string;
  bookingHref: string;
  links: { label: string; href: string }[];
  tag: "Trip update" | "Payment";
};

const STORAGE_KEY = "nier_dashboard_notifications_last_seen";

function formatTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatDateHeading(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readLastSeen(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function tagTone(tag: NotificationItem["tag"]) {
  if (tag === "Payment") return "warn";
  return "neutral";
}

export default function DashboardNotifications({
  items,
}: {
  items: NotificationItem[];
}) {
  const [lastSeenIso, setLastSeenIso] = useState<string | null>(() =>
    readLastSeen()
  );

  const lastSeenAt = useMemo(() => {
    if (!lastSeenIso) return null;
    const d = new Date(lastSeenIso);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [lastSeenIso]);

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) return items.length;
    return items.filter(
      (x) => new Date(x.createdAt).getTime() > lastSeenAt.getTime()
    ).length;
  }, [items, lastSeenAt]);

  const grouped = useMemo(() => {
    const map = new Map<string, { date: Date; items: NotificationItem[] }>();

    for (const it of items) {
      const d = new Date(it.createdAt);
      const k = dateKey(d);
      const existing = map.get(k);
      if (!existing) map.set(k, { date: d, items: [it] });
      else existing.items.push(it);
    }

    return Array.from(map.values()).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [items]);

  function markAllAsRead() {
    const nowIso = new Date().toISOString();
    try {
      window.localStorage.setItem(STORAGE_KEY, nowIso);
    } catch {}
    setLastSeenIso(nowIso);
  }

  return (
    <section className='container' aria-label='Notifications'>
      <header className='header'>
        <h1 className={`heading h2`}>Notifications</h1>
        <p className='subheading'>
          Recent activity from trip updates and payments.
        </p>

        <div className={styles.headerActions}>
          <div className='tab'>
            Unread: <span className={styles.unreadCount}>{unreadCount}</span>
          </div>

          <button
            type='button'
            className='tab'
            onClick={markAllAsRead}
            disabled={items.length === 0 || unreadCount === 0}
          >
            Mark all as read
          </button>

          <Link className='tab' href='/dashboard/trips'>
            View trips
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No notifications yet.</p>
          <p className={styles.emptyCopy}>
            When your trip status changes or a payment updates, it will show up
            here.
          </p>
          <div className={styles.btnRow}>
            <div className='btnContainer'>
              <Button href='/book' btnType='red' text='Book a ride' arrow />
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.feed}>
          {grouped.map((group) => (
            <section key={dateKey(group.date)} className={styles.dayGroup}>
              <div className={styles.dayHeading}>
                {formatDateHeading(group.date)}
              </div>

              <ul className={styles.activityList}>
                {group.items.map((it) => {
                  const createdAt = new Date(it.createdAt);
                  const isUnread =
                    !lastSeenAt || createdAt.getTime() > lastSeenAt.getTime();

                  return (
                    <li key={it.id} className={styles.activityItem}>
                      <div className={styles.activityLeft}>
                        <div className={styles.titleRow}>
                          {isUnread ? <span className={styles.dot} /> : null}
                          <div className='emptyTitle'>{it.title}</div>
                        </div>

                        <div className={styles.meta}>
                          <span className={`badge badge_${tagTone(it.tag)}`}>
                            {it.tag}
                          </span>
                          <span className={styles.sep}>•</span>
                          <span>{formatTime(createdAt)}</span>
                        </div>

                        <div className={styles.subtitle}>{it.subtitle}</div>

                        {it.links.length ? (
                          <div className={styles.actions}>
                            {it.links.map((l) => {
                              const isExternal = l.href.startsWith("http");
                              const cls =
                                l.label === "Continue checkout"
                                  ? styles.primaryBtn
                                  : l.label === "Open receipt"
                                    ? styles.secondaryBtn
                                    : styles.tertiaryBtn;

                              return isExternal ? (
                                <a
                                  key={l.href + l.label}
                                  className={cls}
                                  href={l.href}
                                  target='_blank'
                                  rel='noreferrer'
                                >
                                  {l.label}
                                </a>
                              ) : (
                                <Link
                                  key={l.href + l.label}
                                  className={cls}
                                  href={l.href}
                                >
                                  {l.label}
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>

                      <Link className='primaryBtn' href={it.bookingHref}>
                        Open
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className={styles.footerNote}>
        Note: “Read” state is stored on this device only for now. If you want it
        synced across devices, we’ll add a small Notification model.
      </p>
    </section>
  );
}
