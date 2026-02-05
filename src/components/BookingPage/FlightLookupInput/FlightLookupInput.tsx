"use client";

import { useState, useCallback } from "react";
import { lookupFlightForBooking } from "../../../../actions/flight/getFlightStatus";
import toast from "react-hot-toast";

type Props = {
  flightNumber: string;
  flightDate: string; // YYYY-MM-DD from pickupAtDate
  airportLeg: "PICKUP" | "DROPOFF";
  onFlightFound: (data: {
    airline?: string;
    terminal?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    status?: string;
  }) => void;
  onFlightNumberChange: (value: string) => void;
};

/**
 * Format a date + time into "MM/DD/YY @ h:mmAM/PM"
 */
function formatFlightTime(date?: string, time?: string): string | null {
  if (!date) return null;
  try {
    const [year, month, day] = date.split("-");
    const shortYear = year.slice(2); // "2026" → "26"
    const datePart = `${month}/${day}/${shortYear}`;

    if (!time) return datePart;

    // Parse "HH:mm" into 12-hour format
    const [hStr, mStr] = time.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr ?? "00";
    const ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;

    return `${datePart} @ ${h}:${m}${ampm}`;
  } catch {
    return date;
  }
}

export default function FlightLookupInput({
  flightNumber,
  flightDate,
  airportLeg,
  onFlightFound,
  onFlightNumberChange,
}: Props) {
  const [looking, setLooking] = useState(false);
  const [lastLookedUp, setLastLookedUp] = useState("");
  const [foundMessage, setFoundMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const doLookup = useCallback(async () => {
    const clean = flightNumber.replace(/\s+/g, "").toUpperCase();
    if (!clean || clean.length < 3) return;
    if (!flightDate) {
      toast.error(
        "Please select a pickup date first so we can look up the flight.",
      );
      return;
    }
    if (clean === lastLookedUp) return;

    setLooking(true);
    setFoundMessage(null);
    setErrorMessage(null);

    try {
      const result = await lookupFlightForBooking(clean, flightDate);

      if (result.ok) {
        console.log(
          "🛫 Flight lookup result:",
          JSON.stringify(result, null, 2),
        );

        let scheduledDate: string | undefined;
        let scheduledTime: string | undefined;

        if (result.scheduledTime) {
          const raw = result.scheduledTime.trim();
          if (raw.includes("T")) {
            scheduledDate = raw.split("T")[0];
            const timePart = raw.split("T")[1];
            scheduledTime = timePart?.substring(0, 5);
          } else if (raw.includes(" ") && raw.includes("-")) {
            const [datePart, rest] = raw.split(" ");
            scheduledDate = datePart;
            scheduledTime = rest?.substring(0, 5);
          } else if (raw.includes(":") && raw.length <= 5) {
            scheduledTime = raw;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            scheduledDate = raw;
          }
        }

        onFlightFound({
          airline: result.airline,
          terminal: result.terminal,
          scheduledDate,
          scheduledTime,
          status: result.status,
        });
        setLastLookedUp(clean);

        // Build the green confirmation message
        const arrOrDep = airportLeg === "PICKUP" ? "Arriving" : "Departing";
        const formattedTime = formatFlightTime(scheduledDate, scheduledTime);

        if (result.status === "Cancelled") {
          setErrorMessage(`⚠️ Flight ${clean} is CANCELLED`);
        } else if (result.status === "Delayed") {
          const delayMsg = formattedTime
            ? `⚠️ Flight ${clean} is delayed — ${arrOrDep} ${formattedTime}`
            : `⚠️ Flight ${clean} is delayed`;
          setErrorMessage(delayMsg);
        } else {
          const successMsg = formattedTime
            ? `Flight found! ${arrOrDep} ${formattedTime}`
            : `Flight ${clean} found!`;
          setFoundMessage(successMsg);
        }
      } else {
        setErrorMessage(result.error ?? "Flight not found");
      }
    } catch {
      setErrorMessage(
        "Could not look up flight. Please enter details manually.",
      );
    } finally {
      setLooking(false);
    }
  }, [flightNumber, flightDate, lastLookedUp, airportLeg, onFlightFound]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label className='cardTitle h5'>Flight Number</label>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          type='text'
          value={flightNumber}
          onChange={(e) => {
            onFlightNumberChange(e.target.value.toUpperCase());
            // Clear messages when user starts typing again
            setFoundMessage(null);
            setErrorMessage(null);
            setLastLookedUp("");
          }}
          onBlur={() => {
            if (flightNumber.replace(/\s+/g, "").length >= 3 && flightDate) {
              doLookup();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              doLookup();
            }
          }}
          placeholder='e.g., AA1234'
          className='input emptySmall'
          style={{ flex: 1 }}
        />
        <button
          type='button'
          onClick={doLookup}
          disabled={looking || !flightNumber.trim() || !flightDate}
          style={{
            padding: "0 14px",
            borderRadius: 7,
            border: "1px solid rgba(0,0,0,0.15)",
            background: looking ? "#f1f5f9" : "white",
            cursor: looking ? "not-allowed" : "pointer",
            fontSize: "1.2rem",
            fontWeight: 500,
            color: "#475569",
            whiteSpace: "nowrap",
            transition: "all 0.15s ease",
            opacity: !flightNumber.trim() || !flightDate ? 0.5 : 1,
          }}
        >
          {looking ? "Looking up..." : "🔍 Look up"}
        </button>
      </div>

      {/* Status messages */}
      {foundMessage && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#16a34a",
            marginTop: 2,
          }}
        >
          ✅ {foundMessage}
        </div>
      )}
      {errorMessage && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#dc2626",
            marginTop: 2,
          }}
        >
          {errorMessage}
        </div>
      )}
      {!foundMessage && !errorMessage && (
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          Enter your flight number and{" "}
          {flightDate
            ? "press Look up or tab out to auto-fill flight details."
            : "select a pickup date first."}
        </div>
      )}
    </div>
  );
}
