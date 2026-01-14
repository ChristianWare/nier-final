"use client";

import styles from "./DashboardSupport.module.css";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookingStatus } from "@prisma/client";

type TripLite = {
  id: string;
  pickupAt: string; // ISO
  pickupAddress: string;
  dropoffAddress: string;
  status: BookingStatus;
  totalCents: number;
  currency: string;
  serviceName: string;
};

const SUPPORT = {
  email: "support@niertransportation.com", // ✅ replace with your real email
  phone: "+16025550123", // ✅ replace with your real phone
  sms: "+16025550123", // ✅ replace with your real SMS number
  hours: "Daily • 6am – 10pm (AZ time)", // ✅ change anytime
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
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

function statusLabel(status: BookingStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return "Pending review";
    case "PENDING_PAYMENT":
      return "Pending payment";
    case "CONFIRMED":
      return "Confirmed";
    case "ASSIGNED":
      return "Assigned";
    case "EN_ROUTE":
      return "En route";
    case "ARRIVED":
      return "Arrived";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-show";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    case "DRAFT":
      return "Draft";
    default:
      return status;
  }
}

function buildMailto(opts: { to: string; subject: string; body: string }) {
  const params = new URLSearchParams();
  params.set("subject", opts.subject);
  params.set("body", opts.body);
  return `mailto:${opts.to}?${params.toString()}`;
}

