// src/app/admin/bookings/[id]/BoxRightDateDisplay.tsx
"use client";

import { useBookingEdit } from "./BookingEditContext";

function formatDateTimeClient(
  datetimeLocalString: string,
  timeZone: string,
): string {
  // datetime-local strings are like "2025-03-15T14:30"
  // We treat them as already being in the company timezone
  const [datePart, timePart] = datetimeLocalString.split("T");
  if (!datePart || !timePart) return datetimeLocalString;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  // Build a UTC date that, when displayed in the target timezone, shows the entered values
  // We use a trick: format a known UTC date and compare offsets
  const approxDate = new Date(Date.UTC(year, month - 1, day, hour, minute));

  // Get the UTC offset for this timezone at this approximate time
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(approxDate);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  const tzYear = parseInt(get("year"));
  const tzMonth = parseInt(get("month")) - 1;
  const tzDay = parseInt(get("day"));
  let tzHour = parseInt(get("hour"));
  if (tzHour === 24) tzHour = 0;
  const tzMinute = parseInt(get("minute"));

  const diffMs =
    approxDate.getTime() -
    new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute)).getTime();

  const correctedDate = new Date(approxDate.getTime() + diffMs);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(correctedDate);
}

export default function BoxRightDateDisplay({
  initialFormatted,
  timeZone,
}: {
  initialFormatted: string;
  timeZone: string;
}) {
  const { livePickupAt, isEditing } = useBookingEdit();

  const display =
    isEditing && livePickupAt
      ? formatDateTimeClient(livePickupAt, timeZone)
      : initialFormatted;

  return (
    <p className='emptySmall' style={{ transition: "color 0.2s" }}>
      {display}
      {isEditing && livePickupAt && (
        <span
          style={{
            marginLeft: 6,
            fontSize: 11,
            color: "var(--warning600, #d97706)",
            fontWeight: 600,
          }}
        >
          (editing)
        </span>
      )}
    </p>
  );
}
