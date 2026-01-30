// src/components/shared/WhatHappensNext/WhatHappensNext.tsx
import styles from "./WhatHappensNext.module.css";

type Step = {
  number: string;
  title: string;
  description: string;
  status: "complete" | "current" | "upcoming";
};

const STEPS: Step[] = [
  {
    number: "✓",
    title: "Request Received",
    description: "We've got your booking request",
    status: "complete",
  },
  {
    number: "2",
    title: "Review",
    description: "Our team reviews within 24 hours",
    status: "current",
  },
  {
    number: "3",
    title: "Payment Link",
    description: "Once approved, we'll email you a secure payment link",
    status: "upcoming",
  },
  {
    number: "4",
    title: "Confirmed!",
    description: "After payment, your ride is confirmed",
    status: "upcoming",
  },
];

export default function WhatHappensNext() {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>What Happens Next?</h3>
      <div className={styles.steps}>
        {STEPS.map((step, index) => (
          <div key={index} className={styles.step}>
            <div className={`${styles.stepNumber} ${styles[step.status]}`}>
              {step.number}
            </div>
            <div className={styles.stepContent}>
              <div className={styles.stepTitle}>{step.title}</div>
              <div className={styles.stepDescription}>{step.description}</div>
            </div>
            {index < STEPS.length - 1 && <div className={styles.connector} />}
          </div>
        ))}
      </div>
      <div className={styles.notice}>
        <span className={styles.noticeIcon}>⏰</span>
        <span>
          <strong>No payment required yet.</strong> We&apos;ll send you a payment
          link after we review and approve your request.
        </span>
      </div>
    </div>
  );
}
