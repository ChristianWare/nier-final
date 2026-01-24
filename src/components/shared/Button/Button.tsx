"use client";

import {
  ReactNode,
  MouseEventHandler,
  useState,
  useSyncExternalStore,
} from "react";
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

// Changed from spring to tween to remove bounce
const transition: AnimationOptions = {
  type: "tween",
  duration: 0.35,
  ease: "easeOut",
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

// Generic icon slide component that works with any icon
const IconSlide = ({
  icon: Icon,
  className: iconClassName,
  containerClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  containerClassName?: string;
}) => {
  return (
    <div className={containerClassName || styles.arrowContainer}>
      <div className={styles.arrowWrapper}>
        <motion.div
          className={`icon-primary ${styles.arrowPrimary}`}
          style={{ x: 0 }}
        >
          <Icon className={iconClassName} />
        </motion.div>
        <motion.div
          className={`icon-secondary ${styles.arrowSecondary}`}
          style={{ x: "-100%" }}
        >
          <Icon className={iconClassName} />
        </motion.div>
      </div>
    </div>
  );
};

// Proper hook using useSyncExternalStore to detect hover capability
function useSupportsHover() {
  const subscribe = (callback: () => void) => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    mediaQuery.addEventListener("change", callback);
    return () => mediaQuery.removeEventListener("change", callback);
  };

  const getSnapshot = () => {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  };

  const getServerSnapshot = () => {
    // Default to true on server (will be corrected on hydration)
    return true;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

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
  const supportsHover = useSupportsHover();

  const content = text || (typeof children === "string" ? children : null);
  const nonTextChildren = typeof children !== "string" ? children : null;
  const className = `${styles.btn} ${styles[btnType]}`;

  const hoverStart = () => {
    // Don't animate on touch devices
    if (!supportsHover) return;
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

    // Animate all icons - horizontal swap
    // Primary icons move right and out
    animate(".icon-primary", { x: "100%" }, transition).then(() => {
      animate(".icon-primary", { x: 0 }, { duration: 0 });
    });

    // Secondary icons come in from left
    animate(".icon-secondary", { x: "0%" }, transition).then(() => {
      animate(".icon-secondary", { x: "-100%" }, { duration: 0 });
    });
  };

  const Inner = (
    <>
      {content && <FlipText label={content} />}
      {nonTextChildren}
      {arrow && (
        <IconSlide
          icon={Arrow}
          className={styles.arrow}
          containerClassName={styles.arrowContainer}
        />
      )}
      {plus && (
        <IconSlide
          icon={Plus}
          className={styles.optionalIcon}
          containerClassName={styles.plusContainer}
        />
      )}
      {downloadIcon && (
        <IconSlide
          icon={DownloadIcon}
          className={styles.optionalIcon}
          containerClassName={styles.plusContainer}
        />
      )}
      {closeIcon && (
        <IconSlide
          icon={Close}
          className={styles.optionalIcon}
          containerClassName={styles.plusContainer}
        />
      )}
      {checkIcon && (
        <IconSlide
          icon={Check}
          className={styles.optionalIcon}
          containerClassName={styles.plusContainer}
        />
      )}
      {email && (
        <IconSlide
          icon={Email}
          className={styles.optionalIcon}
          containerClassName={styles.plusContainer}
        />
      )}
      {refundIcon && (
        <IconSlide
          icon={RefundIcon}
          className={styles.optionalIcon}
          containerClassName={styles.plusContainer}
        />
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
