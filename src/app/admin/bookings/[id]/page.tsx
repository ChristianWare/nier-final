/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/admin/bookings/[id]/page.tsx
import styles from "./AdminBookingDetailPage.module.css";
import { getStripePublishableKey } from "@/lib/stripe";
import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import PriceForm from "@/components/admin/Priceform/Priceform";
import AssignBookingForm from "@/components/admin/AssignBookingForm/AssignBookingForm";
import SendPaymentLinkButton from "@/components/admin/SendPaymentLinkButton/SendPaymentLinkButton";
import { BookingStatus, Role } from "@prisma/client";
import Link from "next/link";
import DeleteBookingDangerZoneClient from "./DeleteBookingDangerZoneClient";
import AdminManualCardPaymentClient from "./AdminManualCardPaymentClient";
import AdminChargeCardOnFileButton from "@/components/admin/AdminChargeCardOnFileButton/AdminChargeCardOnFileButton";
import QuickActionsClient from "./QuickActionsClient";
import BookingNotesClient from "./BookingNotesClient";
import EditTripDetailsClient, { PricingData } from "./EditTripDetailsClient";
import DuplicateBookingClient from "./DuplicateBookingClient";
import RouteMapDisplay from "@/components/admin/RouteMapDisplay/RouteMapDisplay";
import RefundButton from "@/components/admin/RefundButton/RefundButton";
import ApprovalToggleClient from "./ApprovalToggleClient";
import BookingCompletionChecklist from "@/components/admin/BookingCompletionChecklist/BookingCompletionChecklist";
import FlightStatusCard from "@/components/admin/FlightStatusCard/FlightStatusCard";
import ApproveRouteClient from "./ApproveRouteClient";
import ApprovePriceClient from "./ApprovePriceClient";
import DriverPayForm from "@/components/admin/DriverPayForm/DriverPayForm";
import InvoiceSection from "@/app/dashboard/trips/[id]/InvoiceSection";
import { getCorporateInvoiceData } from "../../../../../actions/corporate/getCorporateInvoiceData";
import type { InvoiceData, InvoiceLineItem } from "@/lib/invoice/types";
import { formatInvoiceDate, formatTripDateTime } from "@/lib/invoice/types";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";
import { getTripGroupForBooking } from "@/lib/tripGroup/getTripGroupForBooking";
import TripGroupCard from "@/components/admin/TripGroupCard/TripGroupCard";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import Image from "next/image";
import { BookingEditProvider } from "./BookingEditContext"; // named: { BookingEditProvider }
import BoxRightDateDisplay from "./BoxRightDateDisplay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IndicatorStatus = "complete" | "warning" | "neutral";

function CardIndicator({ status }: { status: IndicatorStatus }) {
  const colors = {
    complete: { bg: "#22c55e", icon: "✓" },
    warning: { bg: "#f59e0b", icon: "!" },
    neutral: { bg: "#94a3b8", icon: "○" },
  };
  const { bg, icon } = colors[status];
  return (
    <div
      style={{
        position: "absolute",
        top: -8,
        left: -8,
        width: 24,
        height: 24,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        zIndex: 10,
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.15)",
        background: bg,
        color: "white",
      }}
    >
      {icon}
    </div>
  );
}

// --- shared-ish label helpers ---
function statusLabel(status: BookingStatus) {
  switch (status) {
    case "PENDING_REVIEW":
      return "Pending review";
    case "DECLINED":
      return "Declined";
    case "PENDING_PAYMENT":
      return "Approved (awaiting payment)";
    case "CONFIRMED":
      return "Confirmed";
    case "ASSIGNED":
      return "Driver assigned";
    case "EN_ROUTE":
      return "Driver en route";
    case "ARRIVED":
      return "Driver arrived";
    case "IN_PROGRESS":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-show";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    case "DRAFT":
      return "Draft";
    default:
      return status;
  }
}

type BadgeTone = "neutral" | "warn" | "good" | "accent" | "bad";

function badgeTone(status: BookingStatus): BadgeTone {
  if (status === "PENDING_PAYMENT") return "good";
  if (status === "PENDING_REVIEW" || status === "DRAFT") return "neutral";
  if (status === "DECLINED") return "bad";
  if (status === "CONFIRMED" || status === "ASSIGNED") return "good";
  if (status === "EN_ROUTE" || status === "ARRIVED" || status === "IN_PROGRESS")
    return "accent";
  if (status === "CANCELLED" || status === "NO_SHOW") return "bad";
  if (status === "COMPLETED") return "good";
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED")
    return "neutral";
  return "neutral";
}

function formatDateTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(d);
}

function formatDateTimeLocal(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  let hr = get("hour");
  if (hr === "24") hr = "00";
  return `${get("year")}-${get("month")}-${get("day")}T${hr}:${get("minute")}`;
}

function fmtPersonLine(p: { name: string | null; email: string }) {
  const n = (p.name ?? "").trim();
  return n ? `${n} (${p.email})` : p.email;
}

function formatMoney(cents: number | null | undefined, currency = "USD") {
  if (cents == null) return "—";
  const n = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const d =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length !== 10) return raw;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function getEventActorLabel(
  actor: { name: string | null; email: string; roles: Role[] } | null,
  status: string,
): string {
  if (status === "CONFIRMED" && !actor) {
    return "System (payment received)";
  }

  if (!actor) {
    return "System";
  }

  const isAdmin = actor.roles?.includes(Role.ADMIN);
  const isDriver = actor.roles?.includes(Role.DRIVER);
  const name = actor.name?.trim() || actor.email;

  if (isAdmin) {
    return `Admin: ${name}`;
  }

  if (isDriver) {
    return `Driver: ${name}`;
  }

  return `User: ${name}`;
}

