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
  type?: "button" | "submit" | "reset";
  as?: "auto" | "button" | "span";
}

export default function Button({
  href,
  text,
  btnType,
  target,
  disabled,
  children,
  arrow,
  type = "button",
  as = "auto",
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
    </>
  );

  if (as === "span") {
    return <span className={className}>{Inner}</span>;
  }

  if (as === "button" || !href) {
    return (
      <button type={type} className={className} disabled={disabled}>
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
