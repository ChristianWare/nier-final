/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import BookingWizard from "@/components/BookingPage/BookWizard/BookWizard";
import BookingPageIntro from "@/components/BookingPage/BookingPageIntro/BookingPageIntro";
import Nav from "@/components/shared/Nav/Nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BookPage() {
  // ✅ Get current user session
  const session = await auth();
  const userId = (session?.user as { id?: string } | null)?.id ?? null;

  // ✅ Fetch user's phone if logged in
  let userPhone: string | null = null;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });
    userPhone = user?.phone ?? null;
  }

  const serviceTypesRaw = await db.serviceType.findMany({
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

      active: true,
      sortOrder: true,

      // ✅ airport behavior
      airportLeg: true,
      airports: {
        where: {
          active: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          iata: true,
          address: true,
          placeId: true,
          lat: true,
          lng: true,
        },
      },
    },
  });

  // ✅ Convert Decimal -> number so props are safe for Client Components
  const serviceTypes = serviceTypesRaw.map((s) => ({
    ...s,
    airports: (s.airports ?? []).map((a) => ({
      ...a,
      lat: a.lat == null ? null : Number(a.lat),
      lng: a.lng == null ? null : Number(a.lng),
    })),
  }));

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

      minHours: true,

      baseFareCents: true,
      perMileCents: true,
      perMinuteCents: true,
      perHourCents: true,

      active: true,
      sortOrder: true,
    },
  });

  return (
    <main>
      <Nav background='white' />
      <BookingPageIntro />
      <BookingWizard
        serviceTypes={serviceTypes as any}
        vehicles={vehicles as any}
        userPhone={userPhone}
      />
    </main>
  );
}
