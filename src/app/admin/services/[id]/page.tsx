import styles from "./EditServicePage.module.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  updateService,
  deleteService,
} from "../../../../../actions/admin/services";
import EditServiceForm, {
  type ActionResult,
} from "@/components/admin/EditServiceForm/EditServiceForm";
import Arrow from "@/components/shared/icons/Arrow/Arrow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AirportLegUI = "NONE" | "PICKUP" | "DROPOFF";

function normalizeAirportLeg(v: unknown): AirportLegUI {
  if (v === "PICKUP") return "PICKUP";
  if (v === "DROPOFF") return "DROPOFF";
  return "NONE";
}

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [serviceRaw, airportsRaw] = await Promise.all([
    db.serviceType.findUnique({
      where: { id },
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
        sortOrder: true,
        active: true,
        airportLeg: true,
        airports: { select: { id: true } },
      },
    }),
    db.airport.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, iata: true, address: true },
      take: 500,
    }),
  ]);

  if (!serviceRaw) notFound();

  const service = {
    id: serviceRaw.id,
    name: serviceRaw.name,
    slug: serviceRaw.slug,
    pricingStrategy: serviceRaw.pricingStrategy,
    minFareCents: serviceRaw.minFareCents,
    baseFeeCents: serviceRaw.baseFeeCents,
    perMileCents: serviceRaw.perMileCents,
    perMinuteCents: serviceRaw.perMinuteCents,
    perHourCents: serviceRaw.perHourCents,
    sortOrder: serviceRaw.sortOrder,
    active: serviceRaw.active,
    airportLeg: normalizeAirportLeg(serviceRaw.airportLeg),
    airportIds: (serviceRaw.airports ?? []).map((a) => a.id),
  };

  const airports = airportsRaw.map((a) => ({
    id: a.id,
    name: a.name,
    iata: a.iata,
    address: a.address,
  }));

  async function updateAction(formData: FormData): Promise<ActionResult> {
    "use server";
    try {
      const res = await updateService(id, formData);
      return (res ?? { success: "ok" }) as ActionResult;
    } catch {
      return { error: "Failed to update service." };
    }
  }

  async function deleteAction(): Promise<ActionResult> {
    "use server";
    try {
      const res = await deleteService(id);
      return (res ?? { success: "ok" }) as ActionResult;
    } catch {
      return { error: "Failed to delete service." };
    }
  }

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={`${styles.heading} h2`}>Edit service</h1>
          <div className={styles.meta}>
            {/* <span className={styles.mono}>{service.id}</span> */}
          </div>
        </div>

        <div className={styles.headerActions}>
          <Link href='/admin/services' className='backBtn'>
            <Arrow className='backArrow' /> Back
          </Link>
        </div>
      </header>

      <EditServiceForm
        service={service}
        airports={airports}
        onUpdate={updateAction}
        onDelete={deleteAction}
      />
    </section>
  );
}
