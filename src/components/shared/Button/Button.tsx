"use client";

import { ReactNode, MouseEventHandler, useState } from "react";
import Link from "next/link";
import styles from "./Button.module.css";
import { motion, useAnimate, AnimationOptions } from "motion/react";
import Arrow from "../icons/Arrow/Arrow";
import Plus from "../icons/Plus/Plus";
import DownloadIcon from "../DownloadIcon/DownloadIcon";
import Close from "../icons/Close/Close";
import Check from "../icons/Check/Check";
import Email from "../icons/Email/Email";
import RefundIcon from "../icons/RefundIcon/RefundIcon";

interface Props {
  href?: string;
  text?: string;
  btnType: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  disabled?: boolean;
  children?: ReactNode;
  arrow?: boolean;
  refundIcon?: boolean;
  plus?: boolean;
  email?: boolean;
  downloadIcon?: boolean;
  closeIcon?: boolean;
  checkIcon?: boolean;
  type?: "button" | "submit" | "reset";
  as?: "auto" | "button" | "span";
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

const transition: AnimationOptions = {
  type: "spring",
  duration: 0.7,
};

// Text container with flip animation
const FlipText = ({ label }: { label: string }) => {
  return (
    <span className={styles.textContainer}>
      <span className={styles.srOnly}>{label}</span>
      <motion.span
        className={`text-primary ${styles.textPrimary}`}
        style={{ y: 0 }}
      >
        {label}
      </motion.span>
      <motion.span
        className={`text-secondary ${styles.textSecondary}`}
        style={{ y: "-100%" }}
      >
        {label}
      </motion.span>
    </span>
  );
};

// Arrow with horizontal slide animation
const ArrowSlide = () => {
  return (
    <div className={styles.arrowContainer}>
      <div className={styles.arrowWrapper}>
        <motion.div
          className={`arrow-primary ${styles.arrowPrimary}`}
          style={{ x: 0 }}
        >
          <Arrow className={styles.arrow} />
        </motion.div>
        <motion.div
          className={`arrow-secondary ${styles.arrowSecondary}`}
          style={{ x: "-100%" }}
        >
          <Arrow className={styles.arrow} />
        </motion.div>
      </div>
    </div>
  );
};

export default function Button({
  href,
  text,
  btnType,
  target,
  disabled,
  children,
  arrow,
  refundIcon,
  closeIcon,
  plus,
  email,
  checkIcon,
  downloadIcon,
  type = "button",
  as = "auto",
  onClick,
}: Props) {
  const [scope, animate] = useAnimate();
  const [blocked, setBlocked] = useState(false);

  const content = text || (typeof children === "string" ? children : null);
  const nonTextChildren = typeof children !== "string" ? children : null;
  const className = `${styles.btn} ${styles[btnType]}`;

  const hoverStart = () => {
    if (blocked) return;
    setBlocked(true);

    // Animate text - all at once, no stagger
    // Primary text moves down and out
    animate(".text-primary", { y: "100%" }, transition).then(() => {
      animate(".text-primary", { y: 0 }, { duration: 0 }).then(() => {
        setBlocked(false);
      });
    });

    // Secondary text comes in from top
    animate(".text-secondary", { y: "0%" }, transition).then(() => {
      animate(".text-secondary", { y: "-100%" }, { duration: 0 });
    });

    // Animate arrow - horizontal swap
    // Primary arrow moves right and out
    animate(".arrow-primary", { x: "100%" }, transition).then(() => {
      animate(".arrow-primary", { x: 0 }, { duration: 0 });
    });

    // Secondary arrow comes in from left
    animate(".arrow-secondary", { x: "0%" }, transition).then(() => {
      animate(".arrow-secondary", { x: "-100%" }, { duration: 0 });
    });
  };

  const Inner = (
    <>
      {content && <FlipText label={content} />}
      {nonTextChildren}
      {arrow && <ArrowSlide />}
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
      {closeIcon && (
        <div className={styles.plusContainer}>
          <Close className={styles.optionalIcon} />
        </div>
      )}
      {checkIcon && (
        <div className={styles.plusContainer}>
          <Check className={styles.optionalIcon} />
        </div>
      )}
      {email && (
        <div className={styles.plusContainer}>
          <Email className={styles.optionalIcon} />
        </div>
      )}
      {refundIcon && (
        <div className={styles.plusContainer}>
          <RefundIcon className={styles.optionalIcon} />
        </div>
      )}
    </>
  );

  if (as === "span") {
    return (
      <span ref={scope} className={className} onMouseEnter={hoverStart}>
        {Inner}
      </span>
    );
  }

  if (as === "button" || !href) {
    return (
      <button
        ref={scope}
        type={type}
        className={className}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={hoverStart}
      >
        {Inner}
      </button>
    );
  }

  return (
    <Link
      ref={scope}
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className={className}
      onMouseEnter={hoverStart}
    >
      {Inner}
    </Link>
  );
}
