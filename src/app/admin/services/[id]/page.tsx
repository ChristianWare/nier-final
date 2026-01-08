import styles from "./EditServicePage.module.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  updateService,
  deleteService,
} from "../../../../../actions/admin/services";
import EditServiceForm, { type ActionResult } from "./EditServiceForm";

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

  async function updateAction(formData: FormData): Promise<ActionResult> {
    "use server";
    try {
      const res = await updateService(id, formData);
      return (res ?? { success: "ok" }) as ActionResult;
    } catch {
      return { error: "Failed to update service." };
    }
  }

  async function deleteAction(): Promise<ActionResult> {
    "use server";
    try {
      const res = await deleteService(id);
      return (res ?? { success: "ok" }) as ActionResult;
    } catch {
      return { error: "Failed to delete service." };
    }
  }

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={`${styles.heading} h2`}>Edit service</h1>
          <div className={styles.meta}>
            <span className={styles.mono}>{service.id}</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Link href='/admin/services' className={styles.backLink}>
            Back
          </Link>
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
