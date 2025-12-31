import styles from "./SectionHeading.module.css";

export default function SectionHeading({
  text,
  color,
  dot
}: {
  text: string;
  color?: string;
  dot?: boolean;
}) {
  return (
    <div className={styles.container}>
      {dot && <span className={styles.dot} />}
      <span className={`${styles.text}${color ? ` ${styles[color]}` : ""}`}>
        {text}
      </span>
    </div>
  );
}
