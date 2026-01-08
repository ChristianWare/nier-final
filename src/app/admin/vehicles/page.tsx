import styles from "./AdminVehiclesPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { toggleVehicleUnit } from "../../../../actions/admin/vehicleUnits";
import Button from "@/components/shared/Button/Button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  const units = await db.vehicleUnit.findMany({
    include: { category: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <h1 className={`${styles.heading} h2`}>Vehicles (units)</h1>
        <Button
          href='/admin/vehicles/new'
          text='New vehicle'
          btnType='black'
          plus
        />
      </header>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.theadRow}>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Plate</Th>
              <Th>Active</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className={styles.tr}>
                <Td>{u.name}</Td>
                <Td>{u.category?.name ?? "—"}</Td>
                <Td className={styles.plateCell}>{u.plate ?? "—"}</Td>
                <Td>{u.active ? "Yes" : "No"}</Td>
                <Td>
                  <div className={styles.actions}>
                    <Link
                      href={`/admin/vehicles/${u.id}`}
                      className={styles.editLink}
                    >
                      Edit
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await toggleVehicleUnit(u.id, !u.active);
                      }}
                    >
                      <button type='submit' className={styles.toggleBtn}>
                        {u.active ? "Disable" : "Enable"}
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
