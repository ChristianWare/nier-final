/**
 * AeroDataBox Flight Lookup via RapidAPI
 *
 * Fetches real-time flight status by flight number + date.
 * Uses Tier 2 endpoint = 2 API units per call.
 *
 * Env vars required:
 *   RAPIDAPI_KEY  – your RapidAPI key
 *   RAPIDAPI_HOST – "aerodatabox.p.rapidapi.com"
 */

export type FlightStatus =
  | "Unknown"
  | "Expected"
  | "Departed"
  | "EnRoute"
  | "Landed"
  | "Arrived"
  | "Cancelled"
  | "Diverted"
  | "Delayed";

export type FlightLeg = {
  airport: {
    iata: string | null;
    name: string | null;
  };
  scheduledTime: string | null;
  estimatedTime: string | null;
  actualTime: string | null;
  predictedTime: string | null;
  terminal: string | null;
  gate: string | null;
  quality: string[];
};

export type FlightData = {
  flightNumber: string;
  callSign: string | null;
  status: FlightStatus;
  airline: {
    name: string | null;
    iata: string | null;
  };
  departure: FlightLeg;
  arrival: FlightLeg;
  /** Delay in minutes (positive = late, negative = early, null = unknown) */
  departureDelayMinutes: number | null;
  arrivalDelayMinutes: number | null;
  /** Raw API response for debugging */
  _raw?: unknown;
};

export type FlightLookupResult =
  | { ok: true; flights: FlightData[] }
  | { ok: false; error: string; statusCode?: number };

// ─── Helpers ────────────────────────────────────────────────

function parseDelayMinutes(
  scheduled: string | null | undefined,
  actual: string | null | undefined,
): number | null {
  if (!scheduled || !actual) return null;
  try {
    const s = new Date(scheduled).getTime();
    const a = new Date(actual).getTime();
    if (isNaN(s) || isNaN(a)) return null;
    return Math.round((a - s) / 60_000);
  } catch {
    return null;
  }
}

function mapStatus(raw: string | undefined | null): FlightStatus {
  if (!raw) return "Unknown";
  const lower = raw.toLowerCase();
  if (lower.includes("cancelled") || lower.includes("canceled"))
    return "Cancelled";
  if (lower.includes("diverted")) return "Diverted";
  if (lower.includes("landed") || lower.includes("arrived")) return "Landed";
  if (lower.includes("enroute") || lower.includes("en route")) return "EnRoute";
  if (lower.includes("departed") || lower.includes("airborne"))
    return "Departed";
  if (lower.includes("expected") || lower.includes("scheduled"))
    return "Expected";
  if (lower.includes("delayed")) return "Delayed";
  if (lower === "unknown") return "Unknown";
  return "Unknown";
}

function parseLeg(raw: Record<string, unknown> | null | undefined): FlightLeg {
  if (!raw)
    return {
      airport: { iata: null, name: null },
      scheduledTime: null,
      estimatedTime: null,
      actualTime: null,
      predictedTime: null,
      terminal: null,
      gate: null,
      quality: [],
    };

  const airport = raw.airport as Record<string, unknown> | undefined;

  return {
    airport: {
      iata: (airport?.iata as string) ?? null,
      name: (airport?.name as string) ?? null,
    },
    scheduledTime:
      ((raw.scheduledTime as Record<string, unknown>)?.local as string) ??
      ((raw.scheduledTime as Record<string, unknown>)?.utc as string) ??
      (raw.scheduledTimeLocal as string) ??
      (raw.scheduledTimeUtc as string) ??
      null,
    estimatedTime:
      ((raw.revisedTime as Record<string, unknown>)?.local as string) ??
      ((raw.estimatedTime as Record<string, unknown>)?.local as string) ??
      ((raw.estimatedTime as Record<string, unknown>)?.utc as string) ??
      (raw.estimatedTimeLocal as string) ??
      (raw.estimatedTimeUtc as string) ??
      null,
    actualTime:
      ((raw.actualTime as Record<string, unknown>)?.local as string) ??
      ((raw.actualTime as Record<string, unknown>)?.utc as string) ??
      (raw.actualTimeLocal as string) ??
      (raw.actualTimeUtc as string) ??
      null,
    predictedTime:
      ((raw.predictedTime as Record<string, unknown>)?.local as string) ??
      ((raw.predictedTime as Record<string, unknown>)?.utc as string) ??
      null,
    terminal: (raw.terminal as string) ?? null,
    gate: (raw.gate as string) ?? null,
    quality: Array.isArray(raw.quality) ? raw.quality.map(String) : [],
  };
}

