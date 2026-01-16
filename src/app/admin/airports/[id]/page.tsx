import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import AirportForm from "@/components/admin/AirportForm/AirportForm";
import {
  updateAirport,
  deleteAirport,
} from "../../../../../actions/admin/airports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditAirportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const airport = await db.airport.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      iata: true,
      address: true,
      placeId: true,
      sortOrder: true,
      active: true,
      lat: true,
      lng: true,
    },
  });

  if (!airport) notFound();

  // ✅ This is a real server action (can be passed to a Client Component)
  async function updateAction(formData: FormData) {
    "use server";
    return updateAirport(id, formData);
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const confirm = String(formData.get("confirm") ?? "").trim();
    if (confirm !== "DELETE") return;

    await deleteAirport(id);
    redirect("/admin/airports");
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <h1 className='heading h2' style={{ margin: 0 }}>
            Edit airport
          </h1>
          <p className='miniNote' style={{ margin: 0 }}>
            Update airport details used in BookingWizard dropdowns.
          </p>
        </div>

        <Link className='tab tabActive' href='/admin/airports'>
          ← Back
        </Link>
      </header>

      <AirportForm
        action={updateAction}
        initial={{
          name: airport.name,
          iata: airport.iata,
          address: airport.address,
          placeId: airport.placeId ?? "",
          sortOrder: airport.sortOrder,
          active: airport.active,
          lat: airport.lat ? String(airport.lat) : "",
          lng: airport.lng ? String(airport.lng) : "",
        }}
        submitLabel='Save changes'
      />

      <div className='box' style={{ display: "grid", gap: 10 }}>
        <div className='emptyTitle underline'>Danger zone</div>
        <div className='miniNote'>
          Deleting an airport removes it from admin lists and service dropdowns.
        </div>

        <form action={deleteAction} style={{ display: "grid", gap: 10 }}>
          <input
            name='confirm'
            className='inputBorder'
            placeholder='Type DELETE to confirm'
            autoComplete='off'
          />
          <button className='primaryBtn' type='submit'>
            Delete airport
          </button>
        </form>
      </div>
    </section>
  );
}
