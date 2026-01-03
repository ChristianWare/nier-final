export function dollarsToCents(input: FormDataEntryValue | null | undefined) {
  if (input === null || input === undefined) return 0;

  const raw = String(input).trim();
  if (!raw) return 0;

  // Allow "$55.00", "55.00", "1,234.56"
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = Number(cleaned);

  if (!Number.isFinite(n)) {
    throw new Error(`Invalid money value: "${raw}"`);
  }

  return Math.round(n * 100);
}

export function centsToDollars(cents: number | null | undefined) {
  const n = Number(cents ?? 0);
  return (n / 100).toFixed(2);
}
