import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateVehicleUnit } from "../../../../../actions/admin/vehicleUnits";
import EditVehicleUnitForm from "./EditVehicleUnitForm";
import styles from "./EditVehicleUnitForm.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditVehicleUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) notFound();

  const unit = await db.vehicleUnit.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!unit) notFound();

  const unitId = unit.id;
  const unitForForm = {
    id: unit.id,
    name: unit.name,
    plate: unit.plate ?? "",
    categoryId: unit.categoryId ?? "",
    active: unit.active,
  };

  const categories = await db.vehicle.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  async function updateAction(formData: FormData) {
    "use server";
    formData.set("id", unitId);
    return await updateVehicleUnit(formData);
  }

  return (
    <section style={{ display: "grid", gap: 14, maxWidth: 760 }}>
      <div className={styles.header}>
        <h1 className={`${styles.heading} h2`}>Edit vehicle (unit)</h1>
        <Link href='/admin/vehicles' className='backBtn'>
          Back
        </Link>
      </div>

      <EditVehicleUnitForm
        unit={unitForForm}
        categories={categories}
        onUpdate={updateAction}
      />
    </section>
  );
}
