// components/admin/OnboardingChecklist/OnboardingChecklist.tsx
"use client";

import styles from "./OnboardingChecklist.module.css";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { OnboardingStep } from "../../../../actions/admin/onboarding";
import Button from "@/components/shared/Button/Button";

type Props = {
  steps: OnboardingStep[];
  allComplete: boolean;
  completedCount: number;
  totalCount: number;
};

export default function OnboardingChecklist({
  steps,
  allComplete,
  completedCount,
  totalCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [minimized, setMinimized] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Captures whether allComplete was true on first mount.
  // Lazy initializer runs once — value never changes after that.
  const [wasAlreadyComplete] = useState(() => allComplete);

  // Already complete from a previous session → nothing to show
  if (allComplete && wasAlreadyComplete) return null;

  // Celebration was shown and dismissed → nothing to show
  if (dismissed) return null;

  // All steps just completed during this session → show celebration
  if (allComplete && !wasAlreadyComplete) {
    return (
      <div className={styles.overlay}>
        <div className={styles.celebrationCard}>
          <div className={styles.celebrationEmoji}>🎉</div>
          <h2 className={styles.celebrationTitle}>You are all set!</h2>
          <p className={styles.celebrationText}>
            Your booking site is live and ready for customers. Happy driving!
          </p>
          <div className={styles.celebrationAction}>
            <Button
              type='button'
              text='Go to Dashboard'
              btnType='primary'
              onClick={() => setDismissed(true)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Minimized floating pill ──

  if (minimized) {
    return (
      <button
        type='button'
        className={styles.pill}
        onClick={() => setMinimized(false)}
      >
        <span className={styles.pillIcon}>
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
          >
            <path d='M9 11l3 3L22 4' />
            <path d='M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' />
          </svg>
        </span>
        <span className={styles.pillProgress}>
          {completedCount}/{totalCount}
        </span>
        <span className={styles.pillLabel}>Setup</span>
      </button>
    );
  }

  // ── Full overlay ──

  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Complete Your Setup</h2>
            <p className={styles.cardSubtitle}>
              {completedCount} of {totalCount} steps complete
            </p>
          </div>
          <button
            type='button'
            className={styles.minimizeBtn}
            onClick={() => setMinimized(true)}
            aria-label='Minimize checklist'
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M6 9l6 6 6-6' />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps */}
        <div className={styles.stepList}>
          {steps.map((step) => {
            const isCurrent = pathname === step.path;
            return (
              <div
                key={step.key}
                className={`${styles.step} ${step.complete ? styles.stepComplete : styles.stepIncomplete}`}
              >
                <div className={styles.stepCheck}>
                  {step.complete ? (
                    <svg
                      width='18'
                      height='18'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='3'
                    >
                      <path d='M20 6L9 17l-5-5' />
                    </svg>
                  ) : (
                    <div className={styles.stepCircle} />
                  )}
                </div>
                <div className={styles.stepContent}>
                  <span className={styles.stepLabel}>{step.label}</span>
                  {!step.complete && (
                    <span className={styles.stepDescription}>
                      {step.description}
                    </span>
                  )}
                </div>
                {!step.complete && (
                  <button
                    type='button'
                    className={styles.stepAction}
                    onClick={() => {
                      router.push(step.path);
                      setMinimized(true);
                    }}
                    disabled={isCurrent}
                  >
                    {isCurrent ? "You're here" : "Set up"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
