"use client";

import { useState, useCallback, useEffect } from "react";
import { lookupFlightForBooking } from "../../../../actions/flight/getFlightStatus";
import toast from "react-hot-toast";
import styles from "./FlightLookupInput.module.css";
import Button from "@/components/shared/Button/Button";

type Props = {
  flightNumber: string;
  flightDate: string;
  airportLeg: "PICKUP" | "DROPOFF";
  airportIata?: string | null;
  onFlightFound: (data: {
    airline?: string;
    terminal?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    status?: string;
  }) => void;
  onFlightNumberChange: (value: string) => void;
};

function formatFlightTime(date?: string, time?: string): string | null {
  if (!date) return null;
  try {
    const [year, month, day] = date.split("-");
    const shortYear = year.slice(2);
    const datePart = `${month}/${day}/${shortYear}`;

    if (!time) return datePart;

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
  airportIata,
  onFlightFound,
  onFlightNumberChange,
}: Props) {
  const [looking, setLooking] = useState(false);
  const [lastLookedUp, setLastLookedUp] = useState("");
  const [foundMessage, setFoundMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    setFoundMessage(null);
    setErrorMessage(null);
    setWarningMessage(null);
    setLastLookedUp("");
  }, [airportLeg, airportIata]);

  const doLookup = useCallback(async () => {
    const clean = flightNumber.replace(/\s+/g, "").toUpperCase();

    if (!clean || clean.length < 3) {
      toast.error(
        "Please enter a valid flight number (at least 3 characters).",
      );
      return;
    }
    if (!flightDate) {
      toast.error(
        "Please select a pickup date first so we can look up the flight.",
      );
      return;
    }
    if (clean === lastLookedUp) {
      // Already looked up - just return silently (data is already displayed)
      return;
    }

    setLooking(true);
    setFoundMessage(null);
    setErrorMessage(null);
    setWarningMessage(null);

    try {
      const result = await lookupFlightForBooking(
        clean,
        flightDate,
        airportLeg,
      );

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

        const selectedIata = airportIata?.toUpperCase().trim();
        let mismatch = false;

        if (selectedIata) {
          if (airportLeg === "PICKUP") {
            const flightArrival = result.arrivalAirport?.toUpperCase().trim();
            if (flightArrival && flightArrival !== selectedIata) {
              mismatch = true;
              setWarningMessage(
                `This flight arrives at ${flightArrival}, not ${selectedIata}. This looks like a departing flight — did you enter the correct flight number?`,
              );
            }
          } else {
            const flightDeparture = result.departureAirport
              ?.toUpperCase()
              .trim();
            if (flightDeparture && flightDeparture !== selectedIata) {
              mismatch = true;
              setWarningMessage(
                `This flight departs from ${flightDeparture}, not ${selectedIata}. This looks like an arriving flight — did you enter the correct flight number?`,
              );
            }
          }
        }

        const arrOrDep = airportLeg === "PICKUP" ? "Arriving" : "Departing";
        const formattedTime = formatFlightTime(scheduledDate, scheduledTime);
        const terminalPart = result.terminal
          ? ` · Terminal ${result.terminal}`
          : "";

        if (result.status === "Cancelled") {
          setErrorMessage(`⚠️ Flight ${clean} is CANCELLED`);
        } else if (result.status === "Delayed") {
          const delayMsg = formattedTime
            ? `⚠️ Flight ${clean} is delayed — ${arrOrDep} ${formattedTime}${terminalPart}`
            : `⚠️ Flight ${clean} is delayed`;
          setErrorMessage(delayMsg);
        } else if (!mismatch) {
          const successMsg = formattedTime
            ? `Flight found! ${arrOrDep} ${formattedTime}${terminalPart}`
            : `Flight ${clean} found!`;
          setFoundMessage(successMsg);
        }
      } else {
        setErrorMessage(result.error ?? "Flight not found");
      }
    } catch (err) {
      console.error("Flight lookup error:", err);
      setErrorMessage(
        "Could not look up flight. Please enter details manually.",
      );
    } finally {
      setLooking(false);
    }
  }, [
    flightNumber,
    flightDate,
    lastLookedUp,
    airportLeg,
    airportIata,
    onFlightFound,
  ]);

  const handleLookupClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    doLookup();
  };

  return (
    <div className={styles.container}>
      <label className='cardTitle h5'>Flight Number</label>
      <div className={styles.inputWrapper}>
        <input
          type='text'
          value={flightNumber}
          onChange={(e) => {
            onFlightNumberChange(e.target.value.toUpperCase());
            setFoundMessage(null);
            setErrorMessage(null);
            setWarningMessage(null);
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
          className={`input emptySmall ${styles.flightInput}`}
        />

        <Button
          btnType='blackReg'
          text={looking ? "Looking up..." : "Look up"}
          onClick={handleLookupClick}
          disabled={looking || !flightNumber.trim() || !flightDate}
        />
      </div>

      {warningMessage && (
        <div className={styles.warningMessage}>⚠️ {warningMessage}</div>
      )}

      {foundMessage && (
        <div className={styles.successMessage}>✅ {foundMessage}</div>
      )}

      {errorMessage && (
        <div className={styles.errorMessage}>{errorMessage}</div>
      )}

      {!foundMessage && !errorMessage && !warningMessage && (
        <div className={styles.helperText}>
          Enter your flight number and{" "}
          {flightDate
            ? "press Look up or tab out to auto-fill flight details."
            : "select a pickup date first."}
        </div>
      )}
    </div>
  );
}
