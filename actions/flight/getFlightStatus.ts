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

  const result = await lookupFlightSingle(flightNumber.trim(), date.trim());

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
}

/**
 * Quick lookup to auto-fill booking wizard fields.
 * Returns just the fields needed for the form.
 */
export async function lookupFlightForBooking(
  flightNumber: string,
  date: string,
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
}> {
  if (!flightNumber?.trim() || !date?.trim()) {
    return { ok: false, error: "Flight number and date are required." };
  }

  const result = await lookupFlightSingle(flightNumber.trim(), date.trim());

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const f = result.flight;

  return {
    ok: true,
    airline: f.airline.name ?? undefined,
    terminal: f.arrival.terminal ?? f.departure.terminal ?? undefined,
    gate: f.arrival.gate ?? f.departure.gate ?? undefined,
    scheduledTime:
      f.arrival.scheduledTime ?? f.departure.scheduledTime ?? undefined,
    departureAirport: f.departure.airport.iata ?? undefined,
    arrivalAirport: f.arrival.airport.iata ?? undefined,
    status: f.status,
  };
}
