/* eslint-disable @typescript-eslint/no-unused-vars */
import Link from "next/link";
import { db } from "@/lib/db";
import { toggleAirport } from "../../../../actions/admin/airports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminAirportsPage() {
  const airports = await db.airport.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      iata: true,
      address: true,
      placeId: true,
      sortOrder: true,
      active: true,
    },
    take: 500,
  });

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header className='header'>
        <h1 className='heading h2' style={{ margin: 0 }}>
          Airports
        </h1>
        <p className='miniNote' style={{ margin: 0 }}>
          Manage the airport list used by airport pickup/dropoff services.
        </p>
        <Link className='primaryBtn' href='/admin/airports/new'>
          New airport
        </Link>
      </header>
      {airports.length === 0 ? (
        <div className='box' style={{ display: "grid", gap: 10 }}>
          <div className='emptyTitle underline'>No airports yet</div>
          <p className='emptySmall'>
            Create one to enable airport dropdowns in the BookingWizard.
          </p>
          <div>
            <Link className='primaryBtn' href='/admin/airports/new'>
              Create airport
            </Link>
          </div>
        </div>
      ) : (
        <div className='box' style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {airports.map((a) => {
              // ✅ Wrap toggleAirport so the form action returns void
              const toggleAction = async (_formData: FormData) => {
                "use server";
                await toggleAirport(a.id);
              };

              return (
                <div
                  key={a.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "white",
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "baseline",
                      }}
                    >
                      <div className='emptyTitle underline'>
                        {a.name}{" "}
                        <span style={{ opacity: 0.7 }}>({a.iata})</span>
                      </div>

                        <span
                        className={`pill ${a.active ? 'pillGood' : 'pillBad'}`}
                        >
                        {a.active ? "Active" : "Disabled"}
                        </span>
                    </div>

                    <div className='emptySmall' style={{ opacity: 0.8 }}>
                      {a.address}
                    </div>

                    <div className='miniNote'>
                      {a.placeId ? "Place ID saved" : "No Place ID"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Link
                      className='tab tabActive'
                      href={`/admin/airports/${a.id}`}
                    >
                      Edit
                    </Link>

                    <form action={toggleAction}>
                      <button type='submit' className='tab'>
                        {a.active ? "Disable" : "Enable"}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
