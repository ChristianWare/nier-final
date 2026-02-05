/**
 * Major airlines list with IATA codes.
 * Used by AirlineSelect dropdown in the booking wizard.
 *
 * Sorted alphabetically by name.
 * Covers major US carriers, international carriers that fly to/from the US,
 * and popular regional/budget airlines.
 */

export type Airline = {
  /** IATA two-letter code, e.g. "AA" */
  iata: string;
  /** Full airline name */
  name: string;
};

export const AIRLINES: Airline[] = [
  { iata: "AC", name: "Air Canada" },
  { iata: "CA", name: "Air China" },
  { iata: "AF", name: "Air France" },
  { iata: "AI", name: "Air India" },
  { iata: "NZ", name: "Air New Zealand" },
  { iata: "AS", name: "Alaska Airlines" },
  { iata: "G4", name: "Allegiant Air" },
  { iata: "AA", name: "American Airlines" },
  { iata: "NH", name: "ANA (All Nippon Airways)" },
  { iata: "OZ", name: "Asiana Airlines" },
  { iata: "OS", name: "Austrian Airlines" },
  { iata: "AV", name: "Avianca" },
  { iata: "BA", name: "British Airways" },
  { iata: "CX", name: "Cathay Pacific" },
  { iata: "CI", name: "China Airlines" },
  { iata: "MU", name: "China Eastern Airlines" },
  { iata: "CZ", name: "China Southern Airlines" },
  { iata: "CM", name: "Copa Airlines" },
  { iata: "DL", name: "Delta Air Lines" },
  { iata: "EK", name: "Emirates" },
  { iata: "ET", name: "Ethiopian Airlines" },
  { iata: "EY", name: "Etihad Airways" },
  { iata: "BR", name: "EVA Air" },
  { iata: "AY", name: "Finnair" },
  { iata: "F9", name: "Frontier Airlines" },
  { iata: "B6", name: "JetBlue Airways" },
  { iata: "HA", name: "Hawaiian Airlines" },
  { iata: "IB", name: "Iberia" },
  { iata: "FI", name: "Icelandair" },
  { iata: "4O", name: "Interjet" },
  { iata: "JL", name: "Japan Airlines (JAL)" },
  { iata: "9W", name: "Jet Airways" },
  { iata: "KE", name: "Korean Air" },
  { iata: "KL", name: "KLM Royal Dutch Airlines" },
  { iata: "LA", name: "LATAM Airlines" },
  { iata: "LH", name: "Lufthansa" },
  { iata: "MH", name: "Malaysia Airlines" },
  { iata: "XJ", name: "Mesaba Airlines" },
  { iata: "AM", name: "Aeromexico" },
  { iata: "NK", name: "Spirit Airlines" },
  { iata: "SY", name: "Sun Country Airlines" },
  { iata: "SQ", name: "Singapore Airlines" },
  { iata: "SA", name: "South African Airways" },
  { iata: "WN", name: "Southwest Airlines" },
  { iata: "LX", name: "Swiss International Air Lines" },
  { iata: "SK", name: "Scandinavian Airlines (SAS)" },
  { iata: "QR", name: "Qatar Airways" },
  { iata: "QF", name: "Qantas" },
  { iata: "AT", name: "Royal Air Maroc" },
  { iata: "RJ", name: "Royal Jordanian" },
  { iata: "SV", name: "Saudia" },
  { iata: "SC", name: "Shandong Airlines" },
  { iata: "3M", name: "Silver Airways" },
  { iata: "SN", name: "Brussels Airlines" },
  { iata: "TP", name: "TAP Air Portugal" },
  { iata: "TK", name: "Turkish Airlines" },
  { iata: "UA", name: "United Airlines" },
  { iata: "VX", name: "Virgin America" },
  { iata: "VS", name: "Virgin Atlantic" },
  { iata: "VA", name: "Virgin Australia" },
  { iata: "VB", name: "VivaAerobus" },
  { iata: "Y4", name: "Volaris" },
  { iata: "WS", name: "WestJet" },
  { iata: "MF", name: "Xiamen Airlines" },
].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Find airline by IATA code.
 */
export function findAirlineByIata(iata: string): Airline | undefined {
  const upper = iata.toUpperCase();
  return AIRLINES.find((a) => a.iata === upper);
}

/**
 * Find airline by name (case-insensitive partial match).
 */
export function findAirlineByName(name: string): Airline | undefined {
  const lower = name.toLowerCase();
  return AIRLINES.find((a) => a.name.toLowerCase() === lower);
}

/**
 * Extract the IATA prefix from a flight number string.
 * e.g. "AA1234" → "AA", "DL47" → "DL", "1234" → null
 */
export function extractIataFromFlightNumber(
  flightNumber: string,
): string | null {
  const match = flightNumber
    .replace(/\s+/g, "")
    .toUpperCase()
    .match(/^([A-Z]{2})\d/);
  return match ? match[1] : null;
}