// ─── Main lookup ────────────────────────────────────────────

/**
 * Look up a flight by number and date.
 *
 * @param flightNumber - IATA flight number, e.g. "AA1234" or "DL47"
 * @param date         - Date string in YYYY-MM-DD format
 * @returns Parsed flight data or an error
 */
export async function lookupFlight(
  flightNumber: string,
  date: string,
): Promise<FlightLookupResult> {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST ?? "aerodatabox.p.rapidapi.com";

  if (!apiKey) {
    return { ok: false, error: "RAPIDAPI_KEY is not configured." };
  }

  // Sanitize flight number: remove spaces, ensure uppercase
  const cleanFlight = flightNumber.replace(/\s+/g, "").toUpperCase();

  if (!cleanFlight || cleanFlight.length < 3) {
    return {
      ok: false,
      error: "Invalid flight number. Use format like AA1234.",
    };
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Invalid date format. Use YYYY-MM-DD." };
  }

  const url = `https://${apiHost}/flights/number/${encodeURIComponent(cleanFlight)}/${date}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": apiHost,
      },
      // Cache for 5 minutes to reduce API calls
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          ok: false,
          error: `No flights found for ${cleanFlight} on ${date}.`,
          statusCode: 404,
        };
      }
      if (res.status === 429) {
        return {
          ok: false,
          error:
            "Flight tracking API rate limit reached. Please try again in a moment.",
          statusCode: 429,
        };
      }
      if (res.status === 402) {
        return {
          ok: false,
          error: "Flight tracking API quota exceeded for this month.",
          statusCode: 402,
        };
      }
      return {
        ok: false,
        error: `Flight API returned status ${res.status}.`,
        statusCode: res.status,
      };
    }

    const body = await res.json();

    // AeroDataBox returns an array of flight objects
    const rawFlights: Record<string, unknown>[] = Array.isArray(body)
      ? body
      : [];

    if (rawFlights.length === 0) {
      return {
        ok: false,
        error: `No flights found for ${cleanFlight} on ${date}.`,
      };
    }

    const flights: FlightData[] = rawFlights.map((raw) => {
      const departure = parseLeg(
        raw.departure as Record<string, unknown> | undefined,
      );
      const arrival = parseLeg(
        raw.arrival as Record<string, unknown> | undefined,
      );
      const airline = raw.airline as Record<string, unknown> | undefined;

      // Try to extract status
      const rawStatus = (raw.status as string) ?? null;

      // Calculate delays
      const depDelay = parseDelayMinutes(
        departure.scheduledTime,
        departure.actualTime ??
          departure.estimatedTime ??
          departure.predictedTime,
      );
      const arrDelay = parseDelayMinutes(
        arrival.scheduledTime,
        arrival.actualTime ?? arrival.estimatedTime ?? arrival.predictedTime,
      );

      return {
        flightNumber: (raw.number as string) ?? cleanFlight,
        callSign: (raw.callSign as string) ?? null,
        status: mapStatus(rawStatus),
        airline: {
          name: (airline?.name as string) ?? null,
          iata: (airline?.iata as string) ?? null,
        },
        departure,
        arrival,
        departureDelayMinutes: depDelay,
        arrivalDelayMinutes: arrDelay,
      };
    });

    return { ok: true, flights };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during flight lookup";
    return { ok: false, error: message };
  }
}

/**
 * Convenience: Look up a flight and return the best match (first result).
 */
export async function lookupFlightSingle(
  flightNumber: string,
  date: string,
): Promise<
  | { ok: true; flight: FlightData }
  | { ok: false; error: string; statusCode?: number }
> {
  const result = await lookupFlight(flightNumber, date);
  if (!result.ok) return result;
  if (result.flights.length === 0) {
    return {
      ok: false,
      error: `No flights found for ${flightNumber} on ${date}.`,
    };
  }
  return { ok: true, flight: result.flights[0] };
}
