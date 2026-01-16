import Link from "next/link";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminAirportsPage() {
  const airports = await db.airport.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: 500,
    select: {
      id: true,
      name: true,
      iata: true,
      address: true,
      active: true,
      sortOrder: true,
    },
  });

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header className='header'>
        <h1 className='heading h2'>Airports</h1>
        <p style={{ margin: 0, opacity: 0.75 }}>
          These airports power the BookingWizard dropdown for airport services.
        </p>

        <Link className='primaryBtn' href='/admin/airports/new'>
          Add airport
        </Link>
      </header>

      {airports.length === 0 ? (
        <div className='box'>
          <div className='emptyTitle underline'>No airports yet</div>
          <p className='emptySmall'>
            Add at least one airport to use airport services.
          </p>
          <div style={{ paddingTop: 10 }}>
            <Link className='primaryBtn' href='/admin/airports/new'>
              Add airport
            </Link>
          </div>
        </div>
      ) : (
        <div className='box' style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th
                  style={{
                    padding: 12,
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  Airport
                </th>
                <th
                  style={{
                    padding: 12,
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  IATA
                </th>
                <th
                  style={{
                    padding: 12,
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  Address
                </th>
                <th
                  style={{
                    padding: 12,
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  Active
                </th>
              </tr>
            </thead>
            <tbody>
              {airports.map((a) => (
                <tr key={a.id}>
                  <td
                    style={{
                      padding: 12,
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{a.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Sort: {a.sortOrder}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: 12,
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                      fontFamily: "monospace",
                    }}
                  >
                    {a.iata}
                  </td>
                  <td
                    style={{
                      padding: 12,
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    {a.address}
                  </td>
                  <td
                    style={{
                      padding: 12,
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    {a.active ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
