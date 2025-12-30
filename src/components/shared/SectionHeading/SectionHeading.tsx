import styles from "./SectionHeading.module.css";

export default function SectionHeading({
  text,
  color,
}: {
  text: string;
  color?: string;
}) {
  return (
    <div className={styles.container}>
      <span className={`${styles.text}${color ? ` ${styles[color]}` : ""}`}>
        {text}
      </span>
    </div>
  );
}
