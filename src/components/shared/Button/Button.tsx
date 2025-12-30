/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode } from "react";
import Link from "next/link";
import styles from "./Button.module.css";
import Arrow from "../icons/Arrow/Arrow";

interface Props {
  href?: string;
  text?: string;
  btnType: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  disabled?: boolean;
  children?: ReactNode;
  arrow?: boolean;
  image?: boolean;
  onClick?: (
    e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>
  ) => void;
  type?: "button" | "submit" | "reset";
}

export default function Button({
  href,
  text,
  btnType,
  target,
  disabled,
  children,
  onClick,
  arrow,
  type = "button",
}: Props) {
  const content = text || children;

  // LINK VARIANT
  if (href) {
    return (
      <Link
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        onClick={onClick as any}
        className={`${styles.btn} ${styles[btnType]}`}
      >
        {content}
        {arrow && (
          <div className={styles.arrowContainer}>
            <Arrow className={styles.arrow} />
          </div>
        )}{" "}
      </Link>
    );
  }

  // BUTTON VARIANT
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[btnType]}`}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
      {arrow && (
        <div className={styles.arrowContainer}>
          <Arrow className={styles.arrow} />
        </div>
      )}
    </button>
  );
}
