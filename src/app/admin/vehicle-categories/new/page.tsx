import NewVehicleCategoryForm from "./NewVehicleCategoryForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function NewVehicleCategoryPage() {
  return (
    <section style={{ display: "grid", gap: 14, maxWidth: 820 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>New vehicle category</h1>
      <NewVehicleCategoryForm />
    </section>
  );
}
