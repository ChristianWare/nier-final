import styles from "./AdminVehicleCategoriesPage.module.css";
import { db } from "@/lib/db";
import Button from "@/components/shared/Button/Button";
import VehicleCategoryActionsClient from "./VehicleCategoryActionsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminVehicleCategoriesPage() {
  const categories = await db.vehicle.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <h1 className={`${styles.heading} h2`}>Vehicle categories</h1>
        <Button
          href='/admin/vehicle-categories/new'
          text='New category'
          btnType='black'
          plus
        />
      </header>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.theadRow}>
              <Th>Name</Th>
              <Th>Capacity</Th>
              <Th>Luggage</Th>
              <Th>Active</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className={styles.tr}>
                <Td label='Name'>{c.name}</Td>
                <Td label='Capacity'>{c.capacity}</Td>
                <Td label='Luggage'>{c.luggageCapacity}</Td>
                <Td label='Active'>{c.active ? "Yes" : "No"}</Td>
                <Td label='Actions'>
                  <VehicleCategoryActionsClient
                    id={c.id}
                    active={c.active}
                    editHref={`/admin/vehicle-categories/${c.id}`}
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
