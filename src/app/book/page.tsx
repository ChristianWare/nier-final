import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import BookingWizard from "@/components/BookingPage/BookWizard/BookWizard";
import BookingPageIntro from "@/components/BookingPage/BookingPageIntro/BookingPageIntro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BookPage() {
  const session = await auth();
  if (!session) redirect("/login?next=/book");

  const serviceTypes = await db.serviceType.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      pricingStrategy: true,

      // pricing
      minFareCents: true,
      baseFeeCents: true,
      perMileCents: true,
      perMinuteCents: true,
      perHourCents: true,

      // ✅ include these so types match
      active: true,
      sortOrder: true,
    },
  });

  const vehicles = await db.vehicle.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      capacity: true,
      luggageCapacity: true,
      imageUrl: true,

      // ✅ REQUIRED for hourly minHours logic
      minHours: true,

      // pricing
      baseFareCents: true,
      perMileCents: true,
      perMinuteCents: true,
      perHourCents: true,

      // ✅ include these so types match
      active: true,
      sortOrder: true,
    },
  });

  return (
    <main>
      <BookingPageIntro />
      <BookingWizard serviceTypes={serviceTypes} vehicles={vehicles} />
    </main>
  );
}
