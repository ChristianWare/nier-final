import { createAirport } from "../../../../../actions/admin/airports";
import AirportForm from "@/components/admin/AirportForm/AirportForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function NewAirportPage() {
  return (
    <section style={{ display: "grid", gap: 20 }}>
      <h1 className='heading h2'>New airport</h1>
      <AirportForm action={createAirport} />
    </section>
  );
}