// Helper to format event details from metadata
function getEventDetails(
  eventType: string,
  metadata: Record<string, any> | null,
  currency: string,
): string | null {
  if (!metadata) return null;

  switch (eventType) {
    case "PAYMENT_RECEIVED": {
      const amount = formatMoney(metadata.amountCents, currency);
      const tip = metadata.tipCents
        ? formatMoney(metadata.tipCents, currency)
        : null;
      if (tip && metadata.tipCents > 0) {
        return `Amount: ${amount} (includes ${tip} tip)`;
      }
      return `Amount: ${amount}`;
    }

    case "PAYMENT_LINK_SENT": {
      const amount = formatMoney(metadata.amountCents, currency);
      const email = metadata.recipientEmail;
      return `${amount} → ${email}`;
    }

    case "DRIVER_ASSIGNED": {
      const driverName = metadata.driverName ?? "Driver";
      const driverPayment = metadata.driverPaymentCents
        ? ` • Pay: ${formatMoney(metadata.driverPaymentCents, currency)}`
        : "";
      const vehicle = metadata.vehicleUnitName
        ? ` • Vehicle: ${metadata.vehicleUnitName}${metadata.vehicleUnitPlate ? ` (${metadata.vehicleUnitPlate})` : ""}`
        : "";
      return `${driverName}${driverPayment}${vehicle}`;
    }

    case "DRIVER_UNASSIGNED": {
      const driverName = metadata.previousDriverName ?? "Driver";
      const driverPayment = metadata.previousDriverPaymentCents
        ? ` • Pay was: ${formatMoney(metadata.previousDriverPaymentCents, currency)}`
        : "";
      const vehicle = metadata.previousVehicleUnitName
        ? ` • Vehicle: ${metadata.previousVehicleUnitName}${metadata.previousVehicleUnitPlate ? ` (${metadata.previousVehicleUnitPlate})` : ""}`
        : "";
      return `Removed: ${driverName}${driverPayment}${vehicle}`;
    }

    case "TRIP_EDITED": {
      const fields = metadata.fieldsEdited;
      if (Array.isArray(fields) && fields.length > 0) {
        return `Changed: ${fields.join(", ")}`;
      }
      return null;
    }

    case "PRICE_ADJUSTED": {
      const oldTotal = formatMoney(metadata.oldTotalCents, currency);
      const newTotal = formatMoney(metadata.newTotalCents, currency);
      const diff = metadata.newTotalCents - metadata.oldTotalCents;
      const diffStr =
        diff > 0
          ? `+${formatMoney(diff, currency)}`
          : formatMoney(diff, currency);
      return `${oldTotal} → ${newTotal} (${diffStr})`;
    }

    case "REFUND_ISSUED": {
      const amount = formatMoney(metadata.amountCents, currency);
      const remaining = formatMoney(metadata.remainingPaidCents, currency);
      return `Refunded: ${amount} • Remaining: ${remaining}`;
    }

    case "APPROVAL_CHANGED": {
      return metadata.approved
        ? `Status: ${metadata.previousStatus} → ${metadata.newStatus}`
        : `Reverted to: ${metadata.newStatus}`;
    }

    case "BOOKING_DECLINED": {
      return metadata.reason ? `Reason: ${metadata.reason}` : null;
    }

    case "STATUS_CHANGE": {
      if (metadata.action) {
        return metadata.action;
      }
      if (metadata.previousStatus && metadata.newStatus) {
        return `${metadata.previousStatus} → ${metadata.newStatus}`;
      }
      return null;
    }

    default:
      return null;
  }
}

// Updated payment status display with balance and refund handling
function getPaymentStatusDisplay(
  paymentStatus: string | null | undefined,
  totalCents: number,
  amountPaidCents: number,
  amountRefundedCents: number,
): {
  label: string;
  tone: BadgeTone;
  hasBalanceDue: boolean;
  balanceDueCents: number;
  hasRefundDue: boolean;
  refundDueCents: number;
} {
  const netPaidCents = amountPaidCents - amountRefundedCents;
  const balanceDueCents = totalCents - netPaidCents;
  const hasBalanceDue = netPaidCents > 0 && balanceDueCents > 0;
  const hasRefundDue = netPaidCents > totalCents;
  const refundDueCents = hasRefundDue ? netPaidCents - totalCents : 0;

  if (paymentStatus === "REFUNDED") {
    return {
      label: "Refunded",
      tone: "neutral",
      hasBalanceDue: false,
      balanceDueCents: 0,
      hasRefundDue: false,
      refundDueCents: 0,
    };
  }

  if (paymentStatus === "PARTIALLY_REFUNDED") {
    return {
      label: "Partially Refunded",
      tone: "neutral",
      hasBalanceDue,
      balanceDueCents: hasBalanceDue ? balanceDueCents : 0,
      hasRefundDue,
      refundDueCents,
    };
  }

  if (paymentStatus === "PAID") {
    if (hasRefundDue) {
      return {
        label: "Overpaid",
        tone: "warn",
        hasBalanceDue: false,
        balanceDueCents: 0,
        hasRefundDue: true,
        refundDueCents,
      };
    }
    if (hasBalanceDue) {
      return {
        label: "Partial Payment",
        tone: "warn",
        hasBalanceDue: true,
        balanceDueCents,
        hasRefundDue: false,
        refundDueCents: 0,
      };
    }
    return {
      label: "Paid",
      tone: "good",
      hasBalanceDue: false,
      balanceDueCents: 0,
      hasRefundDue: false,
      refundDueCents: 0,
    };
  }

  switch (paymentStatus) {
    case "PENDING":
      return {
        label: "Pending",
        tone: "warn",
        hasBalanceDue: false,
        balanceDueCents: 0,
        hasRefundDue: false,
        refundDueCents: 0,
      };
    case "FAILED":
      return {
        label: "Failed",
        tone: "bad",
        hasBalanceDue: false,
        balanceDueCents: 0,
        hasRefundDue: false,
        refundDueCents: 0,
      };
    case "NONE":
    default:
      return {
        label: "Not Paid",
        tone: "bad",
        hasBalanceDue: false,
        balanceDueCents: 0,
        hasRefundDue: false,
        refundDueCents: 0,
      };
  }
}

