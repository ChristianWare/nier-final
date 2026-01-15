import styles from "./AdminDriversPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDriversPage() {
  const drivers = await db.user.findMany({
    where: { roles: { has: "DRIVER" } },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, name: true, email: true, createdAt: true },
    take: 500,
  });

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <h1 className={`${styles.heading} h2`}>Drivers</h1>
        <p className={styles.subcopy}>
          This page is read-only for now. Later we’ll add driver features here
          (availability, earnings, assigned trips, etc.).
        </p>
      </header>

      {drivers.length === 0 ? (
        <EmptyDrivers />
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.theadRow}>
                <Th>Name</Th>
                <Th>Email</Th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className={styles.tr}>
                  <Td label='Name'>{d.name ?? "—"}</Td>
                  <Td label='Email' className={styles.emailCell}>
                    {d.email}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EmptyDrivers() {
  return (
    <div className={styles.emptyCard}>
      <div className={styles.emptyTitle}>No drivers yet</div>
      <div className={styles.emptyCopy}>
        Drivers should sign up like normal users. Then go to Users and change
        their role to DRIVER.
      </div>
      <Link href='/admin/users' className={styles.emptyLink}>
        Go to Users
      </Link>
    </div>
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
