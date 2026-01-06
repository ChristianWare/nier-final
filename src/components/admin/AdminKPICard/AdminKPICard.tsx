// components/admin/AdminKPICard/AdminKPICard.tsx
import styles from "./AdminKPICard.module.css";

export type AdminKPICardProps = {
  title: string;
  value: number;
};

export default function AdminKPICard({ title, value }: AdminKPICardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>{title}</div>
      <div className={styles.value}>{value}</div>
    </div>
  );
}
