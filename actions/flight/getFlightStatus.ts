/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import { lookupFlight, lookupFlightSingle } from "@/lib/flight/lookupFlight";
import type { FlightData } from "@/lib/flight/lookupFlight";

export type FlightStatusResponse =
  | {
      ok: true;
      flight: {
        flightNumber: string;
        status: string;
        airline: { name: string | null; iata: string | null };
        departure: {
          airport: { iata: string | null; name: string | null };
          scheduledTime: string | null;
          estimatedTime: string | null;
          actualTime: string | null;
          terminal: string | null;
          gate: string | null;
        };
        arrival: {
          airport: { iata: string | null; name: string | null };
          scheduledTime: string | null;
          estimatedTime: string | null;
          actualTime: string | null;
          terminal: string | null;
          gate: string | null;
        };
        departureDelayMinutes: number | null;
        arrivalDelayMinutes: number | null;
      };
    }
  | { ok: false; error: string };

/**
 * Check if a flight number looks valid (2-letter airline code + 1-4 digit number)
 */
function isValidFlightNumberFormat(flightNumber: string): boolean {
  // Valid formats: AA1234, AA123, AA12, AA1, UAL1234, etc.
  // Must start with 2-3 letters followed by 1-4 digits
  const pattern = /^[A-Z]{2,3}\d{1,4}$/i;
  return pattern.test(flightNumber.trim());
}

/**
 * Fetch flight status for a single flight.
 * Called from client components via server action.
 *
 * @param flightNumber - e.g. "AA1234"
 * @param date - YYYY-MM-DD format
 */
export async function getFlightStatus(
  flightNumber: string,
  date: string,
): Promise<FlightStatusResponse> {
  if (!flightNumber?.trim()) {
    return { ok: false, error: "Please enter a flight number." };
  }
  if (!date?.trim()) {
    return { ok: false, error: "Please enter a date." };
  }

  const cleanFlightNumber = flightNumber.trim().toUpperCase();

  // Validate flight number format before making API call
  if (!isValidFlightNumberFormat(cleanFlightNumber)) {
    return {
      ok: false,
      error:
        "Invalid flight number. Please enter a valid flight number (e.g., AA1234).",
    };
  }

  try {
    const result = await lookupFlightSingle(cleanFlightNumber, date.trim());

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const f = result.flight;

    return {
      ok: true,
      flight: {
        flightNumber: f.flightNumber,
        status: f.status,
        airline: f.airline,
        departure: {
          airport: f.departure.airport,
          scheduledTime: f.departure.scheduledTime,
          estimatedTime: f.departure.estimatedTime,
          actualTime: f.departure.actualTime,
          terminal: f.departure.terminal,
          gate: f.departure.gate,
        },
        arrival: {
          airport: f.arrival.airport,
          scheduledTime: f.arrival.scheduledTime,
          estimatedTime: f.arrival.estimatedTime,
          actualTime: f.arrival.actualTime,
          terminal: f.arrival.terminal,
          gate: f.arrival.gate,
        },
        departureDelayMinutes: f.departureDelayMinutes,
        arrivalDelayMinutes: f.arrivalDelayMinutes,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("getFlightStatus error:", message);

    // Handle specific error types with user-friendly messages
    if (message.includes("JSON") || message.includes("Unexpected")) {
      return {
        ok: false,
        error:
          "Flight not found. Please check the flight number and try again.",
      };
    }

    return {
      ok: false,
      error: "Flight not found. Please check the flight number and date.",
    };
  }
}

/**
 * Quick lookup to auto-fill booking wizard fields.
 * Returns just the fields needed for the form.
 *
 * @param flightNumber - e.g. "AA1234"
 * @param date - YYYY-MM-DD format
 * @param airportLeg - "PICKUP" means customer is arriving (use arrival data),
 *                     "DROPOFF" means customer is departing (use departure data)
 */
export async function lookupFlightForBooking(
  flightNumber: string,
  date: string,
  airportLeg: "PICKUP" | "DROPOFF" = "PICKUP",
): Promise<{
  ok: boolean;
  error?: string;
  airline?: string;
  terminal?: string;
  gate?: string;
  scheduledTime?: string; // ISO string
  departureAirport?: string;
  arrivalAirport?: string;
  status?: string;
  legType?: "arrival" | "departure";
}> {
  if (!flightNumber?.trim() || !date?.trim()) {
    return { ok: false, error: "Flight number and date are required." };
  }

  const cleanFlightNumber = flightNumber.trim().toUpperCase();

  // Validate flight number format before making API call
  if (!isValidFlightNumberFormat(cleanFlightNumber)) {
    return {
      ok: false,
      error: "Invalid flight number. Please use format like AA1234.",
    };
  }

  try {
    const result = await lookupFlightSingle(cleanFlightNumber, date.trim());

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const f = result.flight;

    // PICKUP = driver picks up customer at airport → customer is ARRIVING → use arrival leg
    // DROPOFF = driver drops customer at airport → customer is DEPARTING → use departure leg
    const isArrival = airportLeg === "PICKUP";
    const relevantLeg = isArrival ? f.arrival : f.departure;

    return {
      ok: true,
      airline: f.airline.name ?? undefined,
      terminal: relevantLeg.terminal ?? undefined,
      gate: relevantLeg.gate ?? undefined,
      scheduledTime: relevantLeg.scheduledTime ?? undefined,
      departureAirport: f.departure.airport.iata ?? undefined,
      arrivalAirport: f.arrival.airport.iata ?? undefined,
      status: f.status,
      legType: isArrival ? "arrival" : "departure",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("lookupFlightForBooking error:", message);

    // Handle specific error types with user-friendly messages
    if (message.includes("JSON") || message.includes("Unexpected")) {
      return {
        ok: false,
        error:
          "Flight not found. Please check the flight number and try again.",
      };
    }

    return {
      ok: false,
      error: "Flight not found. Please check the flight number and date.",
    };
  }
}
