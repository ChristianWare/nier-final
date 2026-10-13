// src/lib/invoice/invoiceAddress.ts
// Shared rules for the addresses printed on admin invoices: the sender
// ("from") address under the company name, and the optional BILL TO address.
// Addresses are stored as plain text, one line per line.

export const ADDRESS_MAX_LINES = 4;
export const ADDRESS_MAX_CHARS = 300;

/** The Company Settings office address as invoice lines. */
export function defaultFromAddress(settings: {
  officeAddress?: string | null;
  officeCity?: string | null;
}): string {
  return [settings.officeAddress, settings.officeCity]
    .map((l) => (l ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

/** Split stored address text into display lines. */
export function addressLines(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Tidy typed address text: trim each line, drop blank lines.
 * Returns null when empty, or an error when it's too long to fit the PDF.
 */
export function cleanAddress(
  raw: string | null | undefined,
): { value: string | null } | { error: string } {
  const lines = addressLines(raw);
  if (lines.length === 0) return { value: null };
  if (lines.length > ADDRESS_MAX_LINES) {
    return { error: `Addresses can be at most ${ADDRESS_MAX_LINES} lines.` };
  }
  const value = lines.join("\n");
  if (value.length > ADDRESS_MAX_CHARS) {
    return { error: "That address is too long." };
  }
  return { value };
}

export type FromAddressMode = "default" | "custom";

/**
 * Work out what to save for the sender address.
 * "default" saves a copy of the current Company Settings address.
 */
export function resolveFromAddress(
  mode: FromAddressMode,
  customText: string | null | undefined,
  settings: { officeAddress?: string | null; officeCity?: string | null },
): { fromAddress: string | null; fromAddressCustom: boolean } | { error: string } {
  if (mode === "custom") {
    const cleaned = cleanAddress(customText);
    if ("error" in cleaned) return cleaned;
    if (!cleaned.value) {
      return { error: "Enter the address to show on the invoice, or use the default." };
    }
    return { fromAddress: cleaned.value, fromAddressCustom: true };
  }
  return {
    fromAddress: defaultFromAddress(settings) || null,
    fromAddressCustom: false,
  };
}
