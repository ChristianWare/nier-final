// scripts/clearData.ts
// Clears all test/booking data while preserving:
//   - Users, accounts, sessions (your admin/driver accounts)
//   - CompanySettings, Vehicle, VehicleUnit, ServiceType, ServiceFee, Airport (your config)
//
// Run with: npx tsx scripts/clearData.ts

import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  console.log("🗑️  Clearing test data...");

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

  await db.notificationJob.deleteMany();
  console.log("  ✓ notificationJob");

  await db.adminNotificationSettings.deleteMany();
  console.log("  ✓ adminNotificationSettings");

  await db.pushSubscription.deleteMany();
  console.log("  ✓ pushSubscription");

  await db.userPushPreferences.deleteMany();
  console.log("  ✓ userPushPreferences");

  await db.blackoutDate.deleteMany();
  console.log("  ✓ blackoutDate");

  console.log("\n✅ Done! The following were preserved:");
  console.log("   - Users, accounts, sessions");
  console.log("   - CompanySettings");
  console.log("   - Vehicles, VehicleUnits");
  console.log("   - ServiceTypes, ServiceFees");
  console.log("   - Airports");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
