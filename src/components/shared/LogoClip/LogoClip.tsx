import styles from "./LogoClip.module.css";

export default function LogoClip() {
  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <div className={styles.clip1} />
        <div className={styles.clip2} />
      </div>
      <div className={styles.bottom}>
        <div className={styles.clip1} />
        <div className={styles.clip2} />
      </div>
    </div>
  );
}