export default function DashboardSupport({
  viewerRole,
  user,
  trips,
}: {
  viewerRole: string;
  user: { name: string | null; email: string | null };
  trips: TripLite[];
}) {
  const router = useRouter();

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [topic, setTopic] = useState<string>("General question");
  const [message, setMessage] = useState<string>("");

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId]
  );

  const emailSubject = useMemo(() => {
    const base = topic.trim() || "Support request";
    if (!selectedTrip) return base;
    return `${base} • Trip ${selectedTrip.id}`;
  }, [topic, selectedTrip]);

  const emailBody = useMemo(() => {
    const lines: string[] = [];

    lines.push("Hi Nier Transportation Support,");
    lines.push("");
    lines.push(message.trim() || "(Describe what you need help with here.)");
    lines.push("");

    if (selectedTrip) {
      lines.push("Trip details:");
      lines.push(`- Booking ID: ${selectedTrip.id}`);
      lines.push(`- Service: ${selectedTrip.serviceName}`);
      lines.push(`- Pickup: ${formatDateTime(selectedTrip.pickupAt)}`);
      lines.push(
        `- Route: ${selectedTrip.pickupAddress} → ${selectedTrip.dropoffAddress}`
      );
      lines.push(`- Status: ${statusLabel(selectedTrip.status)}`);
      lines.push(
        `- Total: ${moneyFromCents(selectedTrip.totalCents, selectedTrip.currency)}`
      );
      lines.push("");
    }

    if (user.email) lines.push(`From: ${user.email}`);
    if (user.name) lines.push(`Name: ${user.name}`);

    return lines.join("\n");
  }, [message, selectedTrip, user.email, user.name]);

  const mailtoHref = useMemo(() => {
    return buildMailto({
      to: SUPPORT.email,
      subject: emailSubject,
      body: emailBody,
    });
  }, [emailSubject, emailBody]);

  function goToTrip() {
    if (!selectedTripId) return;
    router.push(`/dashboard/trips/${selectedTripId}`);
  }

  return (
    <section className='container' aria-label='Support'>
      <header className='header'>
        <h1 className={`heading h2`}>Support</h1>
        <p className='subheading'>
          Get quick answers, contact support, or reference a specific trip.
        </p>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`cardTitle h4`}>Contact</h2>
            <div className={styles.metaRight}>{SUPPORT.hours}</div>
          </header>

          <div className={styles.contactGrid}>
            <a className='emptyTitle' href={`mailto:${SUPPORT.email}`}>
              Email: {SUPPORT.email}
            </a>

            <a className='emptyTitle' href={`tel:${SUPPORT.phone}`}>
              Phone: {SUPPORT.phone}
            </a>

            <a className='emptyTitle' href={`sms:${SUPPORT.sms}`}>
              SMS: {SUPPORT.sms}
            </a>
          </div>

          <div className={styles.divider} />

          <div className={styles.form}>
            <div className={styles.formTitle}>Regarding a trip?</div>

            <label className="label">
              Select trip
              <select
                className={styles.select}
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
              >
                <option value=''>No specific trip</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {formatDateTime(t.pickupAt)}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.tripMeta}>
              {selectedTrip ? (
                <div className={styles.tripMetaBox}>
                  <div className={styles.tripMetaLine}>
                    <span className={styles.tripMetaKey}>Booking ID</span>
                    <span className={styles.tripMetaVal}>
                      {selectedTrip.id}
                    </span>
                  </div>
                  <div className={styles.tripMetaLine}>
                    <span className={styles.tripMetaKey}>Status</span>
                    <span className={styles.tripMetaVal}>
                      {statusLabel(selectedTrip.status)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="miniNote">
                  Choose a trip to include details in your message.
                </p>
              )}
            </div>

            <div className={styles.tripActions}>
              <button
                type='button'
                className="tertiaryBtn"
                onClick={goToTrip}
                disabled={!selectedTripId}
              >
                Open trip
              </button>

              <Link className="primaryBtn" href='/dashboard/payments'>
                Payments & receipts
              </Link>
            </div>
          </div>
        </section>

        {/* Email form (mailto) */}
        <section className={styles.card}>
          <header className={styles.cardTop}>
            <h2 className={`cardTitle h4`}>Send a message</h2>
          </header>

          <div className={styles.form}>
            <label className="label">
              Topic
              <select
                className={styles.select}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option>General question</option>
                <option>Payment / receipt</option>
                <option>Driver / pickup</option>
                <option>Schedule change</option>
                <option>Cancellation / refund</option>
                <option>Lost item</option>
              </select>
            </label>

            <label className="label">
              Message
              <textarea
                className={styles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='Tell us what happened and how we can help...'
                rows={7}
              />
            </label>

            <div className={styles.formActions}>
              <a className="primaryBtn" href={mailtoHref}>
                Email support
              </a>

              <a className="secondaryBtn" href={`sms:${SUPPORT.sms}`}>
                Text support
              </a>
            </div>

            <p className="miniNote">
              This opens your email app (no messages are stored in the website
              yet). If you later want in-app messaging, we’ll turn this into a
              ticket/thread list.
            </p>
          </div>
        </section>

        {/* FAQs */}
        <section className={styles.cardWide}>
          <header className={styles.cardTop}>
            <h2 className={`cardTitle h4`}>FAQs & policies</h2>
            <div className={styles.metaRight}>
              Quick answers to reduce delays and confusion.
            </div>
          </header>

          <div className={styles.faqGrid}>
            <details className={styles.faqItem}>
              <summary className="emptyTitleSmall">
                How do I change or cancel a trip?
              </summary>
              <div className={styles.faqBody}>
                Open{" "}
                <Link className={styles.inlineLink} href='/dashboard/trips'>
                  My Trips
                </Link>
                , select your booking, and use the available actions. If the
                trip is already assigned or in progress, contact support for
                help.
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className="emptyTitleSmall">
                Where do I find my receipts?
              </summary>
              <div className={styles.faqBody}>
                Go to{" "}
                <Link className={styles.inlineLink} href='/dashboard/payments'>
                  Payments & receipts
                </Link>{" "}
                and open the receipt link for any paid booking.
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className="emptyTitleSmall">
                What if my payment failed?
              </summary>
              <div className={styles.faqBody}>
                Visit{" "}
                <Link className={styles.inlineLink} href='/dashboard/payments'>
                  Payments & receipts
                </Link>{" "}
                and click “Continue checkout” if it’s available. If you still
                have issues, message support with your booking ID.
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className="emptyTitleSmall">
                Airport pickup help
              </summary>
              <div className={styles.faqBody}>
                For airport pickups, keep your phone available after landing. If
                you selected Meet & Greet (or noted special pickup
                instructions), your driver will follow those details.
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className="emptyTitleSmall">Lost item</summary>
              <div className={styles.faqBody}>
                Contact support as soon as possible with your booking ID and a
                description of the item. We’ll coordinate with the driver to
                locate it.
              </div>
            </details>

            <details className={styles.faqItem}>
              <summary className="emptyTitleSmall">Refunds</summary>
              <div className={styles.faqBody}>
                Refund eligibility depends on trip status and timing. If your
                booking shows “Refunded” or “Partially refunded” you’ll also see
                receipt details under{" "}
                <Link className={styles.inlineLink} href='/dashboard/payments'>
                  Payments & receipts
                </Link>
                .
              </div>
            </details>
          </div>

          <div className={styles.bottomCtas}>
            <Link
              className="secondaryBtn"
              href='/dashboard/notifications'
            >
              View recent activity
            </Link>
          </div>

          {viewerRole === "ADMIN" ? (
            <p className={styles.adminNote}>
              Admin note: this page currently uses mailto/SMS links. If you want
              true ticketing, we can add a SupportTicket model + admin queue in
              the dashboard.
            </p>
          ) : null}
        </section>
      </div>
    </section>
  );
}
