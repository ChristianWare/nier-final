import { ReactNode } from "react";
import styles from "./FalseButton.module.css";

interface FalseButtonProps {
  text?: string;
  btnType?: "primary" | "secondary" | string;
  children?: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "submit" | "reset" | "button" | undefined;
  disabled?: boolean;
}

export default function FalseButton({
  text,
  btnType = "primary",
  children,
  onClick,
  type,
  disabled,
}: FalseButtonProps) {
  const content = text ?? children;

  return (
    <button
      className={styles.container}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      <div className={`${styles.btn} ${styles[btnType]}`}>{content}</div>
    </button>
  );
}
