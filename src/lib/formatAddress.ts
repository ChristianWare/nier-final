/**
 * Splits a one-line address into the lines you'd write on an envelope:
 *
 *   "Red Rock Casino Resort & Spa, 11011 W Charleston Blvd, Las Vegas, NV 89135"
 *   → ["Red Rock Casino Resort & Spa", "11011 W Charleston Blvd", "Las Vegas, NV 89135"]
 *
 * The place name is everything before the first part that starts with a
 * number (the street); the last line is the city with the state and ZIP.
 * A trailing "USA" is dropped. Addresses that don't fit the pattern come
 * back as one line, unchanged.
 */
export function formatAddressLines(
  address: string | null | undefined,
): string[] {
  if (!address) return [];
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  while (
    parts.length &&
    /^(usa|us|united states( of america)?)$/i.test(parts[parts.length - 1])
  ) {
    parts.pop();
  }

  // "NV 89135", "NV", "NV 89135-1234"
  const stateIdx = parts.length - 1;
  const isStateZip = /^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/.test(
    parts[stateIdx] ?? "",
  );
  if (!isStateZip || stateIdx < 1) return [address.trim()];

  const cityLine = `${parts[stateIdx - 1]}, ${parts[stateIdx]}`;
  const rest = parts.slice(0, stateIdx - 1);
  if (rest.length === 0) return [cityLine];

  const streetIdx = rest.findIndex((p) => /^\d/.test(p));
  const lines: string[] = [];
  if (streetIdx > 0) {
    lines.push(rest.slice(0, streetIdx).join(", "));
    lines.push(rest.slice(streetIdx).join(", "));
  } else {
    lines.push(rest.join(", "));
  }
  lines.push(cityLine);
  return lines;
}
