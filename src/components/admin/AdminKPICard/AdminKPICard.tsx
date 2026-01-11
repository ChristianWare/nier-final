// components/admin/AdminKPICard/AdminKPICard.tsx
import styles from "./AdminKPICard.module.css";

export type AdminKPICardProps = {
  title: string;
  value: number | string;
};

export default function AdminKPICard({ title, value }: AdminKPICardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{title}</div>
      <p className={styles.value}>{value}</p>
    </div>
  );
}
