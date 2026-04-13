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
import { BookingEditProvider } from "./BookingEditContext";
import BoxRightDateDisplay from "./BoxRightDateDisplay";
import AdminCashPaymentButton from "@/components/admin/AdminCashPaymentButton/AdminCashPaymentButton";
import PriceBreakdownCard from "@/components/admin/PriceBreakdownCard/PriceBreakdownCard";
import { getSavedCardForBooking } from "../../../../../actions/payments/chargeCardOnFileForCheckout";
import SendEstimateButton from "./SendEstimateButton";
import SendBalanceReminderButton from "./SendBalanceReminderButton";
import DepositSetupClient from "@/components/admin/DepositSetupClient/DepositSetupClient";
import BookingDetailTabs, {
  type BookingTab,
} from "@/components/admin/BookingDetailTabs/BookingDetailTabs";
import { BookingTabsProvider } from "@/components/admin/BookingDetailTabs/BookingDetailTabsContext";
import BookingCompletionChecklist from "@/components/admin/BookingCompletionChecklist/BookingCompletionChecklist";
import EditHoursClient from "./EditHoursClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  if (cents == null) return "\u2014";
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
  if (status === "CONFIRMED" && !actor) return "System (payment received)";
  if (!actor) return "System";
  const isAdmin = actor.roles?.includes(Role.ADMIN);
  const isDriver = actor.roles?.includes(Role.DRIVER);
  const name = actor.name?.trim() || actor.email;
  if (isAdmin) return `Admin: ${name}`;
  if (isDriver) return `Driver: ${name}`;
  return `User: ${name}`;
}

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
      if (tip && metadata.tipCents > 0)
        return `Amount: ${amount} (includes ${tip} tip)`;
      return `Amount: ${amount}`;
    }
    case "PAYMENT_LINK_SENT":
      return `${formatMoney(metadata.amountCents, currency)} \u2192 ${metadata.recipientEmail}`;
    case "DRIVER_ASSIGNED": {
      const driverName = metadata.driverName ?? "Driver";
      const driverPayment = metadata.driverPaymentCents
        ? ` \u2022 Pay: ${formatMoney(metadata.driverPaymentCents, currency)}`
        : "";
      const vehicle = metadata.vehicleUnitName
        ? ` \u2022 Vehicle: ${metadata.vehicleUnitName}${metadata.vehicleUnitPlate ? ` (${metadata.vehicleUnitPlate})` : ""}`
        : "";
      return `${driverName}${driverPayment}${vehicle}`;
    }
    case "DRIVER_UNASSIGNED": {
      const driverName = metadata.previousDriverName ?? "Driver";
      const driverPayment = metadata.previousDriverPaymentCents
        ? ` \u2022 Pay was: ${formatMoney(metadata.previousDriverPaymentCents, currency)}`
        : "";
      const vehicle = metadata.previousVehicleUnitName
        ? ` \u2022 Vehicle: ${metadata.previousVehicleUnitName}${metadata.previousVehicleUnitPlate ? ` (${metadata.previousVehicleUnitPlate})` : ""}`
        : "";
      return `Removed: ${driverName}${driverPayment}${vehicle}`;
    }
    case "TRIP_EDITED": {
      const fields = metadata.fieldsEdited;
      if (Array.isArray(fields) && fields.length > 0)
        return `Changed: ${fields.join(", ")}`;
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
      return `${oldTotal} \u2192 ${newTotal} (${diffStr})`;
    }
    case "REFUND_ISSUED":
      return `Refunded: ${formatMoney(metadata.amountCents, currency)} \u2022 Remaining: ${formatMoney(metadata.remainingPaidCents, currency)}`;
    case "APPROVAL_CHANGED":
      return metadata.approved
        ? `Status: ${metadata.previousStatus} \u2192 ${metadata.newStatus}`
        : `Reverted to: ${metadata.newStatus}`;
    case "BOOKING_DECLINED":
      return metadata.reason ? `Reason: ${metadata.reason}` : null;
    case "STATUS_CHANGE":
      if (metadata.action) return metadata.action;
      if (metadata.previousStatus && metadata.newStatus)
        return `${metadata.previousStatus} \u2192 ${metadata.newStatus}`;
      return null;
    case "DEPOSIT_CONFIGURED": {
      if (!metadata?.depositPercent) return "Deposit mode disabled";
      const deposit = formatMoney(metadata.depositCents, currency);
      const balance =
        metadata.balanceCents > 0
          ? ` \u00b7 Balance: ${formatMoney(metadata.balanceCents, currency)}`
          : "";
      return `${metadata.depositPercent}% deposit (${deposit})${balance}`;
    }
    default:
      return null;
  }
}

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
  if (paymentStatus === "REFUNDED")
    return {
      label: "Refunded",
      tone: "neutral",
      hasBalanceDue: false,
      balanceDueCents: 0,
      hasRefundDue: false,
      refundDueCents: 0,
    };
  if (paymentStatus === "PARTIALLY_REFUNDED")
    return {
      label: "Partially Refunded",
      tone: "neutral",
      hasBalanceDue,
      balanceDueCents: hasBalanceDue ? balanceDueCents : 0,
      hasRefundDue,
      refundDueCents,
    };
  if (paymentStatus === "PAID") {
    if (hasRefundDue)
      return {
        label: "Overpaid",
        tone: "warn",
        hasBalanceDue: false,
        balanceDueCents: 0,
        hasRefundDue: true,
        refundDueCents,
      };
    if (hasBalanceDue)
      return {
        label: "Partial Payment",
        tone: "warn",
        hasBalanceDue: true,
        balanceDueCents,
        hasRefundDue: false,
        refundDueCents: 0,
      };
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

function buildPaymentMethodDisplay(
  payment: {
    stripePaymentIntentId?: string | null;
    method?: string | null;
  } | null,
): string | null {
  if (!payment) return null;
  if (payment.stripePaymentIntentId) return "Credit Card (online)";
  if (payment.method)
    return payment.method.charAt(0).toUpperCase() + payment.method.slice(1);
  return "Manual Payment (Cash)";
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
      stops: { orderBy: { stopOrder: "asc" } },
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
        include: { createdBy: { select: { name: true, email: true } } },
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
        select: { id: true, label: true, amountCents: true },
      },
    },
  });

  if (!booking) return notFound();

  const companySettings = await getCompanySettings();
  const companyTz = companySettings.timezone;
  const tripGroupData = await getTripGroupForBooking(id);
  const isCorporateBooking = Boolean(booking.corporateAccountId);
  const isGroupBooking = Boolean(tripGroupData);
  const groupPaymentStatus = tripGroupData?.tripGroup.paymentStatus ?? null;
  const groupTotalCents = tripGroupData
    ? tripGroupData.siblings.reduce((sum, s) => sum + s.totalCents, 0)
    : 0;
  const isGroupPaid = groupPaymentStatus === "PAID";
  const groupAmountPaidCents = isGroupPaid
    ? groupTotalCents
    : (tripGroupData?.tripGroup.amountPaidCents ?? 0);

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

  const createdEvent = await db.bookingStatusEvent.findFirst({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true, roles: true } },
    },
  });

  const pickupMonth = booking.pickupAt.getMonth();
  const pickupYear = booking.pickupAt.getFullYear();
  const monthStart = new Date(pickupYear, pickupMonth, 1);
  const monthEnd = new Date(pickupYear, pickupMonth + 1, 0, 23, 59, 59, 999);

  const driversRaw = await db.user.findMany({
    where: { roles: { has: "DRIVER" } },
    select: {
      id: true,
      name: true,
      email: true,
      driverAssignments: {
        where: {
          booking: {
            pickupAt: { gte: monthStart, lte: monthEnd },
            status: { notIn: ["CANCELLED", "NO_SHOW", "DECLINED", "DRAFT"] },
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
    "\u2014";
  const customerEmailDisplay =
    booking.user?.email ||
    booking.guestEmail ||
    booking.corporatePassenger?.email ||
    "\u2014";
  const customerPhone =
    booking.user?.phone?.trim() ||
    booking.guestPhone?.trim() ||
    booking.corporatePassenger?.phone?.trim() ||
    null;
  const customerLine = isCorporateBooking
    ? `${customerName} (${customerEmailDisplay})${customerPhone ? ` \u2022 \ud83d\udcde ${formatPhone(customerPhone)}` : ""}${booking.corporatePassenger?.department ? ` \u2022 ${booking.corporatePassenger.department}` : ""} \u2014 \ud83c\udfe2 ${booking.corporateAccount?.name ?? "Corporate"}`
    : `${customerName} (${customerEmailDisplay})`;

  const createdAtLabel = formatDateTime(booking.createdAt, companyTz);
  const actor = createdEvent?.createdBy ?? null;
  let createdByDisplay = "Guest checkout";
  if (actor?.roles?.includes(Role.ADMIN)) {
    createdByDisplay = `Admin \u2022 ${fmtPersonLine(actor)}`;
  } else if (actor) {
    createdByDisplay = `User account \u2022 ${fmtPersonLine(actor)}`;
  } else if (booking.user) {
    createdByDisplay = `User account \u2022 ${fmtPersonLine({ name: booking.user.name ?? null, email: booking.user.email })}`;
  } else {
    const gName = (booking.guestName ?? "").trim() || "Guest";
    const gEmail = (booking.guestEmail ?? "").trim();
    const gPhone = (booking.guestPhone ?? "").trim();
    const parts = [
      "Guest checkout",
      gEmail ? `${gName} (${gEmail})` : gName,
      gPhone ? gPhone : null,
    ].filter(Boolean);
    createdByDisplay = parts.join(" \u2022 ");
  }

  const isPaid = isGroupBooking
    ? isGroupPaid
    : booking.payment?.status === "PAID";
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
  const hasDriver = !!booking.assignment?.driverId;
  const hasVehicleUnit = !!booking.assignment?.vehicleUnitId;
  const hasDriverPay = Boolean(
    booking.assignment?.driverPaymentCents &&
    booking.assignment.driverPaymentCents > 0,
  );
  const mostRecentConfirmedEventId = isPaid
    ? (booking.statusEvents.find((e) => e.status === "CONFIRMED")?.id ?? null)
    : null;
  const currentStatus = booking.status as BookingStatus;
  const isPartiallyPaid = booking.payment?.status === "PARTIALLY_PAID";

  const currentStatusIsPaidConfirmed =
    isPaid &&
    (currentStatus === "CONFIRMED" || currentStatus === "PENDING_PAYMENT");

  const currentStatusLabel = isPartiallyPaid
    ? "Partially paid"
    : currentStatusIsPaidConfirmed
      ? "Paid"
      : statusLabel(currentStatus);

  const currentStatusTone: BadgeTone = isPartiallyPaid
    ? "warn"
    : currentStatusIsPaidConfirmed
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
    : isGroupBooking
      ? getPaymentStatusDisplay(
          groupPaymentStatus,
          groupTotalCents,
          groupAmountPaidCents,
          0,
        )
      : getPaymentStatusDisplay(
          booking.payment?.status,
          booking.totalCents,
          amountPaidCents,
          amountRefundedCents,
        );

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

  const notesForClient = booking.notes.map((n) => ({
    id: n.id,
    content: n.content,
    createdAt: n.createdAt.toISOString(),
    createdBy: n.createdBy,
  }));
  const hasFlightInfo =
    booking.flightAirline ||
    booking.flightNumber ||
    booking.flightScheduledAt ||
    booking.flightTerminal ||
    booking.flightGate;
  const flightDateForLookup = tz.formatIsoDate(
    booking.flightScheduledAt ?? booking.pickupAt,
    companyTz,
  );
  const airportLeg = (booking.serviceType.airportLeg ?? "NONE") as
    | "PICKUP"
    | "DROPOFF"
    | "NONE";
  const hasRouteCoordinates =
    booking.pickupLat &&
    booking.pickupLng &&
    booking.dropoffLat &&
    booking.dropoffLng;
  const hasStops = booking.stops && booking.stops.length > 0;
  const stopCount = booking.stops?.length ?? 0;
  const stopSurchargeCents = booking.stopSurchargeCents ?? stopCount * 1500;
  const totalWaitTimeMinutes =
    booking.stops?.reduce((sum, s) => sum + (s.waitTimeMinutes ?? 5), 0) ?? 0;
  const stopsForMap =
    booking.stops
      ?.map((s) => ({
        lat: decimalToNumber(s.lat)!,
        lng: decimalToNumber(s.lng)!,
        address: s.address,
        stopOrder: s.stopOrder,
      }))
      .filter((s) => s.lat && s.lng) ?? [];
  const hasFees = booking.fees && booking.fees.length > 0;
  const totalFeesCents =
    booking.fees?.reduce((sum, f) => sum + f.amountCents, 0) ?? 0;

  let invoiceData: InvoiceData | null = null;
  if (isCorporateBooking && corporateInvoice) {
    const result = await getCorporateInvoiceData(corporateInvoice.id);
    if (result.ok) invoiceData = result.data;
  } else if (isGroupBooking && isGroupPaid && tripGroupData) {
    const groupSiblings = tripGroupData.siblings;
    const groupInvoiceNumber = tripGroupData.tripGroup.id
      .slice(0, 8)
      .toUpperCase();
    const invoiceCustomerName =
      booking.user?.name?.trim() ||
      booking.guestName?.trim() ||
      booking.user?.email ||
      booking.guestEmail ||
      "Guest";
    invoiceData = {
      invoiceNumber: groupInvoiceNumber,
      invoiceDate: formatInvoiceDate(booking.createdAt),
      paidDate: tripGroupData.tripGroup.paidAt
        ? formatInvoiceDate(tripGroupData.tripGroup.paidAt)
        : null,
      logoUrl: (companySettings as any).logoUrl ?? undefined,
      company: {
        name: companySettings.officeName || "Nier Transportation",
        address: companySettings.officeAddress || "",
        city: companySettings.officeCity || "",
        phone: companySettings.dispatchPhone || "",
        email: companySettings.supportEmail || "",
      },
      customer: {
        name: invoiceCustomerName,
        email: booking.user?.email || booking.guestEmail || "",
        phone:
          booking.user?.phone?.trim() || booking.guestPhone?.trim() || null,
      },
      trip: {
        date: formatTripDateTime(
          groupSiblings[0]?.pickupAt ?? booking.pickupAt,
          companyTz,
        ),
        pickupAddress: groupSiblings[0]?.pickupAddress ?? booking.pickupAddress,
        dropoffAddress:
          groupSiblings[groupSiblings.length - 1]?.dropoffAddress ??
          booking.dropoffAddress,
        stops: [],
        serviceName: "Multi-leg Trip",
        vehicleName: `${groupSiblings.length} rides`,
        passengers: booking.passengers,
        luggage: booking.luggage,
        distanceMiles: null,
        durationMinutes: null,
      },
      lineItems: groupSiblings.map((sibling, idx) => ({
        description: `Ride ${idx + 1}: ${sibling.serviceName} \u2014 ${formatTripDateTime(sibling.pickupAt, companyTz)}`,
        amount: sibling.totalCents,
      })),
      legs: groupSiblings.map((sibling, idx) => ({
        legNumber: idx + 1,
        date: formatTripDateTime(sibling.pickupAt, companyTz),
        pickupAddress: sibling.pickupAddress,
        dropoffAddress: sibling.dropoffAddress,
        serviceName: sibling.serviceName,
        amountCents: sibling.totalCents,
      })),
      subtotalCents: groupTotalCents,
      feesCents: 0,
      taxesCents: 0,
      totalCents: groupTotalCents,
      tipCents: 0,
      amountPaidCents: groupAmountPaidCents,
      amountRefundedCents: 0,
      currency: tripGroupData.tripGroup.currency,
      paymentMethodDisplay: null,
      bookingConfirmation: groupInvoiceNumber,
    };
  } else if (isPaid || amountPaidCents > 0) {
    const baseFareCents =
      booking.subtotalCents - (booking.stopSurchargeCents ?? stopCount * 1500);
    const invoiceLineItems: InvoiceLineItem[] = [
      {
        description: `${booking.serviceType?.name ?? "Transportation"} - ${booking.vehicle?.name ?? "Vehicle"}`,
        amount: baseFareCents,
      },
    ];
    if (stopCount > 0 && stopSurchargeCents > 0)
      invoiceLineItems.push({
        description: `Extra Stop${stopCount > 1 ? "s" : ""} (${stopCount} \u00d7 $15.00)`,
        amount: stopSurchargeCents,
      });
    if (booking.feesCents > 0)
      invoiceLineItems.push({
        description: "Service Fee",
        amount: booking.feesCents,
      });
    if (booking.taxesCents > 0)
      invoiceLineItems.push({ description: "Tax", amount: booking.taxesCents });
    const invoiceCustomerName =
      booking.user?.name?.trim() ||
      booking.guestName?.trim() ||
      booking.corporatePassenger?.name?.trim() ||
      booking.user?.email ||
      booking.guestEmail ||
      "Guest";
    const invoiceCustomerEmail =
      booking.user?.email || booking.guestEmail || "";
    const invoiceCustomerPhone =
      booking.user?.phone?.trim() ||
      booking.guestPhone?.trim() ||
      booking.corporatePassenger?.phone?.trim() ||
      null;
    const invoiceAmountPaidCents =
      Math.abs(amountPaidCents - booking.totalCents) <= 100
        ? amountPaidCents + tipCents
        : amountPaidCents;
    invoiceData = {
      invoiceNumber: booking.id.slice(0, 8).toUpperCase(),
      invoiceDate: formatInvoiceDate(booking.createdAt),
      paidDate: booking.payment?.paidAt
        ? formatInvoiceDate(booking.payment.paidAt)
        : null,
      logoUrl: (companySettings as any).logoUrl ?? undefined,
      company: {
        name: companySettings.officeName || "Nier Transportation",
        address: companySettings.officeAddress || "",
        city: companySettings.officeCity || "",
        phone: companySettings.dispatchPhone || "",
        email: companySettings.supportEmail || "",
      },
      customer: {
        name: invoiceCustomerName,
        email: invoiceCustomerEmail,
        phone: invoiceCustomerPhone,
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
      amountPaidCents: invoiceAmountPaidCents,
      amountRefundedCents,
      currency: booking.currency,
      paymentMethodDisplay: buildPaymentMethodDisplay(booking.payment),
      driverName: booking.assignment?.driver?.name ?? undefined,
      bookingConfirmation: booking.id.slice(0, 8).toUpperCase(),
      depositMode: booking.depositMode ?? false,
      depositPercent: booking.depositPercent
        ? Number(booking.depositPercent)
        : null,
      depositCents:
        booking.depositMode && booking.depositPercent
          ? Math.round(
              (booking.totalCents * Number(booking.depositPercent)) / 100,
            )
          : (booking.depositCents ?? null),
      balanceCents:
        booking.depositMode && booking.depositPercent
          ? booking.totalCents -
            Math.round(
              (booking.totalCents * Number(booking.depositPercent)) / 100,
            )
          : (booking.balanceCents ?? null),
      depositDueDate: booking.depositDueDate
        ? new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(booking.depositDueDate)
        : null,
      balanceDueDate: booking.balanceDueDate
        ? new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(booking.balanceDueDate)
        : null,
    };
  }

  const [stripePublishableKey, savedCard] = await Promise.all([
    getStripePublishableKey(),
    getSavedCardForBooking(booking.id),
  ]);
  const estimateSentEvents = booking.statusEvents
    .filter((e) => (e as any).eventType === "ESTIMATE_SENT")
    .map((e) => ({
      sentAt: e.createdAt.toISOString(),
      recipientEmail: (e as any).metadata?.recipientEmail ?? null,
    }));
  const reminderSentEvents = booking.statusEvents
    .filter((e) => (e as any).eventType === "BALANCE_REMINDER_SENT")
    .map((e) => ({
      sentAt: e.createdAt.toISOString(),
      recipientEmail: (e as any).metadata?.recipientEmail ?? null,
    }));
  const paymentLinkSentEvents = booking.statusEvents
    .filter((e) => (e as any).eventType === "PAYMENT_LINK_SENT")
    .map((e) => ({
      sentAt: e.createdAt.toISOString(),
      recipientEmail: (e as any).metadata?.recipientEmail ?? null,
      amountCents: (e as any).metadata?.amountCents ?? null,
      isDeposit: (e as any).metadata?.isDepositPayment === true,
      isBalance: (e as any).metadata?.isBalancePayment === true,
    }));
  const outstandingCents = Math.max(0, booking.totalCents - amountPaidCents);

  // ── Tab completion ────────────────────────────────────────────────────────
  const tripIsComplete = booking.routeApproved;
  const priceIsComplete = booking.priceApproved;
  const assignIsComplete = hasDriver && hasVehicleUnit && hasDriverPay;
  const paymentIsComplete = isCorporateBooking || isPaid;
  const paymentIsPartial =
    !paymentIsComplete &&
    (isGroupBooking ? groupAmountPaidCents > 0 : amountPaidCents > 0);

  const approvalIsComplete = isApproved;
  // Default to first incomplete tab
  const defaultTabId = !tripIsComplete
    ? "trip"
    : !priceIsComplete
      ? "price"
      : !assignIsComplete
        ? "assignment"
        : !paymentIsComplete
          ? "payment"
          : !approvalIsComplete
            ? "approval"
            : "trip";

  // ── Build tabs ────────────────────────────────────────────────────────────
  const bookingTabs: BookingTab[] = [
    // ── 1. Trip Details ──────────────────────────────────────────────────────
    {
      id: "trip",
      label: "Trip Details",
      isComplete: tripIsComplete,
      sectionId: "trip-section",
      content: (
        <>
          <div className={styles.confirmationRow}>
            <div className='emptyTitle'>Confirmation #</div>
            <div className={styles.confirmationValue}>
              {getConfirmationCode(booking.id)}
            </div>
          </div>
          <KeyVal k='Date' v={formatDateTime(booking.pickupAt, companyTz)} />
          <KeyVal
            k='Distance / duration'
            v={`${booking.distanceMiles ?? "\u2014"} mi \u2022 ${booking.durationMinutes ?? "\u2014"} min - Google maps estimate${hasStops ? ` (includes ${stopCount} stop${stopCount > 1 ? "s" : ""})` : ""}`}
          />
          <KeyVal
            k='Amount due'
            v={formatMoney(booking.totalCents, booking.currency)}
          />
          {booking.discountCents && booking.discountCents > 0 ? (
            <div className={styles.keyVal}>
              <div className='emptyTitle'>Corporate discount</div>
              <p className='subheading' style={{ color: "#15803d" }}>
                {`\u2212`}
                {formatMoney(booking.discountCents, booking.currency)} off
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
                  {customerBookingCount !== 1 ? "s" : ""} from this customer{" "}
                  {`\u2192`}
                </Link>
              )}
            </div>
          </div>
          <KeyVal
            k='Phone'
            v={
              customerPhone
                ? `\ud83d\udcde ${formatPhone(customerPhone)}`
                : "No phone on file"
            }
          />
          <KeyVal k='Service' v={booking.serviceType.name} />
          <KeyVal k='Vehicle category' v={booking.vehicle?.name ?? "\u2014"} />
          {hasStops ? (
            <>
              <div className={styles.sectionDivider} />
              <div className={styles.stopsSection}>
                <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                  <span style={{ marginRight: "2rem" }}>🛑</span>Route with{" "}
                  {stopCount} Extra Stop{stopCount > 1 ? "s" : ""}
                </div>
                <div className={styles.routeTimeline}>
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
                <div className={styles.stopCharges}>
                  <div className={styles.stopChargeRow}>
                    <span>
                      Stop surcharge ({stopCount} {`\u00d7`} $15)
                    </span>
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
                {booking.flightNumber && (
                  <div style={{ marginTop: 16 }}>
                    <FlightStatusCard
                      flightNumber={booking.flightNumber
                        .replace(/\s+/g, "")
                        .toUpperCase()}
                      flightDate={flightDateForLookup}
                      airportLeg={airportLeg}
                    />
                  </div>
                )}
              </div>
            </>
          )}
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
              companyTimezone={companyTz}
            />
          </div>
        </>
      ),
    },

    // ── 2. Pricing ───────────────────────────────────────────────────────────
    {
      id: "price",
      label: "Pricing",
      isComplete: priceIsComplete,
      sectionId: "price-section",
      content: (
        <>
          {booking.serviceType?.pricingStrategy === "HOURLY" &&
            (booking.vehicle?.overageFeeCents ?? 0) > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "1.2rem 1.6rem",
                  marginBottom: "2rem",
                  background: "#fffbeb",
                  border: "1px solid #f59e0b",
                  borderRadius: 8,
                  fontSize: "1.4rem",
                }}
              >
                <span>⚠️</span>{" "}
                <span>
                  <strong>Overage policy:</strong>{" "}
                  {formatMoney(
                    booking.vehicle?.overageFeeCents ?? 0,
                    booking.currency,
                  )}{" "}
                  per {booking.vehicle?.overageIncrementMinutes ?? 30} minutes —
                  a card will be saved at checkout to cover any overages.
                </span>
              </div>
            )}
          {pricingData && (
            <PriceBreakdownCard
              pricingStrategy={pricingData.pricingStrategy}
              servicePerMileCents={pricingData.servicePerMileCents}
              servicePerMinuteCents={pricingData.servicePerMinuteCents}
              servicePerHourCents={pricingData.servicePerHourCents}
              serviceBaseFeeCents={pricingData.serviceBaseFeeCents}
              serviceMinFareCents={pricingData.serviceMinFareCents}
              serviceMinHours={0}
              vehicleBaseFareCents={pricingData.vehicleBaseFareCents}
              vehiclePerMileCents={pricingData.vehiclePerMileCents}
              vehiclePerMinuteCents={pricingData.vehiclePerMinuteCents}
              vehiclePerHourCents={pricingData.vehiclePerHourCents}
              vehicleMinHours={pricingData.vehicleMinHours}
              distanceMiles={decimalToNumber(booking.distanceMiles)}
              durationMinutes={booking.durationMinutes}
              hoursRequested={decimalToNumber(booking.hoursRequested)}
              stopCount={stopCount}
              stopSurchargeCents={stopSurchargeCents}
              totalCents={booking.totalCents}
              currency={booking.currency}
              vehicleCategoryName={booking.vehicle?.name ?? null}
              feesCents={booking.feesCents ?? 0}
            />
          )}
          <br />
          {booking.serviceType?.pricingStrategy === "HOURLY" && (
            <div style={{ marginTop: 12, marginBottom: 4 }}>
              <EditHoursClient
                bookingId={booking.id}
                currentHours={decimalToNumber(booking.hoursRequested)}
              />
            </div>
          )}
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
        </>
      ),
    },

    // ── 3. Driver + Vehicle (includes Driver Pay) ─────────────────────────────
    {
      id: "assignment",
      label: "Driver + Vehicle",
      isComplete: assignIsComplete,
      sectionId: "assign-section",
      content: (
        <>
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
                currentVehicleUnitId={booking.assignment?.vehicleUnitId ?? null}
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
              {booking.assignment && (
                <div
                  className={styles.assignmentInfo}
                  style={{
                    marginTop: 20,
                    paddingTop: 20,
                    borderTop: "1px solid rgba(0,0,0,0.1)",
                  }}
                >
                  <div className='cardTitle h5' style={{ marginBottom: 10 }}>
                    Current assignment
                  </div>
                  <KeyVal
                    k='Driver'
                    v={`${booking.assignment.driver.name ?? "Driver"} (${booking.assignment.driver.email})`}
                  />
                  {booking.assignment.vehicleUnit && (
                    <KeyVal
                      k='Vehicle'
                      v={`${booking.assignment.vehicleUnit.name}${booking.assignment.vehicleUnit.plate ? ` (${booking.assignment.vehicleUnit.plate})` : ""}`}
                    />
                  )}
                </div>
              )}
            </>
          )}
          <div className={styles.sectionDivider} style={{ marginTop: 24 }} />
          <div className='cardTitle h5' style={{ marginBottom: 14 }}>
            Driver Pay
          </div>
          <DriverPayForm
            bookingId={booking.id}
            currentDriverPaymentCents={
              booking.assignment?.driverPaymentCents ?? null
            }
            currentDriverTipCents={booking.assignment?.driverTipCents ?? null}
            bookingTotalCents={booking.totalCents}
            currency={booking.currency}
            tipCents={tipCents}
            hasDriver={hasDriver}
          />
        </>
      ),
    },

    // ── 4. Payment (includes deposit, payments, invoice, refund) ─────────────
    {
      id: "payment",
      label: "Payment",
      isComplete: paymentIsComplete,
      isPartial: paymentIsPartial,
      sectionId: "payment-section",
      content: (
        <>
          {isCorporateBooking ? (
            <div
              style={{
                display: "grid",
                gap: 12,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              <div style={{ fontSize: 32 }}>🏢</div>{" "}
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
                Number(booking.corporateAccount.discountPercent) > 0 && (
                  <div className='miniNote'>
                    Corporate discount of{" "}
                    <strong>
                      {Number(booking.corporateAccount.discountPercent)}%
                    </strong>{" "}
                    has been applied.
                  </div>
                )}
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
                <strong>
                  {isGroupBooking
                    ? (groupPaymentStatus ?? "NONE")
                    : (booking.payment?.status ?? "NONE")}
                </strong>
                {(isGroupBooking ? groupAmountPaidCents : amountPaidCents) >
                  0 && (
                  <span style={{ marginLeft: 10 }}>
                    (Paid:{" "}
                    {formatMoney(
                      isGroupBooking ? groupAmountPaidCents : amountPaidCents,
                      booking.currency,
                    )}
                    {!isGroupBooking && amountRefundedCents > 0 && (
                      <>
                        , Refunded:{" "}
                        {formatMoney(amountRefundedCents, booking.currency)}
                      </>
                    )}
                    {!isGroupBooking && tipCents > 0 && (
                      <>, Tip: {formatMoney(tipCents, booking.currency)}</>
                    )}
                    )
                  </span>
                )}
              </div>

              {!isCorporateBooking && (
                <>
                  <div className={styles.sectionDivider} />
                  <DepositSetupClient
                    bookingId={booking.id}
                    totalCents={booking.totalCents}
                    currency={booking.currency}
                    isPaid={isPaid}
                    initialDepositMode={booking.depositMode}
                    initialDepositPercent={booking.depositPercent ?? null}
                    initialDepositDueDate={
                      booking.depositDueDate
                        ? booking.depositDueDate.toISOString().slice(0, 10)
                        : null
                    }
                    initialBalanceDueDate={
                      booking.balanceDueDate
                        ? booking.balanceDueDate.toISOString().slice(0, 10)
                        : null
                    }
                  />
                </>
              )}

              {tipCents > 0 && (
                <div className={styles.tipBreakdownCard}>
                  <div className={styles.tipBreakdownHeader}>
                    <span className={styles.tipBreakdownIcon}>
                      \ud83d\udcb0
                    </span>
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

              <SendPaymentLinkButton
                bookingId={booking.id}
                totalCents={
                  isGroupBooking ? groupTotalCents : booking.totalCents
                }
                amountPaidCents={
                  isGroupBooking ? groupAmountPaidCents : amountPaidCents
                }
                currency={booking.currency}
                isApproved={isApproved}
                customerEmail={
                  booking.user?.email ?? booking.guestEmail ?? null
                }
                depositMode={booking.depositMode}
                depositCents={
                  booking.depositMode && booking.depositPercent
                    ? Math.round(
                        (booking.totalCents * booking.depositPercent) / 100,
                      )
                    : (booking.depositCents ?? null)
                }
                balanceCents={
                  booking.depositMode && booking.depositPercent
                    ? booking.totalCents -
                      Math.round(
                        (booking.totalCents * booking.depositPercent) / 100,
                      )
                    : (booking.balanceCents ?? null)
                }
                depositDueDate={booking.depositDueDate?.toISOString() ?? null}
                balanceDueDate={booking.balanceDueDate?.toISOString() ?? null}
                paymentLinkSentEvents={paymentLinkSentEvents}
              />

              {booking.payment?.checkoutUrl && (
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
              )}

              <div style={{ marginTop: 18 }}>
                <div className='cardTitle h5'>Take card payment (manual)</div>
                <div
                  className='miniNote'
                  style={{ marginTop: 6, marginBottom: "30px" }}
                >
                  Card-only checkout. After success, the button turns green and
                  says &ldquo;Payment successful&rdquo;.
                </div>
                <AdminManualCardPaymentClient
                  bookingId={booking.id}
                  amountCents={
                    isGroupBooking ? groupTotalCents : booking.totalCents
                  }
                  currency={booking.currency}
                  isPaid={isPaid}
                  isApproved={isApproved}
                  amountPaidCents={
                    isGroupBooking ? groupAmountPaidCents : amountPaidCents
                  } // ← group-aware
                  stripePublishableKey={stripePublishableKey}
                />
              </div>

              <div style={{ marginTop: 18 }}>
                <div className='cardTitle h5'>Charge card on file</div>
                <div
                  className='miniNote'
                  style={{ marginTop: 6, marginBottom: "1.6rem" }}
                >
                  Charge the customer&apos;s saved card directly \u2014 no
                  payment link required.
                </div>
                {!savedCard?.hasCard && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.8rem",
                      padding: "0.6rem 1.2rem",
                      marginBottom: "1.6rem",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      fontSize: "1.3rem",
                      color: "#6b7280",
                    }}
                  >
                    <span>💳</span> <span>No card on file</span>
                  </div>
                )}
                <AdminChargeCardOnFileButton
                  bookingId={booking.id}
                  amountCents={
                    isGroupBooking ? groupTotalCents : booking.totalCents
                  }
                  currency={booking.currency}
                />
              </div>

              <div style={{ marginTop: 18 }}>
                <div className='cardTitle h5'>Record cash payment</div>
                <div
                  className='miniNote'
                  style={{ marginTop: 6, marginBottom: "30px" }}
                >
                  Customer paid in person with cash. Marks booking as confirmed
                  and paid.
                </div>
                <AdminCashPaymentButton
                  bookingId={booking.id}
                  amountCents={
                    isGroupBooking
                      ? Math.max(0, groupTotalCents - groupAmountPaidCents)
                      : booking.totalCents
                  }
                  currency={booking.currency}
                  isPaid={isPaid}
                />
              </div>

              {/* Invoice — shown inside payment tab when available */}
              {invoiceData && (
                <>
                  <div
                    className={styles.sectionDivider}
                    style={{ marginTop: 24 }}
                  />
                  <div className='cardTitle h5' style={{ marginBottom: 14 }}>
                    Invoice
                  </div>
                  <InvoiceSection
                    invoice={invoiceData}
                    bookingId={booking.id}
                  />
                </>
              )}

              {/* Refund — inside payment tab */}
              <div
                className={styles.sectionDivider}
                style={{ marginTop: 24 }}
              />
              <div
                className='cardTitle h5'
                style={{ marginBottom: 8, color: "var(--accent)" }}
              >
                Issue Refund
              </div>
              <div className='miniNote' style={{ marginBottom: "1.6rem" }}>
                You can refund clients manually here after they pay you.
              </div>
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
          )}
        </>
      ),
    },

    // ── 5. Approval (last) ───────────────────────────────────────────────────
    {
      id: "approval",
      label: "Approval",
      isComplete: approvalIsComplete,
      sectionId: "approval-section",
      content: (
        <ApprovalToggleClient
          bookingId={booking.id}
          isApproved={isApproved}
          isDeclined={isDeclined}
          isPaid={isPaid}
          bookingStatus={booking.status}
          declineReason={booking.declineReason}
        />
      ),
    },
  ];

  return (
    <DirtyFormProvider>
      <BookingEditProvider>
        <BookingTabsProvider defaultTabId={defaultTabId}>
          <section className={styles.parent}>
            <div className={styles.container}>
              <header className='header'>
                <h1 className={`heading h2`}>
                  Booking Details
                  {isCorporateBooking ? (
                    <span
                      style={{
                        color: "rgb(124, 58, 237)",
                        textTransform: "capitalize",
                      }}
                    >
                      {" "}
                      (corporate)
                    </span>
                  ) : booking.eventType === `Golf Transfer \u2014 We-Ko-Pa` ? (
                    <span
                      style={{
                        color: "var(--green)",
                        textTransform: "capitalize",
                      }}
                    >
                      {" "}
                      (we-ko-pa)
                    </span>
                  ) : customerName !== "\u2014" ? (
                    <span
                      style={{
                        color: "var(--black400)",
                        textTransform: "capitalize",
                      }}
                    >
                      {" "}
                      {"\u2014"} {customerName}
                    </span>
                  ) : null}
                </h1>

                <div className={styles.boxRight}>
                  <div className='emptyTitle'>Date:</div>
                  <BoxRightDateDisplay
                    initialFormatted={formatDateTime(
                      booking.pickupAt,
                      companyTz,
                    )}
                    timeZone={companyTz}
                  />

                  <div style={{ marginTop: 30 }}>
                    <div className='emptyTitle'>Booking ID:</div>
                    <p className={`emptySmall ${styles.badge}`}>{booking.id}</p>
                  </div>

                  <div style={{ marginTop: 30 }}>
                    <div className='emptyTitle'>Current Status:</div>
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <span
                        className={`badge badge_${currentStatusTone} ${styles.badge}`}
                      >
                        {currentStatusLabel}
                      </span>
                      {currentStatus === "COMPLETED" && isPaid && (
                        <span className={`badge badge_good ${styles.badge}`}>
                          Paid
                        </span>
                      )}
                      {currentStatus === "COMPLETED" && isPartiallyPaid && (
                        <span className={`badge badge_warn ${styles.badge}`}>
                          Partially paid
                        </span>
                      )}
                    </div>
                  </div>

                  {isDeclined && booking.declineReason && (
                    <div className={styles.declineReasonBox}>
                      <strong>Decline Reason:</strong> {booking.declineReason}
                    </div>
                  )}

                  <div style={{ marginTop: 30 }}>
                    <div className='emptyTitle'>Client Type:</div>
                    <div style={{ marginTop: 6 }}>
                      {isCorporateBooking ? (
                        <span className={`emptySmall ${styles.badge}`}>
                          🏢 Corporate {"\u2014"}{" "}
                          {booking.corporateAccount?.name ?? "Account"}
                        </span>
                      ) : booking.userId ? (
                        <span className={`emptySmall ${styles.badge}`}>
                          👤 Registered User
                        </span>
                      ) : (
                        <span className={`emptySmall ${styles.badge}`}>
                          🧾 Guest Checkout
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 30 }}>
                    <div className='emptyTitle'>Ride Type:</div>
                    <div style={{ marginTop: 6 }}>
                      <span className={`emptySmall ${styles.badge}`}>
                        {isGroupBooking
                          ? `Multi Trip (${tripGroupData!.siblings.length} rides)`
                          : "Single Ride"}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 30 }}>
                    <div className='emptyTitle'>Total Payment Due:</div>
                    <div className={styles.paymentInfo}>
                      <span className={`emptySmall ${styles.badge}`}>
                        {paymentStatusDisplay.label}
                      </span>
                      {(isGroupBooking ? groupTotalCents : booking.totalCents) >
                        0 && (
                        <span className={styles.paymentAmount}>
                          {formatMoney(
                            isGroupBooking
                              ? groupTotalCents
                              : booking.totalCents,
                            isGroupBooking
                              ? tripGroupData!.tripGroup.currency
                              : booking.currency,
                          )}
                        </span>
                      )}
                      {booking.payment?.paidAt && (
                        <span className='miniNote'>
                          on {formatDateTime(booking.payment.paidAt, companyTz)}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: 30 }}>
                      <div className='emptyTitle'>Deposit Required:</div>
                      <div style={{ marginTop: 6 }}>
                        <span
                          className={`badge ${booking.depositMode ? "badge_accent" : "badge_neutral"}`}
                        >
                          {booking.depositMode ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                    <br />
                    {booking.depositMode && booking.depositPercent && (
                      <div style={{ marginTop: 12 }}>
                        <div className='emptyTitle'>Deposit Details:</div>
                        <div style={{ marginTop: 6 }}>
                          <p className='miniNote'>
                            {Number(booking.depositPercent)}% deposit —{" "}
                            {formatMoney(
                              booking.depositCents ??
                                Math.round(
                                  (booking.totalCents *
                                    Number(booking.depositPercent)) /
                                    100,
                                ),
                              booking.currency,
                            )}
                          </p>
                          <p className='miniNote' style={{ marginTop: 4 }}>
                            {amountPaidCents > 0
                              ? booking.payment?.paidAt
                                ? `Paid on ${formatDateTime(booking.payment.paidAt, companyTz)}`
                                : "Paid"
                              : booking.depositDueDate
                                ? `Due by ${formatDateTime(booking.depositDueDate, companyTz)}`
                                : "Not yet paid"}
                          </p>
                        </div>
                      </div>
                    )}

                    {tipCents > 0 && (
                      <div className={styles.tipDisplay}>
                        <span className={styles.tipIcon}>💰</span>
                        <span className={styles.tipLabel}>Driver Tip:</span>
                        <span className={styles.tipAmount}>
                          {formatMoney(tipCents, booking.currency)}
                        </span>
                      </div>
                    )}

                    {paymentStatusDisplay.hasBalanceDue && (
                      <div className={styles.balanceDueAlert}>
                        <strong>Balance Due:</strong>{" "}
                        {formatMoney(
                          paymentStatusDisplay.balanceDueCents,
                          booking.currency,
                        )}
                        <span className={styles.balanceDetail}>
                          (Paid:{" "}
                          {formatMoney(amountPaidCents, booking.currency)} of{" "}
                          {formatMoney(booking.totalCents, booking.currency)})
                        </span>
                      </div>
                    )}

                    {paymentStatusDisplay.hasRefundDue && (
                      <div className={styles.refundDueAlert}>
                        <strong>Refund Due:</strong>{" "}
                        {formatMoney(
                          paymentStatusDisplay.refundDueCents,
                          booking.currency,
                        )}
                        <span className={styles.refundDetail}>
                          (Paid:{" "}
                          {formatMoney(amountPaidCents, booking.currency)}
                          {amountRefundedCents > 0 && (
                            <>
                              , Refunded:{" "}
                              {formatMoney(
                                amountRefundedCents,
                                booking.currency,
                              )}
                            </>
                          )}
                          , New Total:{" "}
                          {formatMoney(booking.totalCents, booking.currency)})
                        </span>
                      </div>
                    )}
                  </div>

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
                  <br />
                  <br />
                  <SendEstimateButton
                    bookingId={booking.id}
                    customerEmail={
                      booking.user?.email ?? booking.guestEmail ?? null
                    }
                    bookingStatus={booking.status}
                    estimateSentEvents={estimateSentEvents}
                  />
                </div>
                <br />
                <br />
                {(paymentStatusDisplay.hasBalanceDue ||
                  booking.status === "PENDING_PAYMENT") && (
                  <>
                    <div
                      className={styles.sectionDivider}
                      style={{ marginTop: 24 }}
                    />
                    <div className='cardTitle h5' style={{ marginBottom: 12 }}>
                      Send balance reminder
                    </div>
                    <div
                      className='miniNote'
                      style={{ marginTop: 0, marginBottom: "1.6rem" }}
                    >
                      Send the customer an email reminding them of their
                      outstanding balance with a direct link to complete
                      payment.
                    </div>
                    <SendBalanceReminderButton
                      bookingId={booking.id}
                      customerEmail={
                        booking.user?.email ?? booking.guestEmail ?? null
                      }
                      outstandingCents={outstandingCents}
                      totalCents={booking.totalCents}
                      currency={booking.currency}
                      pickupAtIso={booking.pickupAt.toISOString()}
                      timeZone={companyTz}
                      reminderSentEvents={reminderSentEvents}
                    />
                  </>
                )}
              </header>

              {tripGroupData && (
                <TripGroupCard
                  tripGroup={tripGroupData.tripGroup}
                  siblings={tripGroupData.siblings}
                  currentBookingId={id}
                  timeZone={companyTz}
                />
              )}

              {/* ── Tabs (Trip / Price / Assignment+Pay / Payment / Approval) ── */}
              <BookingDetailTabs tabs={bookingTabs} />

              {/* ── Always-visible cards below tabs ── */}
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
                        if (method === "manual")
                          label = "Payment received (manual)";
                        else if (method === "online")
                          label = "Payment received (online)";
                        else if (method === "balance")
                          label = "Balance payment received";
                        else label = "Payment received";
                      } else if (eventType === "PAYMENT_LINK_SENT") {
                        tone = "accent";
                        label = metadata?.isDepositPayment
                          ? "Deposit link sent"
                          : metadata?.isBalancePayment
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
                      } else if (eventType === "ESTIMATE_SENT") {
                        tone = "accent";
                        label = "Estimate sent";
                      } else if (eventType === "BALANCE_REMINDER_SENT") {
                        tone = "accent";
                        label = "Balance reminder sent";
                      } else if (eventType === "DEPOSIT_CONFIGURED") {
                        tone = metadata?.depositPercent ? "accent" : "neutral";
                        label = metadata?.depositPercent
                          ? `Deposit configured (${metadata.depositPercent}%)`
                          : "Deposit disabled";
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
                            <span className={`badge badge_${tone}`}>
                              {label}
                            </span>
                            <span className={styles.eventActor}>
                              {actorLabel}
                            </span>
                            {eventDetails && (
                              <div
                                className={`${styles.eventDetails} miniNote`}
                              >
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

              <DeleteBookingDangerZoneClient bookingId={booking.id} />
            </div>

            {/* ── Right sidebar ── */}
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
                  hasDriver={hasDriver}
                  hasVehicleUnit={hasVehicleUnit}
                  hasDriverPay={hasDriverPay}
                  isApproved={isApproved}
                />
                <div className={styles.quickActionsDivider} />
                <DuplicateBookingClient bookingId={booking.id} />
              </Card>
            </div>
          </section>
        </BookingTabsProvider>
      </BookingEditProvider>
    </DirtyFormProvider>
  );
}

function Card({
  title,
  children,
  borderWarn,
  stylesWarn,
  id,
}: {
  title: string;
  children: ReactNode;
  borderWarn?: boolean;
  stylesWarn?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`${styles.card} ${borderWarn ? styles.borderWarn : ""}`}
    >
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
