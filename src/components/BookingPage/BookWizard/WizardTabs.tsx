// The steps of the booking tool as tabs along the top of the card. The
// current step is underlined; earlier steps can be clicked to go back.
// Later steps unlock as each one is completed.

import styles from "./WizardTabs.module.css";

const TABS = [
  { n: 1 as const, label: "Trip details" },
  { n: 2 as const, label: "Vehicle" },
  { n: 3 as const, label: "Confirm" },
];

export default function WizardTabs({
  step,
  onGoToStep,
}: {
  step: 1 | 2 | 3;
  onGoToStep: (n: 1 | 2 | 3) => void;
}) {
  return (
    <ol className={styles.tabs}>
      {TABS.map((t) => {
        const current = t.n === step;
        const done = t.n < step;
        return (
          <li key={t.n} className={styles.item}>
            <button
              type='button'
              className={`${styles.tab} ${current ? styles.current : ""} ${done ? styles.done : ""}`}
              aria-current={current ? "step" : undefined}
              disabled={!done}
              onClick={() => onGoToStep(t.n)}
            >
              <span className={styles.num}>{t.n}</span>
              {t.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
