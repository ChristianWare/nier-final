import { ReactNode, MouseEventHandler } from "react";
import Link from "next/link";
import styles from "./Button.module.css";
import Arrow from "../icons/Arrow/Arrow";
import Plus from "../icons/Plus/Plus";
import DownloadIcon from "../DownloadIcon/DownloadIcon";

interface Props {
  href?: string;
  text?: string;
  btnType: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  disabled?: boolean;
  children?: ReactNode;
  arrow?: boolean;
  plus?: boolean;
  downloadIcon?: boolean;
  type?: "button" | "submit" | "reset";
  as?: "auto" | "button" | "span";
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export default function Button({
  href,
  text,
  btnType,
  target,
  disabled,
  children,
  arrow,
  plus,
  downloadIcon,
  type = "button",
  as = "auto",
  onClick,
}: Props) {
  const content = text || children;
  const className = `${styles.btn} ${styles[btnType]}`;

  const Inner = (
    <>
      {content}
      {arrow && (
        <div className={styles.arrowContainer}>
          <Arrow className={styles.arrow} />
        </div>
      )}
      {plus && (
        <div className={styles.plusContainer}>
          <Plus className={styles.optionalIcon} />
        </div>
      )}
      {downloadIcon && (
        <div className={styles.plusContainer}>
          <DownloadIcon className={styles.optionalIcon} />
        </div>
      )}
    </>
  );

  if (as === "span") {
    return <span className={className}>{Inner}</span>;
  }

  if (as === "button" || !href) {
    return (
      <button
        type={type}
        className={className}
        disabled={disabled}
        onClick={onClick}
      >
        {Inner}
      </button>
    );
  }

  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className={className}
    >
      {Inner}
    </Link>
  );
}
