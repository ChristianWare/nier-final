// scripts/repair-trip-statuses.ts
//
// One-off check for trips that are paid in full but still have rides showing
// "Payment due". Before a fix to the payment webhook, paying for a trip of 3
// or more rides only confirmed some of its rides, so the rest stayed on
// "Payment due" even though the trip was paid.
//
//   Report only (changes nothing):   npx tsx scripts/repair-trip-statuses.ts
//   Write the corrections:           npx tsx scripts/repair-trip-statuses.ts --apply
//
// "Paid in full" uses the same rule as the webhook: the money paid on the
// trip's rides covers the trip's total. Each stuck ride becomes "Driver
// assigned" if it has a driver, otherwise "Confirmed", and gets a timeline
// entry saying why. A ride is only changed if it's still on "Payment due"
// at that moment. Safe to run more than once.

import { PrismaClient, type BookingStatus } from "@prisma/client";

type Client = PrismaClient;

export type TripStatusFinding = {
  tripId: string;
  label: string;
  customer: string;
  totalCents: number;
  paidCents: number;
  /** The trip's own record still says it isn't paid. */
  tripRecordStale: boolean;
  stuck: { bookingId: string; pickupAt: Date; next: BookingStatus }[];
};

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export async function findTripStatusProblems(
  client: Client,
): Promise<TripStatusFinding[]> {
  const trips = await client.tripGroup.findMany({
    select: {
      id: true,
      label: true,
      paymentStatus: true,
      guestName: true,
      user: { select: { name: true, email: true } },
      bookings: {
        where: { deletedAt: null },
        orderBy: { pickupAt: "asc" },
        select: {
          id: true,
          status: true,
          pickupAt: true,
          totalCents: true,
          guestName: true,
          payment: { select: { amountPaidCents: true } },
          assignment: { select: { id: true } },
        },
      },
    },
  });

  const findings: TripStatusFinding[] = [];
  for (const t of trips) {
    const total = t.bookings.reduce((s, b) => s + b.totalCents, 0);
    const paid = t.bookings.reduce(
      (s, b) => s + (b.payment?.amountPaidCents ?? 0),
      0,
    );
    if (total <= 0 || paid < total) continue;
    const stuck = t.bookings
      .filter((b) => b.status === "PENDING_PAYMENT")
      .map((b) => ({
        bookingId: b.id,
        pickupAt: b.pickupAt,
        next: (b.assignment ? "ASSIGNED" : "CONFIRMED") as BookingStatus,
      }));
    const tripRecordStale = t.paymentStatus !== "PAID";
    if (stuck.length === 0 && !tripRecordStale) continue;
    findings.push({
      tripId: t.id,
      label: t.label ?? `${t.bookings.length}-ride trip`,
      customer:
        t.user?.name?.trim() ||
        t.guestName?.trim() ||
        t.bookings[0]?.guestName?.trim() ||
        t.user?.email ||
        "Customer",
      totalCents: total,
      paidCents: paid,
      tripRecordStale,
      stuck,
    });
  }
  return findings;
}

export function describeTripFinding(f: TripStatusFinding): string {
  const lines = [
    `${f.customer} · ${f.label} · trip ${f.tripId}`,
    `  Paid ${money(f.paidCents)} of ${money(f.totalCents)} (paid in full)`,
  ];
  if (f.tripRecordStale)
    lines.push("  The trip itself isn't marked paid yet → mark it paid");
  for (const s of f.stuck) {
    const next = s.next === "ASSIGNED" ? "Driver assigned" : "Confirmed";
    lines.push(
      `  Ride ${s.bookingId} (pickup ${s.pickupAt.toISOString().slice(0, 10)}): Payment due → ${next}`,
    );
  }
  return lines.join("\n");
}

export async function applyTripStatusRepairs(
  client: Client,
  findings: TripStatusFinding[],
): Promise<{ ridesFixed: number; tripsMarkedPaid: number }> {
  let ridesFixed = 0;
  let tripsMarkedPaid = 0;
  for (const f of findings) {
    if (f.tripRecordStale) {
      const res = await client.tripGroup.updateMany({
        where: { id: f.tripId, NOT: { paymentStatus: "PAID" } },
        data: {
          paymentStatus: "PAID",
          amountPaidCents: f.paidCents,
          paidAt: new Date(),
        },
      });
      tripsMarkedPaid += res.count;
    }
    for (const s of f.stuck) {
      // Only if it's still on "Payment due" right now.
      const res = await client.booking.updateMany({
        where: { id: s.bookingId, status: "PENDING_PAYMENT" },
        data: { status: s.next },
      });
      if (res.count === 0) continue;
      ridesFixed += 1;
      await client.bookingStatusEvent.create({
        data: {
          bookingId: s.bookingId,
          status: s.next,
          eventType: "PAYMENT_RECEIVED",
          metadata: {
            note: "Confirmed by repair: the trip was already paid in full",
            groupId: f.tripId,
            repair: "repair-trip-statuses",
          },
        },
      });
    }
  }
  return { ridesFixed, tripsMarkedPaid };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const client = new PrismaClient();
  try {
    const findings = await findTripStatusProblems(client);
    if (findings.length === 0) {
      console.log(
        "No paid trips have rides stuck on Payment due. Nothing to do.",
      );
      return;
    }
    const rides = findings.reduce((s, f) => s + f.stuck.length, 0);
    console.log(
      `${findings.length} paid trip(s) to correct, with ${rides} ride(s) still on Payment due:\n`,
    );
    for (const f of findings) console.log(describeTripFinding(f) + "\n");
    if (!apply) {
      console.log(
        "Report only. Nothing was changed. Re-run with --apply to write the corrections.",
      );
      return;
    }
    const res = await applyTripStatusRepairs(client, findings);
    console.log(
      `Corrected ${res.ridesFixed} ride(s) and marked ${res.tripsMarkedPaid} trip(s) paid.`,
    );
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1]?.includes("repair-trip-statuses")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
