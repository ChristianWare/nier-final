import styles from "./AdminVehiclesPage.module.css";
import { db } from "@/lib/db";
import Button from "@/components/shared/Button/Button";
import VehicleUnitActionsClient from "./VehicleUnitActionsClient";

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
                <Td label='Name'>{u.name}</Td>
                <Td label='Category'>{u.category?.name ?? "—"}</Td>
                <Td label='Plate' className={styles.plateCell}>
                  {u.plate ?? "—"}
                </Td>
                <Td label='Active'>{u.active ? "Yes" : "No"}</Td>
                <Td label='Actions'>
                  <VehicleUnitActionsClient
                    id={u.id}
                    active={u.active}
                    editHref={`/admin/vehicles/${u.id}`}
                  />
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
  return <th className={`${styles.th}`}>{children}</th>;
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
    <td className={`${styles.td} cellStrong ${className}`} data-label={label}>
      {children}
    </td>
  );
}
