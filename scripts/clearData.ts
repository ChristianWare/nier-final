// scripts/clearData.ts
// Clears ALL data except users, accounts, and sessions.
//
// Run with: npx tsx scripts/clearData.ts

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  console.log("🗑️  Clearing all data (keeping users)...");

  // ── Corporate ────────────────────────────────────────────
  await db.corporateInvoiceEvent.deleteMany();
  console.log("  ✓ corporateInvoiceEvent");

  await db.corporateInvoiceLineItem.deleteMany();
  console.log("  ✓ corporateInvoiceLineItem");

  await db.corporateInvoice.deleteMany();
  console.log("  ✓ corporateInvoice");

  await db.corporateInquiry.deleteMany();
  console.log("  ✓ corporateInquiry");

  await db.corporatePassenger.deleteMany();
  console.log("  ✓ corporatePassenger");

  await db.corporateContact.deleteMany();
  console.log("  ✓ corporateContact");

  await db.corporateAccount.deleteMany();
  console.log("  ✓ corporateAccount");

  // ── Bookings ─────────────────────────────────────────────
  await db.bookingNote.deleteMany();
  console.log("  ✓ bookingNote");

  await db.bookingAddon.deleteMany();
  console.log("  ✓ bookingAddon");

  await db.bookingFee.deleteMany();
  console.log("  ✓ bookingFee");

  await db.bookingStop.deleteMany();
  console.log("  ✓ bookingStop");

  await db.bookingStatusEvent.deleteMany();
  console.log("  ✓ bookingStatusEvent");

  await db.payment.deleteMany();
  console.log("  ✓ payment");

  await db.assignment.deleteMany();
  console.log("  ✓ assignment");

  await db.booking.deleteMany();
  console.log("  ✓ booking");

  await db.tripGroup.deleteMany();
  console.log("  ✓ tripGroup");

  // ── Notifications & Push ─────────────────────────────────
  await db.notificationJob.deleteMany();
  console.log("  ✓ notificationJob");

  await db.adminNotificationSettings.deleteMany();
  console.log("  ✓ adminNotificationSettings");

  await db.pushSubscription.deleteMany();
  console.log("  ✓ pushSubscription");

  await db.userPushPreferences.deleteMany();
  console.log("  ✓ userPushPreferences");

  // ── Config ───────────────────────────────────────────────
  await db.blackoutDate.deleteMany();
  console.log("  ✓ blackoutDate");

  await db.bookingFee.deleteMany().catch(() => null);

  await db.serviceFee.deleteMany();
  console.log("  ✓ serviceFee");

  await db.serviceType.deleteMany();
  console.log("  ✓ serviceType");

  await db.airport.deleteMany();
  console.log("  ✓ airport");

  await db.vehicleUnit.deleteMany();
  console.log("  ✓ vehicleUnit");

  await db.vehicle.deleteMany();
  console.log("  ✓ vehicle");

  await db.companySettings.deleteMany();
  console.log("  ✓ companySettings");

  console.log("\n✅ Done! Only users, accounts, and sessions were preserved.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
