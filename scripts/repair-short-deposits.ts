// scripts/repair-short-deposits.ts
//
// Finds deposits that were paid WITH A TIP before the Stripe webhook fix.
// The old webhook recorded those as "deposit minus tip" toward the fare, so
// the booking's balance came out too high by the tip.
//
//   Report only (changes nothing):   npx tsx scripts/repair-short-deposits.ts
//   Write the corrections:           npx tsx scripts/repair-short-deposits.ts --apply
//
// The correction is the same in every case: add the tip back to what the
// booking's payment record says was paid toward the fare.
//   - Balance not paid yet   -> the balance drops to the right amount.
//   - Balance already paid   -> the booking shows as overpaid by the tip, which
//                               is true: that customer is owed a refund.
// Safe to run more than once: corrected payments are marked and skipped.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

type Client = PrismaClient;

export type ShortDeposit = {
  bookingId: string;
  tripGroupId: string | null;
  customer: string;
  /** The payments that were recorded short. */
  events: Array<{
    id: string;
    paidOn: Date;
    depositCents: number;
    tipCents: number;
  }>;
  /** Total to add back (the tips). */
  shortfallCents: number;
  /** "Paid toward fare" on this booking's payment record today. */
  recordedPaidCents: number;
  /** What it should say. */
  correctedPaidCents: number;
  /** The bill: this booking, or the whole trip for a multi-ride booking. */
  billTotalCents: number;
  /** Collected on that bill once corrected. */
  billPaidAfterCents: number;
  /** Still owed once corrected (never negative). */
  balanceAfterCents: number;
  /** More than the bill was collected: this much is owed back. */
  overpaidCents: number;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * The old webhook's fingerprint: on a deposit paid with a tip it logged
 * "fare = deposit − tip". The fixed webhook logs "fare = deposit".
 */
function shortfallOf(metadata: any): number {
  if (!metadata || typeof metadata !== "object") return 0;
  if (metadata.isDepositPayment !== true || metadata.shortfallRepaired)
    return 0;
  const tip = Number(metadata.tipCents);
  const deposit = Number(metadata.depositAmountCents);
  const fare = Number(metadata.baseFareCents);
  if (!(tip > 0) || !Number.isFinite(deposit) || !Number.isFinite(fare))
    return 0;
  return fare === deposit - tip ? tip : 0;
}

export async function findShortDeposits(
  client: Client,
): Promise<ShortDeposit[]> {
  const events = await client.bookingStatusEvent.findMany({
    where: { eventType: "PAYMENT_RECEIVED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, bookingId: true, createdAt: true, metadata: true },
  });

  // Group the short payments by booking.
  const byBooking = new Map<string, ShortDeposit["events"]>();
  for (const e of events) {
    const tip = shortfallOf(e.metadata);
    if (tip <= 0) continue;
    const list = byBooking.get(e.bookingId) ?? [];
    list.push({
      id: e.id,
      paidOn: e.createdAt,
      depositCents: Number((e.metadata as any).depositAmountCents),
      tipCents: tip,
    });
    byBooking.set(e.bookingId, list);
  }

  const shortfallFor = (bookingId: string) =>
    (byBooking.get(bookingId) ?? []).reduce((sum, e) => sum + e.tipCents, 0);

  const findings: ShortDeposit[] = [];
  for (const [bookingId, shortEvents] of byBooking) {
    const booking = await client.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        totalCents: true,
        tripGroupId: true,
        guestEmail: true,
        user: { select: { email: true } },
        payment: { select: { amountPaidCents: true } },
      },
    });
    if (!booking?.payment) continue; // nothing recorded to correct

    const shortfallCents = shortfallFor(bookingId);
    const recordedPaidCents = booking.payment.amountPaidCents;
    const correctedPaidCents = recordedPaidCents + shortfallCents;

    let billTotalCents = booking.totalCents;
    let billPaidAfterCents = correctedPaidCents;

    if (booking.tripGroupId) {
      const group = await client.tripGroup.findUnique({
        where: { id: booking.tripGroupId },
        select: {
          bookings: {
            select: {
              id: true,
              totalCents: true,
              payment: { select: { amountPaidCents: true } },
            },
          },
        },
      });
      const rides = group?.bookings ?? [];
      billTotalCents = rides.reduce((sum, r) => sum + r.totalCents, 0);
      billPaidAfterCents = rides.reduce(
        (sum, r) =>
          sum + (r.payment?.amountPaidCents ?? 0) + shortfallFor(r.id),
        0,
      );
    }

    findings.push({
      bookingId,
      tripGroupId: booking.tripGroupId,
      customer: booking.user?.email ?? booking.guestEmail ?? "(no email)",
      events: shortEvents,
      shortfallCents,
      recordedPaidCents,
      correctedPaidCents,
      billTotalCents,
      billPaidAfterCents,
      balanceAfterCents: Math.max(0, billTotalCents - billPaidAfterCents),
      overpaidCents: Math.max(0, billPaidAfterCents - billTotalCents),
    });
  }

  return findings;
}

