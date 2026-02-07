"use client";

import styles from "./BookingWizardChecklist.module.css";

type Props = {
  currentStep: 1 | 2 | 3;
  onGoToStep: (step: 1 | 2 | 3) => void;
  // Step 1 fields
  hasService: boolean;
  serviceName: string | null;
  hasDateTime: boolean;
  dateTimeLabel: string | null;
  hasPickup: boolean;
  pickupLabel: string | null;
  hasDropoff: boolean;
  dropoffLabel: string | null;
  // Step 2
  hasVehicle: boolean;
  vehicleName: string | null;
  estimateLabel: string | null;
  // Step 3
  hasContactInfo: boolean;
  contactLabel: string | null;
};

type ChecklistItem = {
  key: string;
  label: string;
  description: string;
  isComplete: boolean;
  value: string | null;
  step: 1 | 2 | 3;
  priority: "critical" | "important";
};

export default function BookingWizardChecklist({
  currentStep,
  onGoToStep,
  hasService,
  serviceName,
  hasDateTime,
  dateTimeLabel,
  hasPickup,
  pickupLabel,
  hasDropoff,
  dropoffLabel,
  hasVehicle,
  vehicleName,
  estimateLabel,
  hasContactInfo,
  contactLabel,
}: Props) {
  const checklist: ChecklistItem[] = [
    {
      key: "service",
      label: "Service Type",
      description: "Choose a service for your trip",
      isComplete: hasService,
      value: serviceName,
      step: 1,
      priority: "critical",
    },
    {
      key: "datetime",
      label: "Date & Time",
      description: "Select your pickup date and time",
      isComplete: hasDateTime,
      value: dateTimeLabel,
      step: 1,
      priority: "critical",
    },
    {
      key: "pickup",
      label: "Pickup Location",
      description: "Enter your pickup address",
      isComplete: hasPickup,
      value: pickupLabel,
      step: 1,
      priority: "critical",
    },
    {
      key: "dropoff",
      label: "Dropoff Location",
      description: "Enter your destination",
      isComplete: hasDropoff,
      value: dropoffLabel,
      step: 1,
      priority: "critical",
    },
    {
      key: "vehicle",
      label: "Vehicle",
      description: "Choose a vehicle category",
      isComplete: hasVehicle,
      value: vehicleName
        ? estimateLabel
          ? `${vehicleName} · ${estimateLabel}`
          : vehicleName
        : null,
      step: 2,
      priority: "critical",
    },
    {
      key: "contact",
      label: "Contact Info",
      description: "Provide your contact details",
      isComplete: hasContactInfo,
      value: contactLabel,
      step: 3,
      priority: "important",
    },
  ];

  const completedCount = checklist.filter((item) => item.isComplete).length;
  const totalCount = checklist.length;
  const allComplete = completedCount === totalCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Determine if a step is navigable (can only go to steps that are <= current or already unlocked)
  function canNavigate(item: ChecklistItem): boolean {
    if (item.step <= currentStep) return true;
    // Allow going to step 2 if step 1 items are all complete
    if (item.step === 2) {
      return checklist.filter((c) => c.step === 1).every((c) => c.isComplete);
    }
    // Allow going to step 3 if step 1 & 2 items are all complete
    if (item.step === 3) {
      return checklist.filter((c) => c.step <= 2).every((c) => c.isComplete);
    }
    return false;
  }

  function handleClick(item: ChecklistItem) {
    if (item.isComplete && item.step === currentStep) return;
    if (canNavigate(item)) {
      onGoToStep(item.step);
    }
  }

  const stepLabels: Record<number, string> = {
    1: "Trip Details",
    2: "Vehicle",
    3: "Confirm",
  };

  // Group items by step
  const steps = [1, 2, 3] as const;

  return (
    <div className={styles.container}>
      {/* Header with progress */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.icon}>{allComplete ? "✅" : "📋"}</span>
          <div className={styles.headerText}>
            <h3 className={styles.title}>
              {allComplete ? "Ready to Submit" : "Booking Progress"}
            </h3>
            <p className={styles.subtitle}>
              {allComplete
                ? "All details filled — review and submit"
                : `${completedCount} of ${totalCount} completed`}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist grouped by step */}
      <div className={styles.checklist}>
        {steps.map((stepNum) => {
          const stepItems = checklist.filter((item) => item.step === stepNum);
          const isCurrentStep = stepNum === currentStep;
          const stepComplete = stepItems.every((item) => item.isComplete);

          return (
            <div key={stepNum} className={styles.stepGroup}>
              <div
                className={`${styles.stepHeader} ${isCurrentStep ? styles.stepHeaderActive : ""} ${stepComplete ? styles.stepHeaderComplete : ""}`}
              >
                <div
                  className={`${styles.stepNumber} ${isCurrentStep ? styles.stepNumberActive : ""} ${stepComplete ? styles.stepNumberComplete : ""}`}
                >
                  {stepComplete ? "✓" : stepNum}
                </div>
                <span className={styles.stepLabel}>{stepLabels[stepNum]}</span>
                {isCurrentStep && (
                  <span className={styles.currentBadge}>Current</span>
                )}
              </div>

              <div className={styles.stepItems}>
                {stepItems.map((item) => {
                  const navigable = canNavigate(item);
                  const isClickable = navigable && !item.isComplete;
                  const isOnDifferentStep = item.step !== currentStep;

                  return (
                    <div
                      key={item.key}
                      className={`${styles.checkItem} ${item.isComplete ? styles.complete : styles.incomplete} ${isClickable || (navigable && isOnDifferentStep) ? styles.clickable : ""}`}
                      onClick={() =>
                        (isClickable || (navigable && isOnDifferentStep)) &&
                        handleClick(item)
                      }
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (
                          isClickable &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          handleClick(item);
                        }
                      }}
                    >
                      <div className={styles.checkIcon}>
                        {item.isComplete ? "✓" : "○"}
                      </div>
                      <div className={styles.checkContent}>
                        <div className={styles.checkLabel}>{item.label}</div>
                        {item.isComplete ? (
                          <div className={styles.checkValue}>{item.value}</div>
                        ) : (
                          <div className={styles.checkDescription}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      {(isClickable || (navigable && isOnDifferentStep)) && (
                        <div className={styles.goToArrow}>→</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
