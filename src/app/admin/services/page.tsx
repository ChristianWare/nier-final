import styles from "./ServicesPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { toggleService } from "../../../../actions/admin/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await db.serviceType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <h1 className={`${styles.heading} h2`}>Services</h1>
        <Link href='/admin/services/new' className={styles.newServiceLink}>
          New service
        </Link>
      </header>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.theadRow}>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Strategy</Th>
              <Th>Active</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className={styles.tr}>
                <Td>{s.name}</Td>
                <Td className={styles.slugCell}>{s.slug}</Td>
                <Td>{s.pricingStrategy}</Td>
                <Td>{s.active ? "Yes" : "No"}</Td>
                <Td>
                  <div className={styles.actions}>
                    <Link
                      href={`/admin/services/${s.id}`}
                      className={styles.editLink}
                    >
                      Edit
                    </Link>

                    <form
                      action={async () => {
                        "use server";
                        await toggleService(s.id);
                      }}
                    >
                      <button type='submit' className={styles.toggleBtn}>
                        {s.active ? "Disable" : "Enable"}
                      </button>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className={styles.th}>{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`${styles.td} ${className}`}>{children}</td>;
}
