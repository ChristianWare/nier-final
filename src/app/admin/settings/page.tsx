import styles from "./AdminSettingsPage.module.css";

export default function AdminSettingsPage() {
  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <h1 className={`${styles.heading} h2`}>Settings</h1>
        <p className={styles.subcopy}>
          Manage admin preferences and system settings here.
        </p>
      </header>

      <div className={styles.card}>Coming soon.</div>
    </section>
  );
}
