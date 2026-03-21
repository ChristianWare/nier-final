"use client";

import { useState } from "react";
import { getFlightStatus } from "../../../../actions/flight/getFlightStatus";
import type { FlightStatusResponse } from "../../../../actions/flight/getFlightStatus";
import styles from "./FlightTracker.module.css";
import Link from "next/link";

const PHX_AIRPORTS = ["PHX", "AZA", "SDL", "DVT"];

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  } catch {
    return "—";
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
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

function getTodayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function getStatusLabel(status: string): { label: string; className: string } {
  const s = status.toLowerCase();
  if (s.includes("cancel"))
    return { label: "Cancelled", className: styles.statusCancelled };
  if (s.includes("delay"))
    return { label: "Delayed", className: styles.statusDelayed };
  if (s.includes("land") || s.includes("arrived"))
    return { label: "Landed", className: styles.statusLanded };
  if (s.includes("air") || s.includes("progress") || s.includes("departed"))
    return { label: "In Flight", className: styles.statusInFlight };
  if (s.includes("board"))
    return { label: "Boarding", className: styles.statusBoarding };
  if (s.includes("sched") || s.includes("time") || s.includes("on time"))
    return { label: "On Time", className: styles.statusOnTime };
  return { label: status, className: styles.statusOnTime };
}

function isPhxRelated(iata: string | null | undefined): boolean {
  return PHX_AIRPORTS.includes((iata ?? "").toUpperCase());
}

type FlightResult =
  | Extract<FlightStatusResponse, { ok: true }>["flight"]
  | null;

function FlightCard({
  flight,
  loading,
  error,
}: {
  flight: FlightResult;
  loading: boolean;
  error: string | null;
}) {
  const isEmpty = !flight && !loading && !error;
  const isLoading = loading;

  // Placeholder or real values
  const depIata = flight?.departure.airport.iata ?? "---";
  const arrIata = flight?.arrival.airport.iata ?? "---";
  const depName = flight?.departure.airport.name ?? "Enter flight number";
  const arrName = flight?.arrival.airport.name ?? "above to track";
  const airlineName = flight?.airline.name ?? "Airline";
  const airlineCode = flight?.airline.iata ?? null;
  const flightNum = flight?.flightNumber ?? "";

  const actualDepTime =
    flight?.departure.actualTime ??
    flight?.departure.estimatedTime ??
    flight?.departure.scheduledTime;
  const actualArrTime =
    flight?.arrival.actualTime ??
    flight?.arrival.estimatedTime ??
    flight?.arrival.scheduledTime;

  const depTerminal = flight?.departure.terminal;
  const depGate = flight?.departure.gate;
  const arrTerminal = flight?.arrival.terminal;
  const arrGate = flight?.arrival.gate;
  const depDate = flight?.departure.scheduledTime;

  const isArrPhx = isPhxRelated(flight?.arrival.airport.iata);
  const isDepPhx = isPhxRelated(flight?.departure.airport.iata);

  const delayMins = flight?.arrival.actualTime
    ? flight?.arrivalDelayMinutes
    : flight?.departureDelayMinutes;
  const delayText = delayMins && delayMins > 0 ? `${delayMins}min delay` : null;

  const { label: statusLabel, className: statusClass } = flight
    ? getStatusLabel(flight.status)
    : { label: "—", className: styles.statusOnTime };

  let ctaHeadline = "Traveling through Phoenix?";
  let ctaBody =
    "Nier Transportation provides premium black car service throughout the Phoenix metro — for any leg of your journey.";
  const ctaHref = "/book";
  let ctaLabel = "Book a Ride →";

  if (flight) {
    if (isArrPhx) {
      ctaHeadline = "Arriving in Phoenix?";
      ctaBody =
        "Skip the rideshare lines. Your personal driver will be waiting at baggage claim — tracking your flight in real time.";
      ctaLabel = "Book Airport Pickup →";
    } else if (isDepPhx) {
      ctaHeadline = "Flying out of Phoenix?";
      ctaBody =
        "We'll get you to the airport on time, every time — no surge pricing, no surprises.";
      ctaLabel = "Book Airport Dropoff →";
    }
  }

  return (
    <div className={styles.resultWrap}>
      <div
        className={`${styles.card} ${isEmpty || isLoading ? styles.cardEmpty : ""}`}
      >
        {/* Top row */}
        <div className={styles.cardTop}>
          <div className={styles.airline}>
            {airlineCode && (
              <span className={styles.airlineCode}>{airlineCode}</span>
            )}
            <span
              className={`${styles.airlineName} ${isEmpty ? styles.dimmed : ""}`}
            >
              {isLoading ? "Looking up flight…" : airlineName}
            </span>
            {flightNum && <span className={styles.flightNum}>{flightNum}</span>}
          </div>
          {flight && (
            <span className={`${styles.statusBadge} ${statusClass}`}>
              {statusLabel}
              {delayText && (
                <span className={styles.delayText}>{delayText}</span>
              )}
            </span>
          )}
          {(isEmpty || isLoading) && (
            <span className={`${styles.statusBadge} ${styles.statusEmpty}`}>
              {isLoading ? "…" : "Status"}
            </span>
          )}
        </div>

        {/* Route */}
        <div className={styles.route}>
          <div className={styles.airport}>
            <div
              className={`${styles.iata} ${isEmpty || isLoading ? styles.iataEmpty : ""}`}
            >
              {isLoading ? "···" : depIata}
            </div>
            <div
              className={`${styles.airportName} ${isEmpty ? styles.dimmed : ""}`}
            >
              {isLoading ? "" : depName}
            </div>
          </div>

          <div className={styles.flightPath}>
            <div className={styles.dashedLine} />
            <span className={styles.planeIcon}>✈</span>
            <div className={styles.dashedLineDot} />
          </div>

          <div className={`${styles.airport} ${styles.airportRight}`}>
            <div
              className={`${styles.iata} ${isEmpty || isLoading ? styles.iataEmpty : ""}`}
            >
              {isLoading ? "···" : arrIata}
            </div>
            <div
              className={`${styles.airportName} ${isEmpty ? styles.dimmed : ""}`}
            >
              {isLoading ? "" : arrName}
            </div>
          </div>
        </div>

        {/* Times */}
        <div className={styles.times}>
          <div className={styles.timeBlock}>
            <div className={styles.timeLabel}>Departed</div>
            <div
              className={`${styles.timeValue} ${isEmpty || isLoading ? styles.dimmed : ""}`}
            >
              {isLoading ? "—" : formatTime(actualDepTime)}
            </div>
            {depTerminal && (
              <div className={styles.terminal}>
                Terminal {depTerminal}
                {depGate ? ` · Gate ${depGate}` : ""}
              </div>
            )}
            {(isEmpty || isLoading) && (
              <div className={`${styles.terminal} ${styles.dimmed}`}>
                Terminal —
              </div>
            )}
          </div>
          <div className={styles.timeDivider} />
          <div className={`${styles.timeBlock} ${styles.timeBlockRight}`}>
            <div className={styles.timeLabel}>
              {flight?.arrival.actualTime ? "Arrived" : "Arriving"}
            </div>
            <div
              className={`${styles.timeValue} ${isEmpty || isLoading ? styles.dimmed : ""}`}
            >
              {isLoading ? "—" : formatTime(actualArrTime)}
            </div>
            {arrTerminal && (
              <div className={styles.terminal}>
                Terminal {arrTerminal}
                {arrGate ? ` · Gate ${arrGate}` : ""}
              </div>
            )}
            {(isEmpty || isLoading) && (
              <div className={`${styles.terminal} ${styles.dimmed}`}>
                Terminal —
              </div>
            )}
          </div>
        </div>

        {/* Date strip */}
        <div
          className={`${styles.dateStrip} ${isEmpty || isLoading ? styles.dimmed : ""}`}
        >
          {isLoading
            ? "Loading…"
            : formatDate(depDate) || "Enter a flight number to track"}
        </div>
      </div>

      {/* CTA */}
      <div className={styles.ctaBox}>
        <div className={styles.ctaContent}>
          <div>
            <div className={styles.ctaHeadline}>{ctaHeadline}</div>
            <p className={styles.ctaBody}>{ctaBody}</p>
          </div>
        </div>
        <Link href={ctaHref} className={styles.ctaBtn}>
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

export default function FlightTracker() {
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState(getTodayIso());
  const [loading, setLoading] = useState(false);
  const [flight, setFlight] = useState<FlightResult>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTrack() {
    if (!flightNumber.trim() || !date) return;
    setLoading(true);
    setFlight(null);
    setError(null);
    try {
      const res = await getFlightStatus(
        flightNumber.trim().toUpperCase(),
        date,
      );
      if (res.ok) {
        setFlight(res.flight);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>✈</div>
        <div>
          <p className={styles.subtitle}>
            Track any flight in real time — arrivals, departures, delays &
            terminals
          </p>
        </div>
      </div>

      {/* Search form */}
      <div className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Flight Number</label>
          <input
            type='text'
            value={flightNumber}
            onChange={(e) => {
              setFlightNumber(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 10),
              );
              setFlight(null);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleTrack()}
            placeholder='e.g. AA1234'
            className={styles.input}
            maxLength={10}
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Date</label>
          <input
            type='date'
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setFlight(null);
              setError(null);
            }}
            className={styles.input}
          />
        </div>
        <button
          type='button'
          onClick={handleTrack}
          disabled={loading || !flightNumber.trim() || !date}
          className={styles.trackBtn}
        >
          {loading ? <span className={styles.spinner} /> : "Track Flight"}
        </button>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>✕</span>
          <div>
            <div className={styles.errorTitle}>Flight not found</div>
            <div className={styles.errorBody}>{error}</div>
          </div>
        </div>
      )}

      {/* Card — always visible */}
      <FlightCard flight={flight} loading={loading} error={error} />
    </div>
  );
}
