// src/lib/booking/bookingsWhere.ts
//
// Turns the /admin/bookings filters into one database query. The list, its
// counts, the cards and the chart all use this, so they always agree.

import { Prisma, type BookingStatus } from "@prisma/client";
import { getRangeWindow } from "@/lib/booking/bookingsRange";
import {
  statusesInGroup,
  type StatusGroupKey,
} from "@/lib/booking/bookingsChart";

export type PaymentFilter = "any" | "paid" | "unpaid";
export type AssignmentFilter = "any" | "assigned" | "unassigned";
export type FlightFilter = "any" | "yes" | "no";

/** Status filter values that stand for a group of statuses (the cards). */
export const STATUS_GROUP_FILTERS: Record<string, StatusGroupKey> = {
  NEEDS_ACTION: "needs_action",
  BOOKED: "booked",
  DONE: "done",
  LOST: "lost",
};

/** "Stuck in review": waiting this long in review with the pickup ahead. */
export const STUCK_AFTER_MS = 2 * 60 * 60 * 1000;

export type BookingsWhereArgs = {
  now: Date;
  timezone: string;
  /** ALL, a booking status, a group (NEEDS_ACTION…), STUCK,
   *  PAYMENT_RECEIVED, DRAFT or TRASH. */
  status: string;
  range: string;
  fromYmd: string;
  toYmd: string;
  monthKey?: string;
  /** Which date the time range applies to. */
  dateField?: "pickupAt" | "createdAt";
  q?: string;
  customerType?: string;
  driver?: string;
  serviceType?: string;
  rideType?: string;
  payment?: PaymentFilter;
  assignment?: AssignmentFilter;
  flight?: FlightFilter;
};

