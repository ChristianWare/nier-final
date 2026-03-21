"use client";

import { useCallback, useEffect, useState } from "react";
import { getFlightStatus } from "../../../../actions/flight/getFlightStatus";
import type { FlightStatusResponse } from "../../../../actions/flight/getFlightStatus";
import styles from "./FlightStatusCard.module.css";

type Props = {
  flightNumber: string;
  flightDate: string;
  airportLeg: "PICKUP" | "DROPOFF" | "NONE";
};

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const raw = iso.trim();
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
    if (raw.includes("T") || raw.includes(":")) {
      const timePart = raw.includes("T") ? raw.split("T")[1] : raw;
      const [hStr, mStr] = timePart.split(":");
      const hour = parseInt(hStr, 10);
      const min = mStr ?? "00";
      const ampm = hour >= 12 ? "PM" : "AM";
      const h12 = hour % 12 || 12;
      return `${h12}:${min} ${ampm}`;
    }
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

function formatDateStrip(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const raw = iso.trim();
    let d: Date;
    if (raw.includes("T")) {
      d = new Date(raw);
    } else if (raw.includes(" ")) {
      d = new Date(raw.split(" ")[0]);
    } else {
      d = new Date(raw);
    }
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return "";
  }
}

function getStatusInfo(status: string): { label: string; className: string } {
  const s = status.toLowerCase();
  if (s.includes("cancel"))
    return { label: "Cancelled", className: styles.statusCancelled };
  if (s.includes("delay"))
    return { label: "Delayed", className: styles.statusDelayed };
  if (s.includes("land") || s.includes("arrived"))
    return { label: "Landed", className: styles.statusLanded };
  if (s.includes("enroute") || s.includes("en route") || s.includes("departed"))
    return { label: "In Flight", className: styles.statusInFlight };
  if (s.includes("board"))
    return { label: "Boarding", className: styles.statusBoarding };
  if (s.includes("early"))
    return { label: "Early", className: styles.statusOnTime };
  if (s.includes("expected") || s.includes("on time") || s.includes("sched"))
    return { label: "On Time", className: styles.statusOnTime };
  return { label: status, className: styles.statusOnTime };
}

function deriveStatus(apiStatus: string, delayMinutes: number | null): string {
  if (apiStatus !== "Unknown") return apiStatus;
  if (delayMinutes === null) return "Unknown";
  if (delayMinutes < -5) return "Early";
  if (delayMinutes <= 5) return "On Time";
  return "Delayed";
}

