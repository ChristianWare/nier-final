// scripts/repair-short-deposits.ts
//
// One-off check of booking payment records for two mistakes made by code that
// has since been fixed.
//
//   1. A deposit paid WITH A TIP was recorded as "deposit minus tip" toward
//      the fare, so the balance came out too high by the tip.
//
//   2. A payment made with a saved card (the customer's "Pay with saved card",
//      or the admin's "Charge card on file") was written twice: once by the
//      button and once by the Stripe webhook. That doubled the tip, and on a
//      balance payment it also counted the charge twice toward the fare.
//
//   Report only (changes nothing):   npx tsx scripts/repair-short-deposits.ts
//   Write the corrections:           npx tsx scripts/repair-short-deposits.ts --apply
//
// Every correction is worked out from the payment history on the booking's
// timeline. If a payment record does not match that history (something else
// has changed it since), the booking is listed for a manual look and is NOT
// changed. Safe to run more than once: corrected payments are marked and
// skipped.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

type Client = PrismaClient;

type TimelineEvent = {
  id: string;
  bookingId: string;
  createdAt: Date;
  metadata: any;
};

export type PaymentRecordFinding = {
  bookingId: string;
  tripGroupId: string | null;
  customer: string;
  /** Deposits recorded short by their tip. */
  shortDeposits: Array<{
    eventId: string;
    paidOn: Date;
    depositCents: number;
    tipCents: number;
  }>;
  /** Saved-card payments written by both the button and the webhook. */
  recordedTwice: Array<{
    /** The webhook's timeline entry for the payment. */
    eventId: string;
    paymentIntentId: string;
    paidOn: Date;
    chargedCents: number;
    tipCents: number;
    /** The whole charge was added to "paid toward fare" a second time. */
    fareCountedTwice: boolean;
  }>;
  /** "Paid toward fare" on the booking's payment record today, and corrected. */
  recordedPaidCents: number;
  correctedPaidCents: number;
  /** Tips on the booking's payment record today, and corrected. */
  recordedTipCents: number;
  correctedTipCents: number;
  /**
   * Set when the record does not match its own payment history, so nothing
   * can safely be worked out. The booking is reported and left alone.
   */
  needsManualLook: string | null;
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

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Mistake 1's fingerprint: on a deposit paid with a tip the old webhook logged
 * "fare = deposit − tip". The fixed webhook logs "fare = deposit".
 */
function shortfallOf(metadata: any): number {
  if (!metadata || typeof metadata !== "object") return 0;
  if (metadata.isDepositPayment !== true || metadata.shortfallRepaired)
    return 0;
  const tip = num(metadata.tipCents);
  const deposit = num(metadata.depositAmountCents);
  const fare = num(metadata.baseFareCents);
  if (!(tip > 0) || Number.isNaN(deposit) || Number.isNaN(fare)) return 0;
  return fare === deposit - tip ? tip : 0;
}

/**
 * Mistake 2. The button's own timeline entry says method "card_on_file"; the
 * webhook's says "online". A payment (Stripe PaymentIntent) that has both was
 * written twice.
 *
 * Each webhook entry logs what the record said before it ran and after. When
 * the button wrote first, "before" already included the button's charge:
 *   - first payment:   the webhook replaced the paid figure (so that is right)
 *                      but added the tip on top of the button's tip.
 *   - balance payment: the webhook added the fare on top of the button's
 *                      charge, so the whole charge is in the record twice.
 * The correct tips are simply the tips of each distinct payment added up.
 */
function analyseRecordedTwice(
  events: TimelineEvent[],
  row: { amountPaidCents: number; tipCents: number },
): {
  recordedTwice: PaymentRecordFinding["recordedTwice"];
  excessPaidCents: number;
  correctTipCents: number;
  problem: string | null;
} | null {
  const byButton = new Map<string, any>();
  for (const e of events) {
    const m = e.metadata;
    if (
      m?.method === "card_on_file" &&
      typeof m.stripePaymentIntentId === "string"
    ) {
      byButton.set(m.stripePaymentIntentId, m);
    }
  }
  if (byButton.size === 0) return null;

  // The webhook's entries, oldest first.
  const byWebhook = events.filter(
    (e) =>
      e.metadata?.method === "online" &&
      typeof e.metadata.stripePaymentIntentId === "string" &&
      !Number.isNaN(num(e.metadata.totalPaidCents)),
  );

  const pending = byWebhook.filter(
    (e) =>
      byButton.has(e.metadata.stripePaymentIntentId) &&
      !e.metadata.recordedTwiceRepaired,
  );
  if (pending.length === 0) return null;

  let problem: string | null = null;
  const seen = new Set<string>();
  let previousTotal: number | null = null;
  let excessPaidCents = 0;
  let correctTipCents = 0;
  const recordedTwice: PaymentRecordFinding["recordedTwice"] = [];

  for (const e of byWebhook) {
    const m = e.metadata;
    const paymentIntentId = m.stripePaymentIntentId as string;
    if (seen.has(paymentIntentId)) {
      problem ??= "Stripe reported the same payment more than once";
      continue;
    }
    seen.add(paymentIntentId);

    const tip = Math.max(0, num(m.tipCents) || 0);
    correctTipCents += tip;

    const addsToRecord =
      m.isBalancePayment === true || m.isDepositPayment === true;
    const button = byButton.get(paymentIntentId);
    const charged = button ? num(button.amountCents) : 0;
    let wroteTwice = false;

    if (button) {
      const before = previousTotal ?? 0;
      if (num(m.previouslyPaidCents) === before + charged) {
        wroteTwice = true; // the webhook read the button's own write
      } else {
        problem ??=
          "the button and the webhook did not write in the usual order";
      }
      if (!m.recordedTwiceRepaired) {
        recordedTwice.push({
          eventId: e.id,
          paymentIntentId,
          paidOn: e.createdAt,
          chargedCents: charged,
          tipCents: tip,
          fareCountedTwice: wroteTwice && addsToRecord,
        });
      }
    }

    if (!addsToRecord) {
      // This payment replaced the paid figure, wiping anything before it.
      excessPaidCents = 0;
    } else if (wroteTwice) {
      excessPaidCents += charged;
    }
    previousTotal = num(m.totalPaidCents);
  }

  // Only correct a record that still says what the last payment left on it
  // (plus any deposit corrections this script made afterwards).
  const last = byWebhook[byWebhook.length - 1];
  const depositFixesSince = events
    .filter(
      (e) =>
        e.metadata?.shortfallRepaired === true &&
        new Date(e.metadata.shortfallRepairedAt) > last.createdAt,
    )
    .reduce((sum, e) => sum + (num(e.metadata.tipCents) || 0), 0);
  if (
    row.amountPaidCents !==
      num(last.metadata.totalPaidCents) + depositFixesSince ||
    row.tipCents !== num(last.metadata.totalTipCents)
  ) {
    problem ??= "the payment record has been changed since these payments";
  }

  return { recordedTwice, excessPaidCents, correctTipCents, problem };
}

export async function findPaymentRecordProblems(
  client: Client,
): Promise<PaymentRecordFinding[]> {
  const events: TimelineEvent[] = await client.bookingStatusEvent.findMany({
    where: { eventType: "PAYMENT_RECEIVED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, bookingId: true, createdAt: true, metadata: true },
  });

  const byBooking = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const list = byBooking.get(e.bookingId) ?? [];
    list.push(e);
    byBooking.set(e.bookingId, list);
  }

  type Draft = Omit<
    PaymentRecordFinding,
    | "billTotalCents"
    | "billPaidAfterCents"
    | "balanceAfterCents"
    | "overpaidCents"
  > & { ownTotalCents: number };
  const drafts = new Map<string, Draft>();

  for (const [bookingId, list] of byBooking) {
    const shortDeposits = list
      .map((e) => ({ e, tip: shortfallOf(e.metadata) }))
      .filter((x) => x.tip > 0)
      .map(({ e, tip }) => ({
        eventId: e.id,
        paidOn: e.createdAt,
        depositCents: num(e.metadata.depositAmountCents),
        tipCents: tip,
      }));
    const hasButtonPayment = list.some(
      (e) => e.metadata?.method === "card_on_file",
    );
    if (shortDeposits.length === 0 && !hasButtonPayment) continue;

    const booking = await client.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        totalCents: true,
        tripGroupId: true,
        guestEmail: true,
        user: { select: { email: true } },
        payment: { select: { amountPaidCents: true, tipCents: true } },
      },
    });
    if (!booking?.payment) continue; // nothing recorded to correct

    const row = {
      amountPaidCents: booking.payment.amountPaidCents,
      tipCents: booking.payment.tipCents ?? 0,
    };
    const twice = analyseRecordedTwice(list, row);
    const needsManualLook = twice?.problem ?? null;
    const shortfallCents = shortDeposits.reduce((s, d) => s + d.tipCents, 0);

    const correctedPaidCents = needsManualLook
      ? row.amountPaidCents
      : row.amountPaidCents + shortfallCents - (twice?.excessPaidCents ?? 0);
    const correctedTipCents =
      needsManualLook || !twice ? row.tipCents : twice.correctTipCents;

    const nothingWrong =
      !needsManualLook &&
      correctedPaidCents === row.amountPaidCents &&
      correctedTipCents === row.tipCents;
    if (nothingWrong) continue;

    drafts.set(bookingId, {
      bookingId,
      tripGroupId: booking.tripGroupId,
      customer: booking.user?.email ?? booking.guestEmail ?? "(no email)",
      shortDeposits,
      recordedTwice: twice?.recordedTwice ?? [],
      recordedPaidCents: row.amountPaidCents,
      correctedPaidCents,
      recordedTipCents: row.tipCents,
      correctedTipCents,
      needsManualLook,
      ownTotalCents: booking.totalCents,
    });
  }

  // What each bill looks like once the corrections are in.
  const correctionFor = (bookingId: string) => {
    const d = drafts.get(bookingId);
    return d ? d.correctedPaidCents - d.recordedPaidCents : 0;
  };

  const findings: PaymentRecordFinding[] = [];
  for (const draft of drafts.values()) {
    const { ownTotalCents, ...rest } = draft;
    let billTotalCents = ownTotalCents;
    let billPaidAfterCents = draft.correctedPaidCents;

    if (draft.tripGroupId) {
      const group = await client.tripGroup.findUnique({
        where: { id: draft.tripGroupId },
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
          sum + (r.payment?.amountPaidCents ?? 0) + correctionFor(r.id),
        0,
      );
    }

    findings.push({
      ...rest,
      billTotalCents,
      billPaidAfterCents,
      balanceAfterCents: Math.max(0, billTotalCents - billPaidAfterCents),
      overpaidCents: Math.max(0, billPaidAfterCents - billTotalCents),
    });
  }

  return findings;
}

