import styles from "./Stepper.module.css";

export type WizardStep = 1 | 2 | 3;

export default function Stepper({ step }: { step: WizardStep }) {
  const items = [
    {
      n: 1 as const,
      label: "Trip",
      copy: "Details for your trip",
    },
    {
      n: 2 as const,
      label: "Vehicle",
      copy: "Choose a vehicle category",
    },
    {
      n: 3 as const,
      label: "Confirm",
      copy: "Overview",
    },
  ];

  return (
    <div className={styles.container}>
      {items.map((it, idx) => {
        const isActive = step === it.n;
        const isLast = idx === items.length - 1;

        return (
          <div key={it.n} className={styles.step}>
            <div className={styles.stepDetails}>
              <div className={styles.left}>
                <div className={styles.marker}>
                  <span
                    className={`${styles.stepNumber} ${
                      isActive
                        ? styles.stepNumberActive
                        : styles.stepNumberInactive
                    }`}
                  >
                    {it.n}
                  </span>
                  {!isLast ? <span className={styles.connector} /> : null}
                </div>
              </div>

              <div className={styles.right}>
                <div className={styles.label}>{it.label}</div>
                <p className={styles.copy}>{it.copy}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
