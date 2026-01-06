import styles from "./BadgeCount.module.css";

type BadgeCountProps = {
  value: number;
  max?: number;
  hideIfZero?: boolean;
};

export default function BadgeCount({
  value,
  max = 99,
  hideIfZero = true,
}: BadgeCountProps) {
  if (hideIfZero && value <= 0) return null;

  const display = value > max ? `${max}+` : String(value);

  return (
    <span className={styles.container} aria-label={`Count: ${display}`}>
      {display}
    </span>
  );
}
