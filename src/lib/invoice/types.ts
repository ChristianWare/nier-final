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

export function formatTripDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  }).format(date);
}
