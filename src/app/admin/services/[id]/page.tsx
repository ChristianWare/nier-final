import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  updateService,
  deleteService,
} from "../../../../../actions/admin/services";
import EditServiceForm from "./EditServiceForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const service = await db.serviceType.findUnique({
    where: { id },
  });

  if (!service) notFound();

  // Wrap server actions so the client form can call them cleanly
  async function updateAction(formData: FormData) {
    "use server";
    await updateService(id, formData);
  }

  async function deleteAction() {
    "use server";
    await deleteService(id);
  }

  return (
    <section style={{ display: "grid", gap: 14, maxWidth: 760 }}>
      <header
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Edit service</h1>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            <span style={{ fontFamily: "monospace" }}>{service.id}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href='/admin/services'>Back</Link>
        </div>
      </header>

      <EditServiceForm
        service={service}
        onUpdate={updateAction}
        onDelete={deleteAction}
      />
    </section>
  );
}
