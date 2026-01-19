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

export default async function AdminNewBookingPage() {
  const [serviceTypes, vehicles, blackoutRows] = await Promise.all([
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
            lat: true,
            lng: true,
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
  ]);

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
      />
    </section>
  );
}
