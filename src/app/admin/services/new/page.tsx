import Link from "next/link";
import { createService } from "../../../../../actions/admin/services";
import NewServiceForm from "./NewServiceForm";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const airports = await db.airport.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, iata: true, address: true },
  });

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <h1 className='heading h2'>New service</h1>
      <Link href='/admin/services' className='backBtn'>
        Back
      </Link>
      <NewServiceForm action={createService} airports={airports} />
    </section>
  );
}