function getDelayText(
  delayMinutes: number | null,
  apiStatus: string,
): string | null {
  if (["Cancelled", "Diverted"].includes(apiStatus)) return null;
  if (delayMinutes === null) return null;
  if (delayMinutes < -5) return `${Math.abs(delayMinutes)}min early`;
  if (delayMinutes > 5) return `${delayMinutes}min delay`;
  return null;
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

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (!flightNumber || !flightDate) return null;

  const relevantDelay = data?.ok
    ? airportLeg === "PICKUP"
      ? data.flight.arrivalDelayMinutes
      : data.flight.departureDelayMinutes
    : null;

  const derivedStatus = data?.ok
    ? deriveStatus(data.flight.status, relevantDelay)
    : "Unknown";

  const { label: statusLabel, className: statusClass } =
    getStatusInfo(derivedStatus);
  const delayText = data?.ok
    ? getDelayText(relevantDelay, data.flight.status)
    : null;

  const depIata = data?.ok
    ? (data.flight.departure.airport.iata ?? "???")
    : "???";
  const arrIata = data?.ok
    ? (data.flight.arrival.airport.iata ?? "???")
    : "???";
  const depName = data?.ok ? (data.flight.departure.airport.name ?? "") : "";
  const arrName = data?.ok ? (data.flight.arrival.airport.name ?? "") : "";

  const actualDepTime = data?.ok
    ? (data.flight.departure.actualTime ??
      data.flight.departure.estimatedTime ??
      data.flight.departure.scheduledTime)
    : null;
  const actualArrTime = data?.ok
    ? (data.flight.arrival.actualTime ??
      data.flight.arrival.estimatedTime ??
      data.flight.arrival.scheduledTime)
    : null;

  const depTerminal = data?.ok ? data.flight.departure.terminal : null;
  const arrTerminal = data?.ok ? data.flight.arrival.terminal : null;
  const airlineName = data?.ok ? data.flight.airline.name : null;
  const airlineIata = data?.ok ? data.flight.airline.iata : null;
  const dateStrip = data?.ok
    ? formatDateStrip(data.flight.departure.scheduledTime)
    : "";

  return (
    <div className={styles.wrapper}>
      {/* Card */}
      <div
        className={`${styles.card} ${loading && !data ? styles.cardLoading : ""}`}
      >
        {/* Top row: airline + status */}
        <div className={styles.cardTop}>
          <div className={styles.airline}>
            {airlineIata && (
              <span className={styles.airlineCode}>{airlineIata}</span>
            )}
            {airlineName && (
              <span className={styles.airlineName}>{airlineName}</span>
            )}
            <span className={styles.flightNum}>{flightNumber}</span>
          </div>
          <div className={styles.topRight}>
            {data?.ok && (
              <span className={`${styles.statusBadge} ${statusClass}`}>
                {statusLabel}
                {delayText && (
                  <span className={styles.delayText}>{delayText}</span>
                )}
              </span>
            )}
            {loading && (
              <span className={`${styles.statusBadge} ${styles.statusLoading}`}>
                …
              </span>
            )}
            {!loading && data && !data.ok && (
              <span className={`${styles.statusBadge} ${styles.statusError}`}>
                Not found
              </span>
            )}
          </div>
        </div>

        {/* Route */}
        {data?.ok ? (
          <div className={styles.route}>
            <div className={styles.airport}>
              <div className={styles.iata}>{depIata}</div>
              <div className={styles.airportName}>{depName}</div>
            </div>
            <div className={styles.flightPath}>
              <div className={styles.dashedLine} />
              <span className={styles.planeIcon}>✈</span>
              <div className={styles.dashedLineDot} />
            </div>
            <div className={`${styles.airport} ${styles.airportRight}`}>
              <div className={styles.iata}>{arrIata}</div>
              <div className={styles.airportName}>{arrName}</div>
            </div>
          </div>
        ) : (
          <div className={styles.route}>
            <div className={styles.airport}>
              <div className={`${styles.iata} ${styles.iataEmpty}`}>
                {loading ? "···" : "???"}
              </div>
            </div>
            <div className={styles.flightPath}>
              <div className={styles.dashedLine} />
              <span className={styles.planeIcon}>✈</span>
              <div className={styles.dashedLineDot} />
            </div>
            <div className={`${styles.airport} ${styles.airportRight}`}>
              <div className={`${styles.iata} ${styles.iataEmpty}`}>
                {loading ? "···" : "???"}
              </div>
            </div>
          </div>
        )}

        {/* Times */}
        <div className={styles.times}>
          <div className={styles.timeBlock}>
            <div className={styles.timeLabel}>Departed</div>
            <div
              className={`${styles.timeValue} ${!data?.ok ? styles.dimmed : ""}`}
            >
              {loading ? "—" : formatTime(actualDepTime)}
            </div>
            {depTerminal && (
              <div className={styles.terminal}>Terminal {depTerminal}</div>
            )}
            {!data?.ok && !loading && (
              <div className={`${styles.terminal} ${styles.dimmed}`}>
                Terminal —
              </div>
            )}
          </div>
          <div className={styles.timeDivider} />
          <div className={`${styles.timeBlock} ${styles.timeBlockRight}`}>
            <div className={styles.timeLabel}>Arriving</div>
            <div
              className={`${styles.timeValue} ${!data?.ok ? styles.dimmed : ""}`}
            >
              {loading ? "—" : formatTime(actualArrTime)}
            </div>
            {arrTerminal && (
              <div className={styles.terminal}>Terminal {arrTerminal}</div>
            )}
            {!data?.ok && !loading && (
              <div className={`${styles.terminal} ${styles.dimmed}`}>
                Terminal —
              </div>
            )}
          </div>
        </div>

        {/* Date strip */}
        <div
          className={`${styles.dateStrip} ${!data?.ok ? styles.dimmed : ""}`}
        >
          {loading ? "Looking up flight…" : dateStrip || flightDate}
        </div>

        {/* Error message */}
        {!loading && data && !data.ok && (
          <div className={styles.errorMsg}>⚠️ {data.error}</div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button
          type='button'
          onClick={fetchStatus}
          disabled={loading}
          className={styles.refreshBtn}
        >
          {loading ? "Checking..." : "↻ Refresh"}
        </button>
        {lastFetched && (
          <span className={styles.lastChecked}>
            Last checked:{" "}
            {lastFetched.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
