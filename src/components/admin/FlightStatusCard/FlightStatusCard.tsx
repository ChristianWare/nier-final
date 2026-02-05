"use client";

import { useCallback, useEffect, useState } from "react";
import { getFlightStatus } from "../../../../actions/flight/getFlightStatus";
import type { FlightStatusResponse } from "../../../../actions/flight/getFlightStatus";
import styles from "./FlightStatusCard.module.css";

type Props = {
  flightNumber: string;
  /** Date in YYYY-MM-DD format */
  flightDate: string;
  /** "PICKUP" or "DROPOFF" — determines if we show arrival or departure info prominently */
  airportLeg: "PICKUP" | "DROPOFF" | "NONE";
};

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const raw = iso.trim();

    // Handle AeroDataBox format: "2026-02-05 09:34-07:00"
    if (raw.includes(" ") && raw.includes("-") && raw.length > 10) {
      const [, rest] = raw.split(" ");
      const timePart = rest?.substring(0, 5);
      if (timePart) {
        const [hStr, mStr] = timePart.split(":");
        const hour = parseInt(hStr, 10);
        const min = mStr ?? "00";
        const ampm = hour >= 12 ? "PM" : "AM";
        const h12 = hour % 12 || 12;
        return `${h12}:${min} ${ampm}`;
      }
    }

    // Handle ISO format with T
    if (raw.includes("T") || raw.includes(":")) {
      const timePart = raw.includes("T") ? raw.split("T")[1] : raw;
      const [hStr, mStr] = timePart.split(":");
      const hour = parseInt(hStr, 10);
      const min = mStr ?? "00";
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      return `${h12}:${min} ${ampm}`;
    }

    // Fallback: try Date constructor
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    return raw;
  } catch {
    return iso ?? "—";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Landed":
    case "Arrived":
      return "#22c55e";
    case "EnRoute":
    case "Departed":
      return "#3b82f6";
    case "Expected":
    case "On Time":
      return "#8b5cf6";
    case "Delayed":
      return "#f59e0b";
    case "Cancelled":
      return "#ef4444";
    case "Diverted":
      return "#f97316";
    case "Early":
      return "#10b981";
    default:
      return "#94a3b8";
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case "Landed":
    case "Arrived":
      return "🛬";
    case "EnRoute":
    case "Departed":
      return "✈️";
    case "Expected":
    case "On Time":
      return "🟢";
    case "Delayed":
      return "⚠️";
    case "Cancelled":
      return "❌";
    case "Diverted":
      return "↪️";
    case "Early":
      return "⏩";
    default:
      return "❓";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "EnRoute":
      return "En Route";
    default:
      return status;
  }
}

/**
 * Derive a meaningful status from delay data when API returns "Unknown"
 */
function deriveStatus(apiStatus: string, delayMinutes: number | null): string {
  // If the API gave us a real status, use it
  if (apiStatus !== "Unknown") return apiStatus;

  // Derive from delay data
  if (delayMinutes === null) return "Unknown";
  if (delayMinutes < -5) return "Early";
  if (delayMinutes <= 5) return "On Time";
  return "Delayed";
}