/**
 * Writes the corrections. Bookings that need a manual look are left alone, and
 * so is any booking whose record changed after the report was worked out.
 * Returns the ids of the bookings it corrected.
 */
export async function applyPaymentRecordRepairs(
  client: Client,
  findings: PaymentRecordFinding[],
): Promise<string[]> {
  const corrected: string[] = [];

  for (const f of findings) {
    if (f.needsManualLook) continue;

    const done = await client.$transaction(async (tx) => {
      // Only write if the record still says what the report was based on.
      const updated = await tx.payment.updateMany({
        where: {
          bookingId: f.bookingId,
          amountPaidCents: f.recordedPaidCents,
          tipCents: f.recordedTipCents,
        },
        data: {
          amountPaidCents: f.correctedPaidCents,
          tipCents: f.correctedTipCents,
        },
      });
      if (updated.count !== 1) return false;

      const stamp = new Date().toISOString();
      for (const d of f.shortDeposits) {
        const event = await tx.bookingStatusEvent.findUnique({
          where: { id: d.eventId },
          select: { metadata: true },
        });
        await tx.bookingStatusEvent.update({
          where: { id: d.eventId },
          data: {
            metadata: {
              ...((event?.metadata ?? {}) as Record<string, any>),
              // what the customer actually paid, and how it splits
              amountCents: d.depositCents + d.tipCents,
              baseFareCents: d.depositCents,
              shortfallRepaired: true,
              shortfallRepairedAt: stamp,
            },
          },
        });
      }
      for (const p of f.recordedTwice) {
        const event = await tx.bookingStatusEvent.findUnique({
          where: { id: p.eventId },
          select: { metadata: true },
        });
        await tx.bookingStatusEvent.update({
          where: { id: p.eventId },
          data: {
            metadata: {
              ...((event?.metadata ?? {}) as Record<string, any>),
              recordedTwiceRepaired: true,
              recordedTwiceRepairedAt: stamp,
            },
          },
        });
      }
      return true;
    });

    if (done) corrected.push(f.bookingId);
  }

  // Bring each affected trip's own record in line with its rides, the same
  // way the webhook does after a payment.
  const tripIds = [
    ...new Set(
      findings
        .filter((f) => corrected.includes(f.bookingId))
        .map((f) => f.tripGroupId)
        .filter(Boolean),
    ),
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
    // A trip already marked paid (cash is recorded on the trip, not on its
    // rides) is left exactly as it is.
    if (!group || group.paymentStatus === "PAID") continue;

    const total = group.bookings.reduce((sum, b) => sum + b.totalCents, 0);
    const paid = group.bookings.reduce(
      (sum, b) => sum + (b.payment?.amountPaidCents ?? 0),
      0,
    );
    const nowCovered = paid >= total && total > 0;
    await client.tripGroup.update({
      where: { id: tripId },
      data: {
        amountPaidCents: paid,
        totalCents: total,
        ...(nowCovered ? { paymentStatus: "PAID", paidAt: new Date() } : {}),
      },
    });
  }

  return corrected;
}

