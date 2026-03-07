"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./WekoPaBookingModal.module.css";

interface Props {
  children: React.ReactNode;
}

export default function WekoPaBookingModal({ children }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = "";
  }, []);

  useEffect(() => {
    const handler = () => open();
    window.addEventListener("openWekopaBooking", handler);
    return () => window.removeEventListener("openWekopaBooking", handler);
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
    }
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  // Clean up overflow lock on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      role='dialog'
      aria-modal='true'
      aria-label='Book your We-Ko-Pa ride'
    >
      <div className={styles.panel}>
        <button
          className={styles.closeBtn}
          onClick={close}
          aria-label='Close booking modal'
        >
          <svg
            width='20'
            height='20'
            viewBox='0 0 20 20'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M15 5L5 15M5 5l10 10'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
            />
          </svg>
        </button>
        <div className={styles.inner}>{children}</div>
      </div>
    </div>
  );
}