function TimingPill({
  delayMinutes,
  apiStatus,
}: {
  delayMinutes: number | null;
  apiStatus: string;
}) {
  if (delayMinutes === null && apiStatus === "Unknown") return null;

  // For terminal statuses, don't show a timing pill
  if (["Cancelled", "Diverted", "Landed", "Arrived"].includes(apiStatus)) {
    return null;
  }

  if (delayMinutes === null) return null;

  let label: string;
  let bgColor: string;
  let textColor: string;

  if (delayMinutes < -5) {
    // Early
    const mins = Math.abs(delayMinutes);
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    label = hours > 0 ? `${hours}h ${remainder}m early` : `${mins} min early`;
    bgColor = "#dcfce7";
    textColor = "#15803d";
  } else if (delayMinutes <= 5) {
    // On time (within 5 min tolerance)
    label = "On Time";
    bgColor = "#dcfce7";
    textColor = "#15803d";
  } else if (delayMinutes <= 15) {
    // Slight delay
    label = `+${delayMinutes} min`;
    bgColor = "#fef9c3";
    textColor = "#a16207";
  } else if (delayMinutes <= 60) {
    // Moderate delay
    label = `+${delayMinutes} min delay`;
    bgColor = "#ffedd5";
    textColor = "#c2410c";
  } else {
    // Severe delay
    const hours = Math.floor(delayMinutes / 60);
    const mins = delayMinutes % 60;
    label = `+${hours}h ${mins}m delay`;
    bgColor = "#fee2e2";
    textColor = "#dc2626";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 600,
        background: bgColor,
        color: textColor,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default function FlightStatusCard({
  flightNumber,
  flightDate,
  airportLeg,
}: Props) {
  const [data, setData] = useState<FlightStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!flightNumber || !flightDate) return;
    setLoading(true);
    try {
      const result = await getFlightStatus(flightNumber, flightDate);
      setData(result);
      setLastFetched(new Date());
    } catch {
      setData({ ok: false, error: "Failed to fetch flight status." });
    } finally {
      setLoading(false);
    }
  }, [flightNumber, flightDate]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (!flightNumber || !flightDate) return null;

  // Determine which delay to show based on airport leg
  const relevantDelay = data?.ok
    ? airportLeg === "PICKUP"
      ? data.flight.arrivalDelayMinutes
      : data.flight.departureDelayMinutes
    : null;

  const derivedStatus = data?.ok
    ? deriveStatus(data.flight.status, relevantDelay)
    : "Unknown";

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>✈️</span>
          <span className={styles.headerTitle}>
            Live Flight Status — {flightNumber}
          </span>
        </div>
        <button
          type='button'
          onClick={fetchStatus}
          disabled={loading}
          className={styles.refreshBtn}
        >
          {loading ? "Checking..." : "↻ Refresh"}
        </button>
      </div>

      {/* Loading state */}
      {loading && !data && (
        <div className={styles.loadingState}>
          <div className={styles.loadingDot} />
          <span>Looking up {flightNumber}...</span>
        </div>
      )}

      {/* Error state */}
      {data && !data.ok && (
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{data.error}</span>
        </div>
      )}

      {/* Success state */}
      {data?.ok && (
        <div className={styles.body}>
          {/* Status row with derived status + timing pill */}
          <div className={styles.statusRow}>
            <div
              className={styles.statusBadge}
              style={{ background: getStatusColor(derivedStatus) }}
            >
              <span>{getStatusEmoji(derivedStatus)}</span>
              <span>{getStatusLabel(derivedStatus)}</span>
            </div>
            <TimingPill
              delayMinutes={relevantDelay}
              apiStatus={data.flight.status}
            />
          </div>

          {/* Flight route */}
          <div className={styles.routeRow}>
            <div className={styles.routeAirport}>
              <div className={styles.airportCode}>
                {data.flight.departure.airport.iata ?? "???"}
              </div>
              <div className={styles.airportName}>
                {data.flight.departure.airport.name ?? "Departure"}
              </div>
            </div>
            <div className={styles.routeArrow}>→</div>
            <div className={styles.routeAirport}>
              <div className={styles.airportCode}>
                {data.flight.arrival.airport.iata ?? "???"}
              </div>
              <div className={styles.airportName}>
                {data.flight.arrival.airport.name ?? "Arrival"}
              </div>
            </div>
          </div>

          {/* Times grid */}
          <div className={styles.timesGrid}>
            {/* Departure times */}
            <div className={styles.timeBlock}>
              <div className={styles.timeLabel}>Departure</div>
              <div className={styles.timeRow}>
                <span className={styles.timeKey}>Scheduled:</span>
                <span className={styles.timeVal}>
                  {formatTime(data.flight.departure.scheduledTime)}
                </span>
              </div>
              {data.flight.departure.estimatedTime && (
                <div className={styles.timeRow}>
                  <span className={styles.timeKey}>Estimated:</span>
                  <span className={styles.timeVal}>
                    {formatTime(data.flight.departure.estimatedTime)}
                  </span>
                </div>
              )}
              {data.flight.departure.actualTime && (
                <div className={styles.timeRow}>
                  <span className={styles.timeKey}>Actual:</span>
                  <span className={`${styles.timeVal} ${styles.timeActual}`}>
                    {formatTime(data.flight.departure.actualTime)}
                  </span>
                </div>
              )}
              {data.flight.departure.terminal && (
                <div className={styles.timeRow}>
                  <span className={styles.timeKey}>Terminal:</span>
                  <span className={styles.timeVal}>
                    {data.flight.departure.terminal}
                  </span>
                </div>
              )}
            </div>

            {/* Arrival times */}
            <div className={styles.timeBlock}>
              <div className={styles.timeLabel}>Arrival</div>
              <div className={styles.timeRow}>
                <span className={styles.timeKey}>Scheduled:</span>
                <span className={styles.timeVal}>
                  {formatTime(data.flight.arrival.scheduledTime)}
                </span>
              </div>
              {data.flight.arrival.estimatedTime && (
                <div className={styles.timeRow}>
                  <span className={styles.timeKey}>Estimated:</span>
                  <span className={styles.timeVal}>
                    {formatTime(data.flight.arrival.estimatedTime)}
                  </span>
                </div>
              )}
              {data.flight.arrival.actualTime && (
                <div className={styles.timeRow}>
                  <span className={styles.timeKey}>Actual:</span>
                  <span className={`${styles.timeVal} ${styles.timeActual}`}>
                    {formatTime(data.flight.arrival.actualTime)}
                  </span>
                </div>
              )}
              {data.flight.arrival.terminal && (
                <div className={styles.timeRow}>
                  <span className={styles.timeKey}>Terminal:</span>
                  <span className={styles.timeVal}>
                    {data.flight.arrival.terminal}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Airline info */}
          {data.flight.airline.name && (
            <div className={styles.airlineRow}>
              <span className={styles.airlineLabel}>Airline:</span>
              <span>{data.flight.airline.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Last fetched timestamp */}
      {lastFetched && (
        <div className={styles.footer}>
          Last checked:{" "}
          {lastFetched.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </div>
      )}
    </div>
  );
}
