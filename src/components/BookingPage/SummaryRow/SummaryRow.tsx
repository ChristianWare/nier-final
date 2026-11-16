import styles from "./SummaryRow.module.css";

/** One label and value line in a booking summary. `strong` is the total. */
export default function SummaryRow({
  label,
  value,
  strong,
  noBorder,
}: {
  label: string;
  value: string;
  strong?: boolean;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`${styles.row} ${noBorder ? styles.noBorder : ""} ${strong ? styles.strong : ""}`}
    >
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
    </div>
  );
}
