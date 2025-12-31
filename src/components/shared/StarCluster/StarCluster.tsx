import styles from "./StarCluster.module.css";
import Starii from "../icons/Starii/Starii";

export default function StarCluster() {
  return (
    <div className={styles.container}>
      <Starii className={styles.star} />
      <Starii className={styles.star} />
      <Starii className={styles.star} />
      <Starii className={styles.star} />
      <Starii className={styles.star} />
    </div>
  );
}
