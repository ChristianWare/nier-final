import styles from "./NewVehiclePage.module.css";
import { db } from "@/lib/db";
import { createVehicleUnit } from "../../../../../actions/admin/vehicleUnits";
import NewVehicleUnitForm from "./NewVehicleUnitForm";
import Link from "next/link";
import Arrow from "@/components/shared/icons/Arrow/Arrow";

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
    <section className={styles.header}>
      <h1 className={`${styles.heading} h2`}>New Vehicle</h1>
      <Link href='/admin/vehicles' className='backBtn'>
        <Arrow className='backArrow' /> Back
      </Link>
      <NewVehicleUnitForm action={action} categories={categories} />
    </section>
  );
}
