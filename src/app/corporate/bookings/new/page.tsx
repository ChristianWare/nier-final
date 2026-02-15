/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import { auth } from "../../../../../auth";
import { redirect } from "next/navigation";
import CorporateNewBookingWizard from "@/components/corporate/CorporateNewBookingWizard/CorporateNewBookingWizard";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ymdInTimezone(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function decToNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "object" && typeof v.toNumber === "function") {
    const n = v.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function CorporateNewBookingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/corporate/bookings/new");

  const userId = (session.user as any)?.id;
  if (!userId) redirect("/login?next=/corporate/bookings/new");

  const contact = await db.corporateContact.findFirst({
    where: { userId, active: true },
    select: {
      id: true,
      corporateAccountId: true,
      corporateAccount: {
        select: {
          id: true,
          name: true,
          status: true,
          discountPercent: true,
          billingCycle: true,
          paymentTerms: true,
        },
      },
    },
  });

  if (!contact?.corporateAccount) redirect("/corporate");

  const account = contact.corporateAccount;

  if (account.status !== "ACTIVE") {
    redirect("/corporate");
  }

  const { timezone: companyTz } = await getCompanySettings();

  const now = new Date();
  const horizon = addDays(now, 120);

  const [serviceTypes, vehicles, blackouts, passengers] = await Promise.all([
    db.serviceType.findMany({
      where: { active: true },
      include: {
        airports: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
        },
        fees: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),

    db.vehicle.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),

    db.blackoutDate.findMany({
      where: {
        ymd: {
          gte: ymdInTimezone(now, companyTz),
          lte: ymdInTimezone(horizon, companyTz),
        },
      },
      select: { ymd: true },
    }),

    db.corporatePassenger.findMany({
      where: {
        corporateAccountId: account.id,
        active: true,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        department: true,
      },
    }),
  ]);

  const blackoutsByYmd: Record<string, boolean> = {};
  for (const b of blackouts) blackoutsByYmd[b.ymd] = true;

  const serializedServiceTypes = serviceTypes.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    pricingStrategy: s.pricingStrategy as string,
    minFareCents: s.minFareCents,
    baseFeeCents: s.baseFeeCents,
    perMileCents: s.perMileCents,
    perMinuteCents: s.perMinuteCents,
    perHourCents: s.perHourCents,
    minHours: s.minHours ?? 0,
    active: s.active,
    sortOrder: s.sortOrder,
    airportLeg: s.airportLeg as string,
    airports: s.airports.map((a) => ({
      id: a.id,
      name: a.name,
      iata: a.iata,
      address: a.address,
      placeId: a.placeId ?? null,
      lat: decToNumber(a.lat),
      lng: decToNumber(a.lng),
    })),
    fees: (s.fees ?? []).map((f) => ({
      id: f.id,
      label: f.label,
      amountCents: f.amountCents,
    })),
  }));

  const serializedVehicles = vehicles.map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    capacity: v.capacity,
    luggageCapacity: v.luggageCapacity,
    imageUrl: v.imageUrl,
    minHours: v.minHours,
    baseFareCents: v.baseFareCents,
    perMileCents: v.perMileCents,
    perMinuteCents: v.perMinuteCents,
    perHourCents: v.perHourCents,
    active: v.active,
    sortOrder: v.sortOrder,
    callForPricing: v.callForPricing,
    callForPricingMessage: v.callForPricingMessage,
  }));

  const corporateAccountData = {
    id: account.id,
    name: account.name,
    discountPercent: account.discountPercent
      ? Number(account.discountPercent)
      : 0,
    billingCycle: account.billingCycle,
    paymentTerms: account.paymentTerms,
  };

  return (
    <CorporateNewBookingWizard
      serviceTypes={serializedServiceTypes as any}
      vehicles={serializedVehicles as any}
      blackoutsByYmd={blackoutsByYmd}
      passengers={passengers}
      corporateAccount={corporateAccountData}
      companyTimezone={companyTz}
    />
  );
}
