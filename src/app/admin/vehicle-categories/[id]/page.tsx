import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import EditVehicleCategoryForm from "./EditVehicleCategoryForm";

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
    <section style={{ display: "grid", gap: 14, maxWidth: 820 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Edit vehicle category</h1>
      <EditVehicleCategoryForm category={category} />
    </section>
  );
}
