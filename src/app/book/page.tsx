/* eslint-disable @typescript-eslint/no-explicit-any */
import BookingPageInfo from "@/components/BookingPage/BookingPageInfo/BookingPageInfo";
import { bookingLinkPrefill } from "@/lib/booking/linkPrefill";
import { PUBLIC_VEHICLE_WHERE } from "@/lib/booking/partnerVehicles";
import { db } from "@/lib/db";
import { auth } from "../../../auth";
import BookingWizard from "@/components/BookingPage/BookWizard/BookWizard";
import BookingPageIntro from "@/components/BookingPage/BookingPageIntro/BookingPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import { getCompanySettings } from "../../../actions/admin/companySettings";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a Black Car in Phoenix: Instant Flat-Rate Quote | Nier",
  description:
    "Book a black car, SUV or Sprinter in Phoenix online: an instant flat-rate quote, flight tracking on airport rides and a professional chauffeur. Phoenix, Scottsdale and the Valley, 24/7.",
  alternates: { canonical: "https://www.niertransportation.com/book" },
};

export default async function BookPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A share link (/book?code=SMOKEN26) fills in the discount code.
  const sp = (await searchParams) ?? {};
  const initialDiscountCode =
    typeof sp.code === "string" ? sp.code.slice(0, 30) : undefined;
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

  const companySettings = await getCompanySettings();

  const TIMEZONE_SHORT_LABELS: Record<string, string> = {
    "America/Phoenix": "Phoenix, AZ (MST)",
    "America/New_York": "Eastern (ET)",
    "America/Chicago": "Central (CT)",
    "America/Denver": "Mountain (MT)",
    "America/Los_Angeles": "Pacific (PT)",
    "America/Anchorage": "Alaska (AKT)",
    "Pacific/Honolulu": "Hawaii (HST)",
  };

  const companyTimezoneLabel =
    TIMEZONE_SHORT_LABELS[companySettings.timezone] ?? companySettings.timezone;

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
      minHours: true, // ✅ NEW

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

      // ✅ NEW: Include fees
      fees: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          amountCents: true,
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
    // ✅ NEW: Include fees (already plain objects, no conversion needed)
    fees: s.fees ?? [],
  }));

  // A link like /book?trip=from-airport&airport=PHX opens the tool filled in.
  const initialPrefill = bookingLinkPrefill(sp, serviceTypes);

  const vehicles = await db.vehicle.findMany({
    where: PUBLIC_VEHICLE_WHERE,
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
      callForPricing: true,
      callForPricingMessage: true,
    },
  });

  return (
    <DirtyFormProvider>
      <main>
        <Nav background='white' />
        <BookingPageIntro />
        <BookingWizard
          serviceTypes={serviceTypes as any}
          vehicles={vehicles as any}
          userPhone={userPhone}
          companyTimezone={companySettings.timezone}
          companyTimezoneLabel={companyTimezoneLabel}
          initialDiscountCode={initialDiscountCode}
          initialPrefill={initialPrefill}
        />
        <BookingPageInfo />
      </main>
    </DirtyFormProvider>
  );
}
