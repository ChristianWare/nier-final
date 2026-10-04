// The booking page's "Reminders Sent" list: every reminder email for this
// ride, who it went to, and when.

import type { Prisma } from "@prisma/client";
import { formatClock, formatMdy } from "@/lib/booking/statusBadge";

type Event = {
  id: string;
  eventType: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
};

const REASONS: Record<string, string> = {
  unpaid: "not paid",
  no_driver: "no driver assigned",
  needs_review: "still pending review",
};

function describe(e: Event): { what: string; to: string } | null {
  const m = (
    e.metadata && typeof e.metadata === "object" && !Array.isArray(e.metadata)
      ? e.metadata
      : {}
  ) as Record<string, unknown>;
  const to = Array.isArray(m.to)
    ? (m.to as string[]).join(", ")
    : String(m.to ?? m.recipientEmail ?? "—");
  const kinds = Array.isArray(m.kind)
    ? (m.kind as string[])
    : m.kind
      ? [String(m.kind)]
      : [];
  switch (e.eventType) {
    case "TRIP_REMINDER_SENT":
      return {
        what: kinds.includes("2h")
          ? "Trip reminder · 2 hours before"
          : "Trip reminder · 24 hours before",
        to,
      };
    case "PAYMENT_REMINDER_SENT":
      return {
        what: `Payment reminder · ${kinds.map((k) => (k === "after_link" ? "24 hours after the link" : "48 hours before pickup")).join(" + ") || "unpaid"}`,
        to,
      };
    case "BALANCE_REMINDER_SENT":
      return { what: "Balance reminder · sent by an admin", to };
    case "ADMIN_ALERT_SENT": {
      const reasons = Array.isArray(m.reasons)
        ? (m.reasons as string[]).map((r) => REASONS[r] ?? r).join(", ")
        : "";
      return { what: `Admin alert · ${reasons || "needs attention"}`, to };
    }
    default:
      return null;
  }
}

export default function RemindersSent({
  events,
  timezone,
}: {
  events: Event[];
  timezone: string;
}) {
  const rows = events
    .map((e) => ({ e, d: describe(e) }))
    .filter((x): x is { e: Event; d: { what: string; to: string } } => !!x.d);

  if (rows.length === 0) {
    return (
      <p className='miniNote'>
        None yet. Customers get a trip reminder 24 hours and 2 hours before
        pickup, and a payment reminder if a payment link is still unpaid 24
        hours after it was sent and again 48 hours before pickup. Admins get an
        alert 24 hours before pickup if the ride is unpaid or has no driver.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map(({ e, d }) => (
        <div
          key={e.id}
          style={{
            display: "grid",
            gap: 2,
            paddingBottom: 10,
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <strong>{d.what}</strong>
          <span className='miniNote'>
            {formatMdy(e.createdAt, timezone)} at{" "}
            {formatClock(e.createdAt, timezone)} · to {d.to}
          </span>
        </div>
      ))}
    </div>
  );
}
