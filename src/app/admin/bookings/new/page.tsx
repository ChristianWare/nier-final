/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import AdminNewBookingWizard from "@/components/admin/AdminNewBookingWizard/AdminNewBookingWizard";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import { formatIsoDate } from "@/lib/timezone";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ymdInPhoenix removed — now uses formatIsoDate from lib/timezone

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

// ✅ Prisma Decimal -> number (so Client Components can receive it)
function decToNumber(v: any): number | null {
  if (v == null) return null;

  if (typeof v === "object" && typeof v.toNumber === "function") {
    const n = v.toNumber();
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function AdminNewBookingPage() {
  const companySettings = await getCompanySettings();
  const tz = companySettings.timezone;
  const [
    serviceTypesRaw,
    vehicles,
    blackoutRows,
    drivers,
    vehicleUnits,
    corporateAccountsRaw,
  ] = await Promise.all([
    db.serviceType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        pricingStrategy: true,
        minFareCents: true,
        baseFeeCents: true,
        perMileCents: true,
        perMinuteCents: true,
        perHourCents: true,
        minHours: true,
        active: true,
        sortOrder: true,
        airportLeg: true,
        airports: {
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
    }),

    db.vehicle.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }],
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
    }),

    db.blackoutDate.findMany({
      where: {
        ymd: {
          gte: formatIsoDate(new Date(), tz),
          lt: formatIsoDate(addDays(new Date(), 365), tz),
        },
      },
      select: { ymd: true },
    }),

    // ✅ Drivers for Assign step
    db.user.findMany({
      where: { roles: { has: "DRIVER" } },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),

    // ✅ Vehicle units for Assign step
    db.vehicleUnit.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        plate: true,
        categoryId: true,
      },
      orderBy: { name: "asc" },
      take: 500,
    }),

    // ✅ Corporate accounts with active passengers
    db.corporateAccount.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        discountPercent: true,
        billingCycle: true,
        paymentTerms: true,
        status: true,
        passengers: {
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            department: true,
          },
        },
      },
    }),
  ]);

  // ✅ Convert Decimal -> number BEFORE passing into Client Component
  const serviceTypes = serviceTypesRaw.map((s) => ({
    ...s,
    airports: (s.airports ?? []).map((a) => ({
      ...a,
      lat: decToNumber(a.lat),
      lng: decToNumber(a.lng),
    })),
    fees: s.fees ?? [],
  }));

  // ✅ Serialize corporate accounts (Decimal -> number for discountPercent)
  const corporateAccounts = corporateAccountsRaw.map((a) => ({
    id: a.id,
    name: a.name,
    discountPercent: decToNumber(a.discountPercent),
    billingCycle: a.billingCycle,
    paymentTerms: a.paymentTerms,
    status: a.status,
    passengers: a.passengers.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      department: p.department,
    })),
  }));

  const blackoutsByYmd: Record<string, boolean> = {};
  for (const b of blackoutRows) blackoutsByYmd[b.ymd] = true;

  return (
    <DirtyFormProvider>
      <section className='container' aria-label='New booking'>
        <header className='header'>
          <h1 className='heading h2'>New booking</h1>
          <p className='subheading'>
            Create a booking on behalf of a customer. Blackout dates are
            blocked.
          </p>
        </header>

        <AdminNewBookingWizard
          serviceTypes={serviceTypes as any}
          vehicles={vehicles as any}
          blackoutsByYmd={blackoutsByYmd}
          drivers={drivers as any}
          vehicleUnits={vehicleUnits as any}
          corporateAccounts={corporateAccounts}
          companyTimezone={tz}
        />
      </section>
    </DirtyFormProvider>
  );
}