/** Writes the corrections for the given findings. */
export async function applyShortDepositRepairs(
  client: Client,
  findings: ShortDeposit[],
): Promise<void> {
  for (const f of findings) {
    await client.$transaction(async (tx) => {
      await tx.payment.update({
        where: { bookingId: f.bookingId },
        data: { amountPaidCents: { increment: f.shortfallCents } },
      });

      for (const e of f.events) {
        const event = await tx.bookingStatusEvent.findUnique({
          where: { id: e.id },
          select: { metadata: true },
        });
        const metadata = (event?.metadata ?? {}) as Record<string, any>;
        await tx.bookingStatusEvent.update({
          where: { id: e.id },
          data: {
            metadata: {
              ...metadata,
              // what the customer actually paid, and how it splits
              amountCents: e.depositCents + e.tipCents,
              baseFareCents: e.depositCents,
              shortfallRepaired: true,
              shortfallRepairedAt: new Date().toISOString(),
            },
          },
        });
      }
    });
  }

  // Bring each affected trip's own record in line with its rides, the same
  // way the webhook does after a payment.
  const tripIds = [
    ...new Set(findings.map((f) => f.tripGroupId).filter(Boolean)),
  ] as string[];
  for (const tripId of tripIds) {
    const group = await client.tripGroup.findUnique({
      where: { id: tripId },
      select: {
        paymentStatus: true,
        bookings: {
          select: {
            totalCents: true,
            payment: { select: { amountPaidCents: true } },
          },
        },
      },
    });
    if (!group) continue;
    const total = group.bookings.reduce((sum, b) => sum + b.totalCents, 0);
    const paid = group.bookings.reduce(
      (sum, b) => sum + (b.payment?.amountPaidCents ?? 0),
      0,
    );
    const nowCovered = paid >= total && total > 0;
    const alreadyPaid = group.paymentStatus === "PAID";
    await client.tripGroup.update({
      where: { id: tripId },
      data: {
        amountPaidCents: paid,
        totalCents: total,
        // never downgrade a trip that is already marked paid (e.g. by cash)
        ...(nowCovered && !alreadyPaid
          ? { paymentStatus: "PAID", paidAt: new Date() }
          : {}),
      },
    });
  }
}

export function describeFinding(f: ShortDeposit): string {
  const lines = [
    `Booking ${f.bookingId}${f.tripGroupId ? ` (trip ${f.tripGroupId})` : ""} · ${f.customer}`,
    ...f.events.map(
      (e) =>
        `  ${e.paidOn.toISOString().slice(0, 10)}: deposit ${money(e.depositCents)} + tip ${money(e.tipCents)}, recorded ${money(e.tipCents)} short`,
    ),
    `  Paid toward fare: recorded ${money(f.recordedPaidCents)}, should be ${money(f.correctedPaidCents)}`,
  ];
  if (f.overpaidCents > 0) {
    lines.push(
      `  Result: the ${f.tripGroupId ? "trip" : "booking"} was overpaid by ${money(f.overpaidCents)}. REFUND DUE to the customer.`,
    );
  } else if (f.balanceAfterCents > 0) {
    lines.push(
      `  Result: ${money(f.balanceAfterCents)} still owed of ${money(f.billTotalCents)}.`,
    );
  } else {
    lines.push(`  Result: paid in full (${money(f.billTotalCents)}).`);
  }
  return lines.join("\n");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const client = new PrismaClient();
  try {
    const findings = await findShortDeposits(client);
    if (findings.length === 0) {
      console.log("No deposits were recorded short. Nothing to do.");
      return;
    }

    console.log(
      `${findings.length} booking(s) have a deposit that was recorded short:\n`,
    );
    for (const f of findings) console.log(describeFinding(f) + "\n");

    const refunds = findings.filter((f) => f.overpaidCents > 0);
    if (refunds.length > 0) {
      console.log(
        `${refunds.length} of these already paid the inflated balance. Total to refund: ${money(refunds.reduce((sum, f) => sum + f.overpaidCents, 0))}.\n`,
      );
    }

    if (!apply) {
      console.log(
        "Report only. Nothing was changed. Re-run with --apply to write these corrections.",
      );
      return;
    }

    await applyShortDepositRepairs(client, findings);
    console.log(`Corrected ${findings.length} booking(s).`);
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1]?.includes("repair-short-deposits")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
