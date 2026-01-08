import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import EditVehicleCategoryForm from "./EditVehicleCategoryForm";
import styles from "./EditVehicleCategoryPage.module.css";

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
      <div className={styles.content}>
        <h1 className={`${styles.heading} h2`}>Edit vehicle category</h1>
        <EditVehicleCategoryForm category={category} />
      </div>
    </section>
  );
}
