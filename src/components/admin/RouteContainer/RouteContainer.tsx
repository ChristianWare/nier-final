import styles from "./RouteContainer.module.css";

export default function RouteContainer({ title }: { title: string }) {
  return <span className={styles.container}>{title}</span>;
}
