// src/lib/invoice/types.ts

export type InvoiceLineItem = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
};

export type InvoiceData = {
  // Invoice identifiers
  invoiceNumber: string;
  invoiceDate: string;
  paidDate: string | null;

  // Company info (from company settings)
  company: {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
  };

  // Customer info
  customer: {
    name: string;
    email: string;
    phone: string | null;
  };

  // Trip details
  trip: {
    date: string;
    pickupAddress: string;
    dropoffAddress: string;
    stops: Array<{
      address: string;
      stopOrder: number;
    }>;
    serviceName: string;
    vehicleName: string;
    passengers: number;
    luggage: number;
    distanceMiles: number | null;
    durationMinutes: number | null;
  };

  // Line items
  lineItems: InvoiceLineItem[];

  // Totals
  subtotalCents: number;
  feesCents: number;
  taxesCents: number;
  totalCents: number;
  tipCents: number;
  amountPaidCents: number;
  amountRefundedCents: number;

  // Currency
  currency: string;

  // ─── Corporate-specific fields (optional) ───
  // These are only populated for corporate invoices.
  // Regular customer invoices leave them undefined.

  /** e.g. "Card on File (Visa ····4242)" or "Invoice / Check" */
  paymentMethod?: string;

  /** e.g. "Due on Receipt", "Net 30" */
  paymentTerms?: string;

  /** Formatted due date string */
  dueDate?: string;

  /** Invoice status: "PAID", "SENT", "OVERDUE", "DRAFT" */
  invoiceStatus?: string;

  /** Corporate PO number for AP departments */
  poNumber?: string;

  /** Driver who completed the trip */
  driverName?: string;

  /** Booking confirmation code e.g. "CMLFV6RJ" */
  bookingConfirmation?: string;

  /** Corporate account name (if different from customer name) */
  corporateAccountName?: string;
};

export function formatMoney(
  cents: number | null | undefined,
  currency = "USD",
): string {
  if (cents == null) return "—";
  const n = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatInvoiceDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatTripDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}