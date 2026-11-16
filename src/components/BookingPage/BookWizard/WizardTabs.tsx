// The steps of a booking tool as tabs along the top of the wizard. The
// current step is underlined; earlier steps can be clicked to go back.
// Later steps unlock as each one is completed.
//
// The public booking tools have three steps (the default). The admin and
// corporate tools pass their own. With a title, the tabs come with the
// tool's heading above them ("Book a ride").

import type { CSSProperties } from "react";
import styles from "./WizardTabs.module.css";

export type WizardTab<N extends number> = { n: N; label: string };

const DEFAULT_TABS: WizardTab<1 | 2 | 3>[] = [
  { n: 1, label: "Trip details" },
  { n: 2, label: "Vehicle" },
  { n: 3, label: "Confirm" },
];

export default function WizardTabs<N extends number = 1 | 2 | 3>({
  step,
  onGoToStep,
  tabs,
  title,
}: {
  step: N;
  /** Leave out to make the tabs a read-only progress row. */
  onGoToStep?: (n: N) => void;
  tabs?: WizardTab<N>[];
  title?: string;
}) {
  const list = tabs ?? (DEFAULT_TABS as unknown as WizardTab<N>[]);
  // More than three: on phones only the current step keeps its name.
  // More than four: the same on every screen (the admin tool's column is
  // too narrow for six names).
  const many = list.length > 3;
  const crowded = list.length > 4;

  const row = (
    <ol
      className={`${styles.tabs} ${many ? styles.many : ""} ${crowded ? styles.crowded : ""}`}
      style={
        {
          gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))`,
        } as CSSProperties
      }
    >
      {list.map((t) => {
        const current = t.n === step;
        const done = t.n < step;
        const clickable = done && Boolean(onGoToStep);
        return (
          <li key={t.n} className={styles.item}>
            <button
              type='button'
              className={`${styles.tab} ${current ? styles.current : ""} ${done ? styles.done : ""} ${clickable ? styles.clickable : ""}`}
              aria-current={current ? "step" : undefined}
              aria-label={many ? `Step ${t.n}: ${t.label}` : undefined}
              disabled={!clickable}
              onClick={() => onGoToStep?.(t.n)}
            >
              <span className={styles.num}>{t.n}</span>
              <span className={styles.label}>{t.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className={styles.head}>
      {title ? <p className={styles.title}>{title}</p> : null}
      {row}
    </div>
  );
}