export function buildBookingsWhere(
  args: BookingsWhereArgs,
): Prisma.BookingWhereInput {
  const { now, timezone, status, range, fromYmd, toYmd, q } = args;

  const where: Prisma.BookingWhereInput = {};

  // Trash pseudo-status: only soft-deleted rows, no other filters.
  // Mentioning deletedAt here also bypasses the global soft-delete guard.
  if (status === "TRASH") {
    where.deletedAt = { not: null };
    return where;
  }

  // Conditions that must not overwrite each other are collected here and
  // combined at the end.
  const extra: Prisma.BookingWhereInput[] = [];

  // ── When: the time range, on the pickup date or the booked date ──
  const dateField = args.dateField ?? "pickupAt";
  const window = getRangeWindow({
    now,
    timezone,
    range,
    fromYmd,
    toYmd,
    monthKey: args.monthKey,
  });
  if (window) where[dateField] = window;

  // ── Status: one status, a group (the cards), or a quick view ──
  const group = STATUS_GROUP_FILTERS[status];
  if (status === "ALL") {
    // Drafts only show under Drafts, so "All" matches the Rides card.
    where.status = { not: "DRAFT" as BookingStatus };
  } else if (group) {
    where.status = { in: statusesInGroup(group) };
  } else if (status === "STUCK") {
    where.status = "PENDING_REVIEW" as BookingStatus;
    extra.push(
      { createdAt: { lt: new Date(now.getTime() - STUCK_AFTER_MS) } },
      { pickupAt: { gte: now } },
    );
  } else if (status === "PAYMENT_RECEIVED") {
    where.status = { in: ["CONFIRMED", "PENDING_PAYMENT"] as BookingStatus[] };
    extra.push({ payment: { is: { status: "PAID" } } });
  } else {
    where.status = status as BookingStatus;
  }

  // ── Payment, for the whole trip: a ride in a paid trip is paid even when
  // the money sits on a sibling ride's payment record ──
  if (args.payment === "paid") {
    extra.push({
      OR: [
        { payment: { is: { status: "PAID" } } },
        { tripGroup: { is: { paymentStatus: "PAID" } } },
      ],
    });
  } else if (args.payment === "unpaid") {
    extra.push(
      { NOT: { payment: { status: "PAID" } } },
      { NOT: { tripGroup: { is: { paymentStatus: "PAID" } } } },
    );
  }

  const needle = (q ?? "").trim();
  if (needle) {
    const isConfirmationCode = /^[A-Za-z0-9]{6,8}$/i.test(needle);

    const existingAnd = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];

    const searchConditions: Prisma.BookingWhereInput[] = [
      { id: { contains: needle, mode: "insensitive" } },
      { guestName: { contains: needle, mode: "insensitive" } },
      { guestEmail: { contains: needle, mode: "insensitive" } },
      { guestPhone: { contains: needle, mode: "insensitive" } },
      { pickupAddress: { contains: needle, mode: "insensitive" } },
      { dropoffAddress: { contains: needle, mode: "insensitive" } },
      { user: { is: { name: { contains: needle, mode: "insensitive" } } } },
      { user: { is: { email: { contains: needle, mode: "insensitive" } } } },
      {
        corporateAccount: {
          is: { name: { contains: needle, mode: "insensitive" } },
        },
      },
      {
        corporatePassenger: {
          is: { name: { contains: needle, mode: "insensitive" } },
        },
      },
      {
        corporatePassenger: {
          is: { email: { contains: needle, mode: "insensitive" } },
        },
      },
      {
        corporatePassenger: {
          is: { phone: { contains: needle, mode: "insensitive" } },
        },
      },
      { costCenter: { contains: needle, mode: "insensitive" } },
      { projectCode: { contains: needle, mode: "insensitive" } },
    ];

    if (isConfirmationCode) {
      searchConditions.push({
        id: { startsWith: needle.toLowerCase(), mode: "insensitive" },
      });
    }

    where.AND = [
      ...existingAnd,
      {
        OR: searchConditions,
      },
    ];
  }

  // Customer type filter
  const ct = args.customerType ?? "all";
  if (ct === "guest") {
    where.userId = null;
    where.corporateAccountId = null;
  } else if (ct === "account") {
    where.userId = { not: null };
    where.corporateAccountId = null;
  } else if (ct === "corporate") {
    where.corporateAccountId = { not: null };
  }

  // Assignment: a chosen driver wins over assigned / unassigned.
  const drvFilter = args.driver ?? "all";
  if (drvFilter !== "all") {
    where.assignment = { driverId: drvFilter };
  } else if (args.assignment === "unassigned") {
    where.assignment = { is: null };
  } else if (args.assignment === "assigned") {
    where.assignment = { isNot: null };
  }

  if (args.serviceType && args.serviceType !== "all") {
    where.serviceTypeId = args.serviceType;
  }

  if (args.rideType === "single") {
    where.tripGroupId = null;
  } else if (args.rideType === "multi") {
    where.tripGroupId = { not: null };
  }

  if (args.flight === "yes") {
    where.flightNumber = { not: null };
  } else if (args.flight === "no") {
    where.flightNumber = null;
  }

  if (extra.length) {
    const existing = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];
    where.AND = [...existing, ...extra];
  }

  return where;
}

/** Old checkbox links (?paid=1, ?stuck=1, …) mapped to today's filters, or
 *  null when the URL has none. Lets bookmarks keep working. */
export function mapLegacyBookingParams(
  params: Record<string, string | undefined>,
): Record<string, string | undefined> | null {
  const legacy = [
    "paid",
    "unpaid",
    "assigned",
    "unassigned",
    "stuck",
    "completed",
    "future",
    "flightInfo",
  ];
  if (!legacy.some((k) => params[k] === "1")) return null;

  const next: Record<string, string | undefined> = { ...params };
  for (const k of legacy) delete next[k];

  if (params.paid === "1") next.payment = "paid";
  else if (params.unpaid === "1") next.payment = "unpaid";
  if (params.unassigned === "1") next.assignment = "unassigned";
  else if (params.assigned === "1") next.assignment = "assigned";
  if (params.flightInfo === "1") next.flight = "yes";
  if (params.stuck === "1") next.status = "STUCK";

  const dropDates = () => {
    delete next.month;
    delete next.from;
    delete next.to;
  };
  if (params.completed === "1") {
    next.status = "COMPLETED";
    next.range = "all";
    dropDates();
  }
  if (params.future === "1") {
    next.range = "upcoming";
    dropDates();
  }
  delete next.page;
  return next;
}
