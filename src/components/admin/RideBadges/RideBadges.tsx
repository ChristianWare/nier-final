"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { PaymentTagInfo, StatusBadgeInfo } from "@/lib/booking/rideBadges";
import styles from "./RideBadges.module.css";

const STATUS_CLASS: Record<StatusBadgeInfo["tone"], string> = {
  pending: "badge_warn",
  due: "badge_bad",
  confirmed: "badge_good",
  assigned: "badge_purple",
  moving: styles.tone_moving,
  done: styles.tone_done,
  lost: "badge_neutral",
  draft: `badge_neutral ${styles.tone_draft}`,
};

/** A ride's status badge and payment tag, each explained on hover or tap. */
export default function RideBadges({
  status,
  payment,
}: {
  status: StatusBadgeInfo;
  payment: PaymentTagInfo | null;
}) {
  return (
    <span className={styles.badges}>
      <Tip text={status.tip}>
        <span className={`badge ${STATUS_CLASS[status.tone]}`}>
          {status.label}
        </span>
      </Tip>
      {payment ? (
        <Tip text={payment.tip}>
          <span className={`${styles.tag} ${styles[`tag_${payment.tone}`]}`}>
            {payment.label}
          </span>
        </Tip>
      ) : null}
    </span>
  );
}

/** Shows `text` above its child on hover, keyboard focus, or tap. Drawn at
 *  the page level so tables and scrolling boxes never cut it off. */
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<HTMLSpanElement | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const openedAt = useRef(0);

  useLayoutEffect(() => {
    const t = target?.getBoundingClientRect();
    const el = tip.current;
    if (!open || !t || !el) return;
    const r = el.getBoundingClientRect();
    let top = t.top - r.height - 8;
    if (top < 8) top = t.bottom + 8;
    const left = Math.min(
      Math.max(8, t.left + t.width / 2 - r.width / 2),
      Math.max(8, window.innerWidth - r.width - 8),
    );
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
  }, [open, target]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  if (!text) return <>{children}</>;
  const show = () => {
    openedAt.current = Date.now();
    setOpen(true);
  };

  return (
    <span
      ref={setTarget}
      className={styles.tipTarget}
      tabIndex={0}
      aria-describedby={open ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={() => setOpen(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // A tap fires hover + click together: keep it open. A later tap closes.
        if (Date.now() - openedAt.current > 400) setOpen((o) => !o);
      }}
    >
      {children}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tip}
              id={id}
              role='tooltip'
              className={styles.tooltip}
              style={{ top: -9999, left: -9999 }}
            >
              {text}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
