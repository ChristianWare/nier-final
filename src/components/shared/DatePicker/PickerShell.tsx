"use client";

import {
  useCallback,
  useId,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./DatePicker.module.css";

/**
 * The button that opens a picker, and the panel it opens: a dropdown under
 * the button on desktop (it flips above when there's no room), a bottom sheet
 * on phones. The panel is drawn at the page level, so dialogs and scrolling
 * boxes never cut it off.
 */
export default function PickerShell({
  label,
  valueText,
  placeholder,
  isEmpty,
  className,
  style,
  id,
  disabled,
  ariaLabel,
  title,
  dialogLabel,
  icon = "calendar",
  children,
}: {
  label: ReactNode;
  /** The value as words, so screen readers hear it with the field's name. */
  valueText: string;
  placeholder: string;
  isEmpty: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
  dialogLabel: string;
  icon?: "calendar" | "clock";
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // The button is kept in state (not a ref) so `close` can be handed to the
  // panel's content during render.
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const valueId = useId();

  const close = useCallback(() => {
    setOpen(false);
    triggerEl?.focus();
  }, [triggerEl]);

  const place = useCallback(() => {
    const t = triggerEl?.getBoundingClientRect();
    const p = panel.current?.getBoundingClientRect();
    if (!t || !p) return;
    const gap = 6;
    let top = t.bottom + gap;
    if (top + p.height > window.innerHeight - 8 && t.top - p.height - gap > 8) {
      top = t.top - p.height - gap;
    }
    const left = Math.min(
      Math.max(8, t.left),
      Math.max(8, window.innerWidth - p.width - 8),
    );
    // Positioned directly on the element, so no extra render is needed.
    const el = panel.current;
    if (el) {
      el.style.top = `${top}px`;
      el.style.left = `${left}px`;
    }
  }, [triggerEl]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panel.current?.contains(target) || triggerEl?.contains(target))
        return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, close, place, triggerEl]);

  return (
    <span className={styles.wrap}>
      <button
        ref={setTriggerEl}
        type='button'
        id={id}
        className={`${className ?? ""} ${styles.trigger}`}
        style={style}
        disabled={disabled}
        aria-haspopup='dialog'
        aria-describedby={valueId}
        aria-expanded={open}
        aria-label={
          ariaLabel
            ? `${ariaLabel}: ${isEmpty ? placeholder : valueText}`
            : undefined
        }
        title={title}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          id={valueId}
          className={isEmpty ? styles.placeholder : styles.value}
        >
          {isEmpty ? placeholder : label}
        </span>
        <svg className={styles.icon} viewBox='0 0 24 24' aria-hidden='true'>
          {icon === "clock" ? (
            <path d='M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 3v6l5 3 1-1.7-4-2.3V7h-2Z' />
          ) : (
            <path d='M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 7h14v10H5V9Zm2 2v2h2v-2H7Zm4 0v2h2v-2h-2Zm4 0v2h2v-2h-2Z' />
          )}
        </svg>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                className={styles.backdrop}
                onMouseDown={() => setOpen(false)}
              />
              <div
                ref={panel}
                className={styles.popover}
                role='dialog'
                aria-label={dialogLabel}
                style={{ top: -9999, left: -9999 }}
              >
                {children(close)}
              </div>
            </>,
            document.body,
          )
        : null}
    </span>
  );
}