// Helper to safely convert Decimal to number
function decimalToNumber(val: any): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val.toNumber === "function") return val.toNumber();
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function getConfirmationCode(bookingId: string): string {
  return bookingId.slice(0, 8).toUpperCase();
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      user: true,
      serviceType: true,
      vehicle: true,
      payment: true,
      stops: {
        orderBy: { stopOrder: "asc" },
      },
      assignment: {
        include: {
          driver: {
            select: { id: true, name: true, email: true, image: true },
          },
          vehicleUnit: { select: { id: true, name: true, plate: true } },
        },
      },
      statusEvents: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, roles: true },
          },
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { name: true, email: true } },
        },
      },
      corporateAccount: {
        select: {
          id: true,
          name: true,
          billingCycle: true,
          paymentTerms: true,
          discountPercent: true,
        },
      },
      corporatePassenger: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          department: true,
        },
      },
      fees: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          label: true,
          amountCents: true,
        },
      },
    },
  });

  if (!booking) return notFound();

  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone;

  const tripGroupData = await getTripGroupForBooking(id);

  const isCorporateBooking = Boolean(booking.corporateAccountId);

  // ─── Corporate invoice lookup (via line item bookingId) ───
  let corporateInvoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalCents: number;
    amountPaidCents: number;
    dueDate: Date | null;
    paidAt: Date | null;
  } | null = null;

  if (isCorporateBooking) {
    const invoiceLineItem = await db.corporateInvoiceLineItem.findFirst({
      where: { bookingId: booking.id },
      select: { invoiceId: true },
    });
    if (invoiceLineItem) {
      corporateInvoice = await db.corporateInvoice.findUnique({
        where: { id: invoiceLineItem.invoiceId },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalCents: true,
          amountPaidCents: true,
          dueDate: true,
          paidAt: true,
        },
      });
    }
  }

  // Earliest status event for "created by"
  // Earliest status event for "created by"
  const createdEvent = await db.bookingStatusEvent.findFirst({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, roles: true },
      },
    },
  });

  // Get the month/year from the booking's pickup date
  const pickupMonth = booking.pickupAt.getMonth();
  const pickupYear = booking.pickupAt.getFullYear();

  const monthStart = new Date(pickupYear, pickupMonth, 1);
  const monthEnd = new Date(pickupYear, pickupMonth + 1, 0, 23, 59, 59, 999);

  // Fetch drivers with their ride count for the booking's month
  const driversRaw = await db.user.findMany({
    where: { roles: { has: "DRIVER" } },
    select: {
      id: true,
      name: true,
      email: true,
      driverAssignments: {
        where: {
          booking: {
            pickupAt: {
              gte: monthStart,
              lte: monthEnd,
            },
            status: {
              notIn: ["CANCELLED", "NO_SHOW", "DECLINED", "DRAFT"],
            },
          },
        },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
    take: 300,
  });

  const monthLabel = `${String(pickupMonth + 1).padStart(2, "0")}/${String(pickupYear).slice(-2)}`;

  const drivers = driversRaw.map((d) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    rideCount: d.driverAssignments.length,
    monthLabel,
  }));

  // Fetch ALL active vehicle units, with category info
  const vehicleUnitsRaw = await db.vehicleUnit.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      plate: true,
      categoryId: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
    take: 300,
  });

  const vehicleUnits = vehicleUnitsRaw
    .map((u) => ({
      id: u.id,
      name: u.name,
      plate: u.plate,
      categoryName: u.category?.name ?? null,
      isMatchingCategory: booking.vehicleId
        ? u.categoryId === booking.vehicleId
        : false,
    }))
    .sort((a, b) => {
      if (a.isMatchingCategory && !b.isMatchingCategory) return -1;
      if (!a.isMatchingCategory && b.isMatchingCategory) return 1;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

  const customerEmail = booking.user?.email || booking.guestEmail;
  let customerBookingCount = 0;
  if (customerEmail) {
    customerBookingCount = await db.booking.count({
      where: {
        OR: [{ user: { email: customerEmail } }, { guestEmail: customerEmail }],
        id: { not: booking.id },
      },
    });
  }

  const customerName =
    booking.user?.name?.trim() ||
    booking.guestName?.trim() ||
    booking.corporatePassenger?.name?.trim() ||
    "—";
  const customerEmailDisplay =
    booking.user?.email ||
    booking.guestEmail ||
    booking.corporatePassenger?.email ||
    "—";
  const customerPhone =
    booking.user?.phone?.trim() ||
    booking.guestPhone?.trim() ||
    booking.corporatePassenger?.phone?.trim() ||
    null;

  const customerLine = isCorporateBooking
    ? `${customerName} (${customerEmailDisplay})${customerPhone ? ` • 📞 ${formatPhone(customerPhone)}` : ""}${booking.corporatePassenger?.department ? ` • ${booking.corporatePassenger.department}` : ""} — 🏢 ${booking.corporateAccount?.name ?? "Corporate"}`
    : `${customerName} (${customerEmailDisplay})`;

  const createdAtLabel = formatDateTime(booking.createdAt, companyTz);
  const actor = createdEvent?.createdBy ?? null;

  let createdByDisplay = "Guest checkout";

  if (actor?.roles?.includes(Role.ADMIN)) {
    createdByDisplay = `Admin • ${fmtPersonLine(actor)}`;
  } else if (actor) {
    createdByDisplay = `User account • ${fmtPersonLine(actor)}`;
  } else if (booking.user) {
    createdByDisplay = `User account • ${fmtPersonLine({
      name: booking.user.name ?? null,
      email: booking.user.email,
    })}`;
  } else {
    const gName = (booking.guestName ?? "").trim() || "Guest";
    const gEmail = (booking.guestEmail ?? "").trim();
    const gPhone = (booking.guestPhone ?? "").trim();

    const parts = [
      "Guest checkout",
      gEmail ? `${gName} (${gEmail})` : gName,
      gPhone ? gPhone : null,
    ].filter(Boolean);

    createdByDisplay = parts.join(" • ");
  }

  const isPaid = booking.payment?.status === "PAID";
  const amountPaidCents = booking.payment?.amountPaidCents ?? 0;
  const amountRefundedCents = booking.payment?.amountRefundedCents ?? 0;
  const tipCents = booking.payment?.tipCents ?? 0;

  const isApproved =
    booking.status !== "PENDING_REVIEW" &&
    booking.status !== "DRAFT" &&
    booking.status !== "DECLINED";

  const isDeclined = booking.status === "DECLINED";

  const hasPaymentLinkSent = booking.statusEvents.some(
    (e) => (e as any).eventType === "PAYMENT_LINK_SENT",
  );

  // ✅ Card indicator statuses

  // Trip card — green if route approved, warning otherwise
  const tripIndicator: IndicatorStatus = booking.routeApproved
    ? "complete"
    : "warning";

  // Price card — green if price approved
  const priceIndicator: IndicatorStatus = booking.priceApproved
    ? "complete"
    : "warning";

  // Payment card
  const isPaidOrRefunded =
    booking.payment?.status === "PAID" ||
    booking.payment?.status === "REFUNDED" ||
    booking.payment?.status === "PARTIALLY_REFUNDED";

  const paymentIndicator: IndicatorStatus = isCorporateBooking
    ? "complete"
    : isPaidOrRefunded
      ? "complete"
      : hasPaymentLinkSent
        ? "complete"
        : isApproved
          ? "warning"
          : "warning";

  // Assign card — green if driver AND vehicle assigned
  const hasDriver = !!booking.assignment?.driverId;
  const hasVehicleUnit = !!booking.assignment?.vehicleUnitId;
  const assignIndicator: IndicatorStatus =
    hasDriver && hasVehicleUnit ? "complete" : "warning";

  // Driver pay card — green if driver pay is set
  const hasDriverPay = Boolean(
    booking.assignment?.driverPaymentCents &&
    booking.assignment.driverPaymentCents > 0,
  );
  const driverPayIndicator: IndicatorStatus = hasDriverPay
    ? "complete"
    : "warning";

  const mostRecentConfirmedEventId = isPaid
    ? (booking.statusEvents.find((e) => e.status === "CONFIRMED")?.id ?? null)
    : null;

  // Current status display
  const currentStatus = booking.status as BookingStatus;
  const currentStatusIsPaidConfirmed =
    isPaid &&
    (currentStatus === "CONFIRMED" || currentStatus === "PENDING_PAYMENT");
  const currentStatusLabel = currentStatusIsPaidConfirmed
    ? "Payment received"
    : statusLabel(currentStatus);
  const currentStatusTone: BadgeTone = currentStatusIsPaidConfirmed
    ? "good"
    : badgeTone(currentStatus);

  const paymentStatusDisplay = isCorporateBooking
    ? {
        label: "Corporate Billing",
        tone: "accent" as BadgeTone,
        hasBalanceDue: false,
        balanceDueCents: 0,
        hasRefundDue: false,
        refundDueCents: 0,
      }
    : getPaymentStatusDisplay(
        booking.payment?.status,
        booking.totalCents,
        amountPaidCents,
        amountRefundedCents,
      );
  // Prepare data for EditTripDetailsClient
  const tripEditData = {
    pickupAt: formatDateTimeLocal(booking.pickupAt, companyTz),
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    pickupPlaceId: booking.pickupPlaceId,
    dropoffPlaceId: booking.dropoffPlaceId,
    pickupLat: decimalToNumber(booking.pickupLat),
    pickupLng: decimalToNumber(booking.pickupLng),
    dropoffLat: decimalToNumber(booking.dropoffLat),
    dropoffLng: decimalToNumber(booking.dropoffLng),
    distanceMiles: decimalToNumber(booking.distanceMiles),
    durationMinutes: booking.durationMinutes,
    passengers: booking.passengers,
    luggage: booking.luggage,
    specialRequests: booking.specialRequests,
    flightAirline: booking.flightAirline,
    flightNumber: booking.flightNumber,
    flightScheduledAt: booking.flightScheduledAt
      ? formatDateTimeLocal(booking.flightScheduledAt, companyTz)
      : null,
    flightTerminal: booking.flightTerminal,
    flightGate: booking.flightGate,
  };

  // Prepare pricing data for EditTripDetailsClient
  const pricingData: PricingData | undefined =
    booking.serviceType && booking.vehicle
      ? {
          pricingStrategy: booking.serviceType
            .pricingStrategy as PricingData["pricingStrategy"],
          serviceMinFareCents: booking.serviceType.minFareCents ?? 0,
          serviceBaseFeeCents: booking.serviceType.baseFeeCents ?? 0,
          servicePerMileCents: booking.serviceType.perMileCents ?? 0,
          servicePerMinuteCents: booking.serviceType.perMinuteCents ?? 0,
          servicePerHourCents: booking.serviceType.perHourCents ?? 0,
          vehicleBaseFareCents: booking.vehicle.baseFareCents ?? 0,
          vehiclePerMileCents: booking.vehicle.perMileCents ?? 0,
          vehiclePerMinuteCents: booking.vehicle.perMinuteCents ?? 0,
          vehiclePerHourCents: booking.vehicle.perHourCents ?? 0,
          vehicleMinHours: booking.vehicle.minHours ?? 0,
          currentTotalCents: booking.totalCents,
          hoursRequested: decimalToNumber(booking.hoursRequested),
          currency: booking.currency,
        }
      : undefined;

  // Prepare notes for client
  const notesForClient = booking.notes.map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
    createdBy: n.createdBy,
  }));

  // Check if booking has flight info
  const hasFlightInfo =
    booking.flightAirline ||
    booking.flightNumber ||
    booking.flightScheduledAt ||
    booking.flightTerminal ||
    booking.flightGate;

  // Extract flight date for API lookup
  const flightDateForLookup = tz.formatIsoDate(
    booking.flightScheduledAt ?? booking.pickupAt,
    companyTz,
  );

  // Determine airport leg from service type
  const airportLeg = (booking.serviceType.airportLeg ?? "NONE") as
    | "PICKUP"
    | "DROPOFF"
    | "NONE";

  // Check if we have route coordinates for map display
  const hasRouteCoordinates =
    booking.pickupLat &&
    booking.pickupLng &&
    booking.dropoffLat &&
    booking.dropoffLng;

  // Check if booking has stops
  const hasStops = booking.stops && booking.stops.length > 0;
  const stopCount = booking.stops?.length ?? 0;
  const stopSurchargeCents = booking.stopSurchargeCents ?? stopCount * 1500;
  const totalWaitTimeMinutes =
    booking.stops?.reduce((sum, s) => sum + (s.waitTimeMinutes ?? 5), 0) ?? 0;

  // Prepare stops for map display
  const stopsForMap =
    booking.stops
      ?.map((s) => ({
        lat: decimalToNumber(s.lat)!,
        lng: decimalToNumber(s.lng)!,
        address: s.address,
        stopOrder: s.stopOrder,
      }))
      .filter((s) => s.lat && s.lng) ?? [];

  // Check if booking has fees
  // ─── Build invoiceData for preview + PDF download ───
  let invoiceData: InvoiceData | null = null;

  if (isCorporateBooking && corporateInvoice) {
    // Corporate: use the dedicated action
    const result = await getCorporateInvoiceData(corporateInvoice.id);
    if (result.ok) {
      invoiceData = result.data;
    }
  } else if (isPaid) {
    // Regular (guest / account): build inline when paid
    const baseFareCents =
      booking.subtotalCents - (booking.stopSurchargeCents ?? stopCount * 1500);

    const invoiceLineItems: InvoiceLineItem[] = [];

    invoiceLineItems.push({
      description: `${booking.serviceType?.name ?? "Transportation"} - ${booking.vehicle?.name ?? "Vehicle"}`,
      amount: baseFareCents,
    });

    if (stopCount > 0 && stopSurchargeCents > 0) {
      invoiceLineItems.push({
        description: `Extra Stop${stopCount > 1 ? "s" : ""} (${stopCount} × $15.00)`,
        amount: stopSurchargeCents,
      });
    }

    if (booking.feesCents > 0) {
      invoiceLineItems.push({
        description: "Service Fee",
        amount: booking.feesCents,
      });
    }

    if (booking.taxesCents > 0) {
      invoiceLineItems.push({
        description: "Tax",
        amount: booking.taxesCents,
      });
    }

    invoiceData = {
      invoiceNumber: booking.id.slice(0, 8).toUpperCase(),
      invoiceDate: formatInvoiceDate(booking.createdAt),
      paidDate: booking.payment?.paidAt
        ? formatInvoiceDate(booking.payment.paidAt)
        : null,

      company: {
        name: companySettings.officeName || "Nier Transportation",
        address: companySettings.officeAddress || "",
        city: companySettings.officeCity || "",
        phone: companySettings.dispatchPhone || "",
        email: companySettings.supportEmail || "",
      },

      customer: {
        name:
          booking.user?.name?.trim() ||
          booking.guestName?.trim() ||
          booking.user?.email ||
          "Customer",
        email: booking.user?.email || booking.guestEmail || "",
        phone: booking.user?.phone || booking.guestPhone || null,
      },

      trip: {
        date: formatTripDateTime(booking.pickupAt, companyTz),
        pickupAddress: booking.pickupAddress,
        dropoffAddress: booking.dropoffAddress,
        stops: booking.stops.map((s) => ({
          address: s.address,
          stopOrder: s.stopOrder,
        })),
        serviceName: booking.serviceType?.name ?? "Transportation",
        vehicleName: booking.vehicle?.name ?? "Vehicle",
        passengers: booking.passengers,
        luggage: booking.luggage,
        distanceMiles: decimalToNumber(booking.distanceMiles),
        durationMinutes: booking.durationMinutes,
      },

      lineItems: invoiceLineItems,

      subtotalCents: booking.subtotalCents,
      feesCents: booking.feesCents,
      taxesCents: booking.taxesCents,
      totalCents: booking.totalCents,
      tipCents,
      amountPaidCents,
      amountRefundedCents,

      currency: booking.currency,
    };
  }

  // Check if booking has fees
  const hasFees = booking.fees && booking.fees.length > 0;
  const totalFeesCents =
    booking.fees?.reduce((sum, f) => sum + f.amountCents, 0) ?? 0;

  const stripePublishableKey = await getStripePublishableKey();

  return (
    <DirtyFormProvider>
      <BookingEditProvider>
        <section className={styles.parent}>
          <div className={styles.container}>
            <header className='header'>
              <h1 className={`heading h2`}>
                Booking Details{" "}
                {isCorporateBooking && (
                  <span
                    style={{
                      color: "rgb(124, 58, 237)",
                      textTransform: "lowercase",
                    }}
                  >
                    (corporate)
                  </span>
                )}
                {!isCorporateBooking &&
                  booking.eventType === "Golf Transfer — We-Ko-Pa" && (
                    <span
                      style={{
                        color: "var(--green)",
                        textTransform: "lowercase",
                      }}
                    >
                      (we-ko-pa)
                    </span>
                  )}
              </h1>

              <div className={styles.boxRight}>
                <div className='emptyTitle'>Date:</div>
                <BoxRightDateDisplay
                  initialFormatted={formatDateTime(booking.pickupAt, companyTz)}
                  timeZone={companyTz}
                />

                <div style={{ marginTop: 30 }}>
                  <div className='emptyTitle'>Booking ID:</div>
                  <p className='emptySmall'>{booking.id}</p>
                </div>
                {/* Current status badge */}
                <div style={{ marginTop: 30 }}>
                  <div className='emptyTitle'>Current Status:</div>
                  <div style={{ marginTop: 6 }}>
                    <span
                      className={`badge badge_${currentStatusTone} ${styles.badge}`}
                    >
                      {currentStatusLabel}
                    </span>
                  </div>
                </div>

                {/* Show decline reason if applicable */}
                {isDeclined && booking.declineReason && (
                  <div className={styles.declineReasonBox}>
                    <strong>Decline Reason:</strong> {booking.declineReason}
                  </div>
                )}

                {/* Updated Payment status with balance display */}
                <div style={{ marginTop: 30 }}>
                  <div className='emptyTitle'>Payment:</div>
                  <div className={styles.paymentInfo}>
                    <span
                      className={`badge badge_${paymentStatusDisplay.tone} ${styles.badge}`}
                    >
                      {paymentStatusDisplay.label}
                    </span>
                    {booking.totalCents > 0 && (
                      <span className={styles.paymentAmount}>
                        {formatMoney(booking.totalCents, booking.currency)}
                      </span>
                    )}
                    {booking.payment?.paidAt && (
                      <span className='miniNote'>
                        on {formatDateTime(booking.payment.paidAt, companyTz)}
                      </span>
                    )}
                  </div>

                  {/* Show tip amount if present */}
                  {tipCents > 0 && (
                    <a href='#driver-pay-section' className={styles.tipDisplay}>
                      <span className={styles.tipIcon}>💰</span>
                      <span className={styles.tipLabel}>Driver Tip:</span>
                      <span className={styles.tipAmount}>
                        {formatMoney(tipCents, booking.currency)}
                      </span>
                      <div className='backBtn'>More details</div>
                    </a>
                  )}

                  {/* Show balance due if applicable */}
                  {paymentStatusDisplay.hasBalanceDue && (
                    <div className={styles.balanceDueAlert}>
                      <strong>Balance Due:</strong>{" "}
                      {formatMoney(
                        paymentStatusDisplay.balanceDueCents,
                        booking.currency,
                      )}
                      <span className={styles.balanceDetail}>
                        (Paid: {formatMoney(amountPaidCents, booking.currency)}{" "}
                        of {formatMoney(booking.totalCents, booking.currency)})
                      </span>
                    </div>
                  )}

                  {/* Show refund due if applicable */}
                  {paymentStatusDisplay.hasRefundDue && (
                    <div className={styles.refundDueAlert}>
                      <strong>Refund Due:</strong>{" "}
                      {formatMoney(
                        paymentStatusDisplay.refundDueCents,
                        booking.currency,
                      )}
                      <span className={styles.refundDetail}>
                        (Paid: {formatMoney(amountPaidCents, booking.currency)}
                        {amountRefundedCents > 0 && (
                          <>
                            , Refunded:{" "}
                            {formatMoney(amountRefundedCents, booking.currency)}
                          </>
                        )}
                        , New Total:{" "}
                        {formatMoney(booking.totalCents, booking.currency)})
                      </span>
                    </div>
                  )}
                </div>
                {/* Driver */}
                <div
                  style={{ marginTop: 20 }}
                  className={styles.driverSectionArea}
                >
                  <div className='emptyTitle'>Driver:</div>
                  {booking.assignment?.driver ? (
                    <div className={styles.driverNameplate}>
                      {booking.assignment.driver.image ? (
                        <Image
                          src={booking.assignment.driver.image}
                          alt={booking.assignment.driver.name ?? "Driver"}
                          title={booking.assignment.driver.name ?? "Driver"}
                          width={36}
                          height={36}
                          className={styles.driverNameplateAvatar}
                        />
                      ) : (
                        <div className={styles.driverNameplateAvatarFallback}>
                          {(
                            booking.assignment.driver.name ??
                            booking.assignment.driver.email
                          )
                            .split(" ")
                            .map((w) => w[0]?.toUpperCase() ?? "")
                            .slice(0, 2)
                            .join("")}
                        </div>
                      )}
                      <span className={styles.driverNameplateName}>
                        {booking.assignment.driver.name?.trim() ||
                          booking.assignment.driver.email}
                      </span>
                    </div>
                  ) : (
                    <span
                      className='badge badge_neutral'
                      style={{ marginTop: 6, display: "inline-block" }}
                    >
                      Unassigned
                    </span>
                  )}
                </div>
              </div>
            </header>

            {/* ═══════════════════════════════════════════════════════════════════
            TRIP GROUP CARD (only shows for multi-leg bookings)
            ═══════════════════════════════════════════════════════════════════ */}
            {tripGroupData && (
              <TripGroupCard
                tripGroup={tripGroupData.tripGroup}
                siblings={tripGroupData.siblings}
                currentBookingId={id}
                timeZone={companyTz}
              />
            )}

            {/* ═══════════════════════════════════════════════════════════════════
            TRIP CARD
            ═══════════════════════════════════════════════════════════════════ */}
            <Card title='Trip' indicator={tripIndicator} id='trip-section'>
              <div className={styles.confirmationRow}>
                <div className='emptyTitle'>Confirmation #</div>
                <div className={styles.confirmationValue}>
                  {getConfirmationCode(booking.id)}
                </div>
              </div>
              <KeyVal
                k='Date'
                v={formatDateTime(booking.pickupAt, companyTz)}
              />{" "}
              <KeyVal
                k='Distance / duration'
                v={`${booking.distanceMiles ?? "—"} mi • ${
                  booking.durationMinutes ?? "—"
                } min${hasStops ? ` (includes ${stopCount} stop${stopCount > 1 ? "s" : ""})` : ""}`}
              />
              <KeyVal
                k='Amount due'
                v={formatMoney(booking.totalCents, booking.currency)}
              />
              {booking.discountCents && booking.discountCents > 0 ? (
                <div className={styles.keyVal}>
                  <div className='emptyTitle'>Corporate discount</div>
                  <p className='subheading' style={{ color: "#15803d" }}>
                    −{formatMoney(booking.discountCents, booking.currency)} off
                    {booking.corporateAccount?.discountPercent
                      ? ` (${Number(booking.corporateAccount.discountPercent)}%)`
                      : ""}
                    <span
                      style={{
                        marginLeft: 8,
                        color: "var(--paragraph)",
                        fontWeight: 400,
                      }}
                    >
                      was{" "}
                      {formatMoney(
                        booking.totalCents + booking.discountCents,
                        booking.currency,
                      )}
                    </span>
                  </p>
                </div>
              ) : null}
              {booking.specialRequests ? (
                <KeyVal k='Special requests' v={booking.specialRequests} />
              ) : null}
              <KeyVal k='Created' v={createdAtLabel} />
              <KeyVal k='Created by' v={createdByDisplay} />
              {/* Customer with history link */}
              <div className={styles.keyVal}>
                <div className='emptyTitle'>Customer</div>
                <div>
                  <p className='subheading'>{customerLine}</p>
                  {customerBookingCount > 0 && customerEmail && (
                    <Link
                      href={`/admin/bookings?q=${encodeURIComponent(customerEmail)}`}
                      className='backBtn'
                      style={{ marginTop: "0.5rem", display: "inline-block" }}
                    >
                      View {customerBookingCount} other booking
                      {customerBookingCount !== 1 ? "s" : ""} from this customer
                      →
                    </Link>
                  )}
                </div>
              </div>
              <KeyVal
                k='Phone'
                v={
                  customerPhone
                    ? `📞 ${formatPhone(customerPhone)}`
                    : "No phone on file"
                }
              />
              <KeyVal k='Service' v={booking.serviceType.name} />
              <KeyVal k='Vehicle category' v={booking.vehicle?.name ?? "—"} />
              {/* Route Timeline with Stops */}
              {hasStops ? (
                <>
                  <div className={styles.sectionDivider} />
                  <div className={styles.stopsSection}>
                    <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                      <span style={{ marginRight: "2rem" }}>🛑</span>Route with{" "}
                      {stopCount} Extra Stop
                      {stopCount > 1 ? "s" : ""}
                    </div>
                    <div className={styles.routeTimeline}>
                      {/* Pickup */}
                      <div className={styles.routePoint}>
                        <div
                          className={styles.routeMarker}
                          style={{ background: "#22c55e" }}
                        >
                          A
                        </div>
                        <div className={styles.routeAddress}>
                          <div className='emptyTitle'>Pickup</div>
                          <p className='subheading'>{booking.pickupAddress}</p>
                        </div>
                      </div>

                      {/* Stops */}
                      {booking.stops.map((stop, index) => (
                        <div key={stop.id} className={styles.routePoint}>
                          <div
                            className={styles.routeMarker}
                            style={{ background: "#3b82f6" }}
                          >
                            {index + 1}
                          </div>
                          <div className={styles.routeAddress}>
                            <div className='emptyTitle'>Stop {index + 1}</div>
                            <p className='subheading'>{stop.address}</p>
                            <span className='miniNote'>
                              ~{stop.waitTimeMinutes ?? 5} min wait
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Dropoff */}
                      <div className={styles.routePoint}>
                        <div
                          className={styles.routeMarker}
                          style={{ background: "#ef4444" }}
                        >
                          B
                        </div>
                        <div className={styles.routeAddress}>
                          <div className='emptyTitle'>Dropoff</div>
                          <p className='subheading'>{booking.dropoffAddress}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stop charges */}
                    <div className={styles.stopCharges}>
                      <div className={styles.stopChargeRow}>
                        <span>Stop surcharge ({stopCount} × $15)</span>
                        <span className={styles.stopChargeAmount}>
                          {formatMoney(stopSurchargeCents, booking.currency)}
                        </span>
                      </div>
                      <div className={styles.stopChargeRow}>
                        <span>Total wait time</span>
                        <span>~{totalWaitTimeMinutes} min</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <KeyVal k='Pickup' v={booking.pickupAddress} />
                  <KeyVal k='Dropoff' v={booking.dropoffAddress} />
                </>
              )}
              {/* Service Fees Section */}
              {hasFees && (
                <>
                  <div className={styles.sectionDivider} />
                  <div className={styles.feesSection}>
                    <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                      Service Fees
                    </div>
                    <div className={styles.feesList}>
                      {booking.fees.map((fee) => (
                        <div key={fee.id} className={styles.feeRow}>
                          <span className={styles.feeLabel}>{fee.label}</span>
                          <span className={styles.feeAmount}>
                            {formatMoney(fee.amountCents, booking.currency)}
                          </span>
                        </div>
                      ))}
                      {booking.fees.length > 1 && (
                        <div className={styles.feeTotalRow}>
                          <span>Total fees</span>
                          <span className={styles.feeAmount}>
                            {formatMoney(totalFeesCents, booking.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              <KeyVal
                k='Passengers / luggage'
                v={`${booking.passengers} / ${booking.luggage}`}
              />
              {/* Route Map Display */}
              {hasRouteCoordinates && (
                <>
                  <div className={styles.sectionDivider} />
                  <div className={styles.routeMapSection}>
                    <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                      Route Map
                    </div>
                    <RouteMapDisplay
                      pickupLat={decimalToNumber(booking.pickupLat)!}
                      pickupLng={decimalToNumber(booking.pickupLng)!}
                      dropoffLat={decimalToNumber(booking.dropoffLat)!}
                      dropoffLng={decimalToNumber(booking.dropoffLng)!}
                      pickupAddress={booking.pickupAddress}
                      dropoffAddress={booking.dropoffAddress}
                      stops={stopsForMap}
                    />
                  </div>
                </>
              )}
              {/* Flight Information */}
              {hasFlightInfo && (
                <>
                  <div className={styles.sectionDivider} />
                  <div className={styles.flightSection}>
                    <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                      Flight Information
                    </div>
                    {booking.flightAirline && (
                      <KeyVal k='Airline' v={booking.flightAirline} />
                    )}
                    {booking.flightNumber && (
                      <KeyVal k='Flight Number' v={booking.flightNumber} />
                    )}
                    {booking.flightScheduledAt && (
                      <KeyVal
                        k='Scheduled Time'
                        v={formatDateTime(booking.flightScheduledAt, companyTz)}
                      />
                    )}
                    {booking.flightTerminal && (
                      <KeyVal k='Terminal' v={booking.flightTerminal} />
                    )}
                    {booking.flightGate && (
                      <KeyVal k='Gate' v={booking.flightGate} />
                    )}

                    {/* Live Flight Tracking */}
                    {booking.flightNumber && (
                      <div style={{ marginTop: 16 }}>
                        <FlightStatusCard
                          flightNumber={booking.flightNumber}
                          flightDate={flightDateForLookup}
                          airportLeg={airportLeg}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
              {/* ✅ Approve Route + Edit Trip Details — side by side */}
              <div className={styles.sectionDivider} />
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <ApproveRouteClient
                  bookingId={booking.id}
                  isApproved={booking.routeApproved}
                />
                <EditTripDetailsClient
                  bookingId={booking.id}
                  initialData={tripEditData}
                  pricingData={pricingData}
                />
              </div>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════
            PRICE CARD
            ═══════════════════════════════════════════════════════════════════ */}
            <Card title='Price' indicator={priceIndicator} id='price-section'>
              <PriceForm
                bookingId={booking.id}
                currency={booking.currency}
                subtotalCents={booking.subtotalCents}
                feesCents={booking.feesCents}
                taxesCents={booking.taxesCents}
                totalCents={booking.totalCents}
                extraAction={
                  <ApprovePriceClient
                    bookingId={booking.id}
                    isApproved={booking.priceApproved}
                  />
                }
              />
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════
            DRIVER + VEHICLE ASSIGNMENT CARD (no driver pay)
            ═══════════════════════════════════════════════════════════════════ */}
            <Card
              title='Driver + Vehicle Assignment'
              indicator={assignIndicator}
              id='assign-section'
            >
              {drivers.length === 0 ? (
                <div className={styles.muted}>
                  No drivers yet. Create users and assign DRIVER role in{" "}
                  <Link className={styles.inlineLink} href='/admin/users'>
                    Users
                  </Link>
                  .
                </div>
              ) : (
                <>
                  <AssignBookingForm
                    bookingId={booking.id}
                    drivers={drivers}
                    vehicleUnits={vehicleUnits}
                    currentDriverId={booking.assignment?.driverId ?? null}
                    currentVehicleUnitId={
                      booking.assignment?.vehicleUnitId ?? null
                    }
                    currentDriverPaymentCents={
                      booking.assignment?.driverPaymentCents ?? null
                    }
                    currentDriverTipCents={
                      booking.assignment?.driverTipCents ?? null
                    }
                    bookingTotalCents={booking.totalCents}
                    currency={booking.currency}
                    tipCents={tipCents}
                    pickupAt={booking.pickupAt.toISOString()}
                    bookedVehicleCategoryName={booking.vehicle?.name ?? null}
                  />

                  {booking.assignment ? (
                    <div
                      className={styles.assignmentInfo}
                      style={{
                        marginTop: 20,
                        paddingTop: 20,
                        borderTop: "1px solid rgba(0,0,0,0.1)",
                      }}
                    >
                      <div
                        className='cardTitle h5'
                        style={{ marginBottom: 10 }}
                      >
                        Current assignment
                      </div>
                      <KeyVal
                        k='Driver'
                        v={`${booking.assignment.driver.name ?? "Driver"} (${
                          booking.assignment.driver.email
                        })`}
                      />
                      {booking.assignment.vehicleUnit ? (
                        <KeyVal
                          k='Vehicle'
                          v={`${booking.assignment.vehicleUnit.name}${
                            booking.assignment.vehicleUnit.plate
                              ? ` (${booking.assignment.vehicleUnit.plate})`
                              : ""
                          }`}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════
            DRIVER PAY CARD (separated)
            ═══════════════════════════════════════════════════════════════════ */}
            <Card
              title='Driver Pay'
              indicator={driverPayIndicator}
              id='driver-pay-section'
            >
              <DriverPayForm
                bookingId={booking.id}
                currentDriverPaymentCents={
                  booking.assignment?.driverPaymentCents ?? null
                }
                currentDriverTipCents={
                  booking.assignment?.driverTipCents ?? null
                }
                bookingTotalCents={booking.totalCents}
                currency={booking.currency}
                tipCents={tipCents}
                hasDriver={hasDriver}
              />
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════
            APPROVAL TOGGLE
            ═══════════════════════════════════════════════════════════════════ */}
            <div className={styles.box} id='approval-section'>
              <ApprovalToggleClient
                bookingId={booking.id}
                isApproved={isApproved}
                isDeclined={isDeclined}
                isPaid={isPaid}
                bookingStatus={booking.status}
                declineReason={booking.declineReason}
              />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
            PAYMENT CARD
            ═══════════════════════════════════════════════════════════════════ */}
            <Card
              title='Payment'
              indicator={paymentIndicator}
              id='payment-section'
            >
              {isCorporateBooking ? (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    textAlign: "center",
                    padding: "20px 0",
                  }}
                >
                  <div style={{ fontSize: 32 }}>🏢</div>
                  <div className='emptyTitle'>
                    Billed to{" "}
                    {booking.corporateAccount?.name ?? "corporate account"}
                  </div>
                  <div className='miniNote'>
                    This ride will appear on the next{" "}
                    <strong>
                      {(booking.corporateAccount?.billingCycle ?? "MONTHLY")
                        .replaceAll("_", " ")
                        .toLowerCase()}
                    </strong>{" "}
                    invoice.
                  </div>
                  {booking.corporateAccount?.discountPercent &&
                  Number(booking.corporateAccount.discountPercent) > 0 ? (
                    <div className='miniNote'>
                      Corporate discount of{" "}
                      <strong>
                        {Number(booking.corporateAccount.discountPercent)}%
                      </strong>{" "}
                      has been applied.
                    </div>
                  ) : null}
                  {booking.costCenter && (
                    <div className='miniNote'>
                      Cost center: <strong>{booking.costCenter}</strong>
                    </div>
                  )}
                  {booking.projectCode && (
                    <div className='miniNote'>
                      Project code: <strong>{booking.projectCode}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.paymentBlock}>
                  <div className={styles.paymentStatus}>
                    Payment status:{" "}
                    <strong>{booking.payment?.status ?? "NONE"}</strong>
                    {amountPaidCents > 0 && (
                      <span style={{ marginLeft: 10 }}>
                        (Paid: {formatMoney(amountPaidCents, booking.currency)}
                        {amountRefundedCents > 0 && (
                          <>
                            , Refunded:{" "}
                            {formatMoney(amountRefundedCents, booking.currency)}
                          </>
                        )}
                        {tipCents > 0 && (
                          <>, Tip: {formatMoney(tipCents, booking.currency)}</>
                        )}
                        )
                      </span>
                    )}
                  </div>

                  {/* Tip breakdown in Payment card */}
                  {tipCents > 0 && (
                    <div className={styles.tipBreakdownCard}>
                      <div className={styles.tipBreakdownHeader}>
                        <span className={styles.tipBreakdownIcon}>💰</span>
                        <span className={styles.tipBreakdownTitle}>
                          Driver Tip Received
                        </span>
                      </div>
                      <div className={styles.tipBreakdownAmount}>
                        {formatMoney(tipCents, booking.currency)}
                      </div>
                      <div className={styles.tipBreakdownNote}>
                        This tip was added by the customer during checkout and
                        should be passed to the assigned driver.
                      </div>
                    </div>
                  )}

                  {/* Send Payment Link Button */}
                  <SendPaymentLinkButton
                    bookingId={booking.id}
                    totalCents={booking.totalCents}
                    amountPaidCents={amountPaidCents}
                    currency={booking.currency}
                    isApproved={isApproved}
                  />

                  {booking.payment?.checkoutUrl ? (
                    <div className={styles.checkoutUrl}>
                      Latest checkout URL: <br />
                      <Link
                        href={booking.payment.checkoutUrl}
                        className='backBtn emptyTitleSmall'
                        style={{ marginTop: "1rem", display: "inline-block" }}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        Payment Link
                      </Link>
                    </div>
                  ) : null}

                  <div style={{ marginTop: 18 }}>
                    <div className='cardTitle h5'>
                      Take card payment (manual)
                    </div>
                    <div
                      className='miniNote'
                      style={{ marginTop: 6, marginBottom: "30px" }}
                    >
                      Card-only checkout. After success, the button turns green
                      and says &ldquo;Payment successful&rdquo;.
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <AdminManualCardPaymentClient
                        bookingId={booking.id}
                        amountCents={booking.totalCents}
                        currency={booking.currency}
                        isPaid={isPaid}
                        isApproved={isApproved}
                        amountPaidCents={amountPaidCents}
                        stripePublishableKey={stripePublishableKey}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <div className='cardTitle h5'>Charge card on file</div>
                    <div
                      className='miniNote'
                      style={{ marginTop: 6, marginBottom: "30px" }}
                    >
                      Charge the customer&apos;s saved card directly — no
                      payment link required.
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <AdminChargeCardOnFileButton
                        bookingId={booking.id}
                        userId={booking.userId ?? ""}
                        amountCents={booking.totalCents}
                        currency={booking.currency}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* ═══════════════════════════════════════════════════════════════════
            INVOICE PREVIEW
            ═══════════════════════════════════════════════════════════════════ */}
            {invoiceData && (
              <Card title='Invoice'>
                <InvoiceSection invoice={invoiceData} bookingId={booking.id} />
              </Card>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
            ACTIVITY TIMELINE
            ═══════════════════════════════════════════════════════════════════ */}
            <Card title='Activity Timeline'>
              {booking.statusEvents.length === 0 ? (
                <div className={styles.muted}>No activity yet.</div>
              ) : (
                <ul className={styles.eventsList}>
                  {booking.statusEvents.map((e) => {
                    const eventType = (e as any).eventType ?? "STATUS_CHANGE";
                    const metadata = (e as any).metadata as Record<
                      string,
                      any
                    > | null;

                    const isPaidConfirmed =
                      Boolean(mostRecentConfirmedEventId) &&
                      e.id === mostRecentConfirmedEventId;

                    let tone: BadgeTone = isPaidConfirmed
                      ? "good"
                      : badgeTone(e.status as BookingStatus);
                    let label = isPaidConfirmed
                      ? "Payment received"
                      : statusLabel(e.status as BookingStatus);

                    if (eventType === "PAYMENT_RECEIVED") {
                      tone = "good";
                      const method = metadata?.method;
                      if (method === "manual") {
                        label = "Payment received (manual)";
                      } else if (method === "online") {
                        label = "Payment received (online)";
                      } else if (method === "balance") {
                        label = "Balance payment received";
                      } else {
                        label = "Payment received";
                      }
                    } else if (eventType === "PAYMENT_LINK_SENT") {
                      tone = "accent";
                      label = metadata?.isBalancePayment
                        ? "Balance payment link sent"
                        : "Payment link sent";
                    } else if (eventType === "DRIVER_ASSIGNED") {
                      tone = "good";
                      label = "Driver assigned";
                    } else if (eventType === "DRIVER_UNASSIGNED") {
                      tone = "warn";
                      label = "Driver unassigned";
                    } else if (eventType === "TRIP_EDITED") {
                      tone = "neutral";
                      label = "Trip details edited";
                    } else if (eventType === "PRICE_ADJUSTED") {
                      tone = "warn";
                      label = "Price adjusted";
                    } else if (eventType === "REFUND_ISSUED") {
                      tone = "warn";
                      label = "Refund issued";
                    } else if (eventType === "APPROVAL_CHANGED") {
                      tone = metadata?.approved ? "good" : "neutral";
                      label = metadata?.approved
                        ? "Booking approved"
                        : "Approval reversed";
                    } else if (eventType === "BOOKING_DECLINED") {
                      tone = "bad";
                      label = "Booking declined";
                    }

                    const actorLabel = getEventActorLabel(
                      e.createdBy,
                      e.status,
                    );
                    const eventDetails = getEventDetails(
                      eventType,
                      metadata,
                      booking.currency,
                    );

                    return (
                      <li key={e.id} className={styles.eventItem}>
                        <div className={styles.eventLeft}>
                          <span className={`badge badge_${tone}`}>{label}</span>
                          <span className={styles.eventActor}>
                            {actorLabel}
                          </span>
                          {eventDetails && (
                            <div className={`${styles.eventDetails} miniNote`}>
                              {eventDetails}
                            </div>
                          )}
                        </div>
                        <p className='val'>
                          {formatDateTime(new Date(e.createdAt), companyTz)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title='Internal Notes' id='notes-section'>
              <BookingNotesClient
                bookingId={booking.id}
                notes={notesForClient}
              />
            </Card>

            <Card title='Issue Refund' borderWarn stylesWarn>
              <div style={{ marginTop: 18 }}>
                <div className='miniNote' style={{ marginTop: 6 }}>
                  You can refund clients manually here after they pay you.
                </div>

                <div style={{ marginTop: 10 }}>
                  <RefundButton
                    bookingId={booking.id}
                    totalCents={booking.totalCents}
                    amountPaidCents={amountPaidCents}
                    amountRefundedCents={amountRefundedCents}
                    currency={booking.currency}
                    stripePaymentIntentId={
                      booking.payment?.stripePaymentIntentId ?? null
                    }
                  />
                </div>
              </div>
            </Card>

            {/* Danger Zone */}
            <DeleteBookingDangerZoneClient bookingId={booking.id} />
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
          RIGHT SIDEBAR — CHECKLIST + QUICK ACTIONS
          ═══════════════════════════════════════════════════════════════════ */}
          <div className={styles.BookingCompletionChecklist}>
            <BookingCompletionChecklist
              bookingId={booking.id}
              bookingStatus={booking.status}
              isRouteApproved={booking.routeApproved}
              serviceName={booking.serviceType?.name ?? null}
              distanceMiles={decimalToNumber(booking.distanceMiles)}
              isPriceApproved={booking.priceApproved}
              hasDriver={hasDriver}
              driverName={booking.assignment?.driver?.name ?? null}
              hasVehicleUnit={hasVehicleUnit}
              vehicleUnitName={booking.assignment?.vehicleUnit?.name ?? null}
              hasVehicleCategory={!!booking.vehicleId}
              vehicleCategoryName={booking.vehicle?.name ?? null}
              hasDriverPay={hasDriverPay}
              driverPayDisplay={
                booking.assignment?.driverPaymentCents
                  ? formatMoney(
                      booking.assignment.driverPaymentCents,
                      booking.currency,
                    )
                  : null
              }
              isPaid={isCorporateBooking ? true : isPaid}
              isApproved={isApproved}
              hasPaymentLinkSent={
                isCorporateBooking ? true : hasPaymentLinkSent
              }
              isCorporateBooking={isCorporateBooking}
              corporateAccountName={booking.corporateAccount?.name ?? null}
            />
            <Card title='Quick Actions'>
              <QuickActionsClient
                bookingId={booking.id}
                currentStatus={currentStatus}
                pickupAt={booking.pickupAt.toISOString()}
              />
              <div className={styles.quickActionsDivider} />
              <DuplicateBookingClient bookingId={booking.id} />
            </Card>
          </div>
        </section>
      </BookingEditProvider>
    </DirtyFormProvider>
  );
}

function Card({
  title,
  children,
  borderWarn,
  stylesWarn,
  indicator,
  id,
}: {
  title: string;
  children: ReactNode;
  borderWarn?: boolean;
  stylesWarn?: boolean;
  indicator?: IndicatorStatus;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`${styles.card} ${borderWarn ? styles.borderWarn : ""}`}
    >
      {indicator && <CardIndicator status={indicator} />}
      <div className={styles.cardTop}>
        <div
          className='cardTitle h4'
          style={stylesWarn ? { background: "var(--warning300)" } : {}}
        >
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.keyVal}>
      <div className='emptyTitle'>{k}</div>
      <p className='subheading'>{v}</p>
    </div>
  );
}
