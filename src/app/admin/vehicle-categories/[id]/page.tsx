import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import EditVehicleCategoryForm from "./EditVehicleCategoryForm";
import styles from "./EditVehicleCategoryPage.module.css";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id?: string };

export default async function EditVehicleCategoryPage({
  params,
}: {
  // Works whether Next passes params as an object OR a Promise
  params: Params | Promise<Params>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;

  if (!id) return notFound();

  const category = await db.vehicle.findUnique({
    where: { id },
  });

  if (!category) return notFound();

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h1 className={`${styles.heading} h2`}>Edit vehicle category</h1>
        <Link href='/admin/vehicle-categories' className='backBtn'>
          Back
        </Link>
      </div>
      <EditVehicleCategoryForm category={category} />
    </section>
  );
}