export function describeFinding(f: PaymentRecordFinding): string {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const what = f.tripGroupId ? "trip" : "booking";
  const lines = [
    `Booking ${f.bookingId}${f.tripGroupId ? ` (trip ${f.tripGroupId})` : ""} · ${f.customer}`,
    ...f.shortDeposits.map(
      (d) =>
        `  ${day(d.paidOn)}: deposit ${money(d.depositCents)} + tip ${money(d.tipCents)} was recorded ${money(d.tipCents)} short`,
    ),
    ...f.recordedTwice.map(
      (p) =>
        `  ${day(p.paidOn)}: saved-card payment of ${money(p.chargedCents)} (${p.paymentIntentId}) was recorded twice`,
    ),
  ];

  if (f.needsManualLook) {
    lines.push(
      `  NOT corrected: ${f.needsManualLook}.`,
      `  The record says ${money(f.recordedPaidCents)} paid toward fare and ${money(f.recordedTipCents)} in tips. Compare it with Stripe by hand.`,
    );
    return lines.join("\n");
  }

  if (f.correctedPaidCents !== f.recordedPaidCents) {
    lines.push(
      `  Paid toward fare: recorded ${money(f.recordedPaidCents)}, should be ${money(f.correctedPaidCents)}`,
    );
  }
  if (f.correctedTipCents !== f.recordedTipCents) {
    lines.push(
      `  Tips: recorded ${money(f.recordedTipCents)}, should be ${money(f.correctedTipCents)}`,
    );
  }
  if (f.overpaidCents > 0) {
    lines.push(
      `  Result: the ${what} was overpaid by ${money(f.overpaidCents)}. REFUND DUE to the customer.`,
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
    const findings = await findPaymentRecordProblems(client);
    if (findings.length === 0) {
      console.log("Every payment record matches its history. Nothing to do.");
      return;
    }

    const fixable = findings.filter((f) => !f.needsManualLook);
    const manual = findings.filter((f) => f.needsManualLook);

    if (fixable.length > 0) {
      console.log(`${fixable.length} booking(s) can be corrected:\n`);
      for (const f of fixable) console.log(describeFinding(f) + "\n");
    }
    if (manual.length > 0) {
      console.log(
        `${manual.length} booking(s) need a manual look (never changed by this script):\n`,
      );
      for (const f of manual) console.log(describeFinding(f) + "\n");
    }

    const refunds = fixable.filter((f) => f.overpaidCents > 0);
    if (refunds.length > 0) {
      console.log(
        `${refunds.length} customer(s) paid more than their bill. Total to refund: ${money(refunds.reduce((sum, f) => sum + f.overpaidCents, 0))}.\n`,
      );
    }

    if (!apply) {
      console.log(
        "Report only. Nothing was changed. Re-run with --apply to write the corrections.",
      );
      return;
    }

    const corrected = await applyPaymentRecordRepairs(client, findings);
    console.log(`Corrected ${corrected.length} booking(s).`);
    if (corrected.length < fixable.length) {
      console.log(
        `${fixable.length - corrected.length} booking(s) changed while this was running and were skipped. Run the report again.`,
      );
    }
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
