import styles from "./Alert.module.css";
import Close from "../icons/Close/Close";
import Check from "../icons/Check/Check";

export default function Alert({
  success,
  error,
  message,
}: {
  success?: boolean;
  error?: boolean;
  message: string;
}) {
  return (
    <div className={styles.container}>
      {success && (
        <>
          <div className={styles.successContainer}>
            <Check className={styles.success} />
            <span className={styles.successMessage}>{message}</span>
          </div>
        </>
      )}
      {error && (
        <div className={styles.errorContainer}>
          <Close className={styles.error} />
          <span className={styles.errorMessage}>{message}</span>
        </div>
      )}
    </div>
  );
}
