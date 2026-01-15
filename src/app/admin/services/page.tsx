import styles from "./ServicesPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { toggleService } from "../../../../actions/admin/services";
import Button from "@/components/shared/Button/Button";

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
        <Button
          href='/admin/services/new'
          text='New service'
          btnType='black'
          plus
        />
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
                <Td label='Name'>{s.name}</Td>
                <Td label='Slug' className={styles.slugCell}>
                  {s.slug}
                </Td>
                <Td label='Strategy'>{s.pricingStrategy}</Td>
                <Td label='Active'>{s.active ? "Yes" : "No"}</Td>
                <Td label='Actions'>
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
                      <button type='submit' className='dangerBtn'>
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
  return <th className={`${styles.th} emptyTitleSmall`}>{children}</th>;
}

function Td({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <td className={`${styles.td} ${className}`} data-label={label}>
      {children}
    </td>
  );
}
