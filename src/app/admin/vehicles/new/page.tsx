import { db } from "@/lib/db";
import { createVehicleUnit } from "../../../../../actions/admin/vehicleUnits";
import NewVehicleUnitForm from "./NewVehicleUnitForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  const categories = await db.vehicle.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  async function action(formData: FormData) {
    "use server";
    return await createVehicleUnit(formData);
  }

  return (
    <section style={{ display: "grid", gap: 14, maxWidth: 760 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>New vehicle</h1>
      <NewVehicleUnitForm action={action} categories={categories} />
    </section>
  );
}
