/* eslint-disable @typescript-eslint/no-unused-vars */
import styles from "./DriverPageIntro.module.css";

type Props = {
  assigned: number;
  upcoming: number;
  completed: number;
};

export default function DriverPageIntro({
  assigned,
  upcoming,
  completed,
}: Props) {
  return (
    <header className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Driver Dashboard</h1>
        <p className={styles.subtitle}>
          {assigned > 0
            ? `You have ${assigned} active trip${assigned === 1 ? "" : "s"}`
            : "No active trips right now"}
        </p>
      </div>
    </header>
  );
}
