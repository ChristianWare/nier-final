/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import AdminNewBookingWizard from "@/components/admin/AdminNewBookingWizard/AdminNewBookingWizard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHX_TZ = "America/Phoenix";

function ymdInPhoenix(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PHX_TZ,
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
  const [serviceTypesRaw, vehicles, blackoutRows, drivers, vehicleUnits] =
    await Promise.all([
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
              lat: true, // Decimal
              lng: true, // Decimal
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
        },
      }),

      db.blackoutDate.findMany({
        where: {
          ymd: {
            gte: ymdInPhoenix(new Date()),
            lt: ymdInPhoenix(addDays(new Date(), 365)),
          },
        },
        select: { ymd: true },
      }),

      // ✅ Drivers for Step 4 (Assign)
      db.user.findMany({
        where: { roles: { has: "DRIVER" } },
        select: { id: true, name: true, email: true },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),

      // ✅ Vehicle units for Step 4 (Assign)
      // We fetch all active units and filter client-side once the admin picks a vehicle category.
      db.vehicleUnit.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          plate: true,
          categoryId: true, // so the client can filter by selected vehicleId
        },
        orderBy: { name: "asc" },
        take: 500,
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
  }));

  const blackoutsByYmd: Record<string, boolean> = {};
  for (const b of blackoutRows) blackoutsByYmd[b.ymd] = true;

  return (
    <section className='container' aria-label='New booking'>
      <header className='header'>
        <h1 className='heading h2'>New booking</h1>
        <p className='subheading'>
          Create a booking on behalf of a customer. Blackout dates are blocked.
        </p>
      </header>

      <AdminNewBookingWizard
        serviceTypes={serviceTypes as any}
        vehicles={vehicles as any}
        blackoutsByYmd={blackoutsByYmd}
        drivers={drivers as any}
        vehicleUnits={vehicleUnits as any}
      />
    </section>
  );
}
