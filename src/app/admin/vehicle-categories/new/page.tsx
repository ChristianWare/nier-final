import NewVehicleCategoryForm from "./NewVehicleCategoryForm";
import styles from "./NewVehicleCategoryPage.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function NewVehicleCategoryPage() {
  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h1 className={`${styles.heading} h2`}>New vehicle category</h1>
        <NewVehicleCategoryForm />
      </div>
    </section>
  );
}
