"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./ReportModal.module.css";

/** A simple dialog used by "Fill in missing pay" and the report builder. */
export default function ReportModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panel.current
      ?.querySelector<HTMLElement>("select, input, button, a[href]")
      ?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className={styles.panel}
        role='dialog'
        aria-modal='true'
        aria-label={title}
      >
        <div className={styles.head}>
          <div className='cardTitle h4'>{title}</div>
          <button
            type='button'
            className={styles.close}
            onClick={onClose}
            aria-label='Close'
          >
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer ? <div className={styles.foot}>{footer}</div> : null}
      </div>
    </div>
  );
}
