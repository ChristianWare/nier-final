import styles from "./AdminVehicleCategoriesPage.module.css";
import Link from "next/link";
import { db } from "@/lib/db";
import { toggleVehicleCategory } from "../../../../actions/admin/vehicleCategories";
import Button from "@/components/shared/Button/Button";

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
        {/* <Link href='/admin/vehicle-categories/new' className={styles.newLink}>
          New category
        </Link> */}
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
                <Td>{c.name}</Td>
                <Td>{c.capacity}</Td>
                <Td>{c.luggageCapacity}</Td>
                <Td>{c.active ? "Yes" : "No"}</Td>
                <Td>
                  <div className={styles.actions}>
                    <Link
                      href={`/admin/vehicle-categories/${c.id}`}
                      className={styles.editLink}
                    >
                      Edit
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await toggleVehicleCategory(c.id, !c.active);
                      }}
                    >
                      <button type='submit' className={styles.toggleBtn}>
                        {c.active ? "Disable" : "Enable"}
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
