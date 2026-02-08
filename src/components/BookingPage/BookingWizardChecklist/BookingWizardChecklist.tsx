"use client";

import Arrow from "@/components/shared/icons/Arrow/Arrow";
import styles from "./BookingWizardChecklist.module.css";
import Check from "@/components/shared/icons/Check/Check";

export type ChecklistItem = {
  key: string;
  label: string;
  description: string;
  isComplete: boolean;
  value: string | null;
  step: number;
  priority: "critical" | "important";
  sectionId: string;
};

type Props = {
  currentStep: number;
  onGoToStep: (step: number) => void;
  // Step 1 fields
  hasService: boolean;
  serviceName: string | null;
  hasDateTime: boolean;
  dateTimeLabel: string | null;
  hasPickup: boolean;
  pickupLabel: string | null;
  hasDropoff: boolean;
  dropoffLabel: string | null;
  hasPassengersLuggage: boolean;
  passengersLuggageLabel: string | null;
  // Step 2
  hasVehicle: boolean;
  vehicleName: string | null;
  estimateLabel: string | null;
  // Step 3
  hasContactInfo: boolean;
  contactLabel: string | null;
  // Optional overrides for admin wizard
  customItems?: ChecklistItem[];
  customStepLabels?: Record<number, string>;
};

/** Scroll to a form section and apply a green highlight pulse */
function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (!el) return;

  const yOffset = -120;
  const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
  window.scrollTo({ top: y, behavior: "smooth" });

  // Remove any existing highlight first
  el.classList.remove("wizard-field-highlight", "wizard-field-highlight-fade");

  // Force reflow so re-adding the class triggers animation
  void el.offsetWidth;

  el.classList.add("wizard-field-highlight");

  setTimeout(() => {
    el.classList.add("wizard-field-highlight-fade");
  }, 4000);

  setTimeout(() => {
    el.classList.remove(
      "wizard-field-highlight",
      "wizard-field-highlight-fade",
    );
  }, 5000);
}

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
  hasPassengersLuggage,
  passengersLuggageLabel,
  customItems,
  customStepLabels,
}: Props) {
  // Default 3-step checklist for customer-facing wizard
  const defaultChecklist: ChecklistItem[] = [
    {
      key: "service",
      label: "Service Type",
      description: "Choose a service for your trip",
      isComplete: hasService,
      value: serviceName,
      step: 1,
      priority: "critical",
      sectionId: "wizard-field-service",
    },
    {
      key: "datetime",
      label: "Date & Time",
      description: "Select your pickup date and time",
      isComplete: hasDateTime,
      value: dateTimeLabel,
      step: 1,
      priority: "critical",
      sectionId: "wizard-field-datetime",
    },
    {
      key: "passengers-luggage",
      label: "Passengers & Luggage",
      description: "How many passengers and bags?",
      isComplete: hasPassengersLuggage,
      value: passengersLuggageLabel,
      step: 1,
      priority: "critical",
      sectionId: "wizard-field-passengers-luggage",
    },
    {
      key: "pickup",
      label: "Pickup Location",
      description: "Enter your pickup address",
      isComplete: hasPickup,
      value: pickupLabel,
      step: 1,
      priority: "critical",
      sectionId: "wizard-field-pickup",
    },
    {
      key: "dropoff",
      label: "Dropoff Location",
      description: "Enter your destination",
      isComplete: hasDropoff,
      value: dropoffLabel,
      step: 1,
      priority: "critical",
      sectionId: "wizard-field-dropoff",
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
      sectionId: "wizard-field-vehicle",
    },
    {
      key: "contact",
      label: "Contact Info",
      description: "Provide your contact details",
      isComplete: hasContactInfo,
      value: contactLabel,
      step: 3,
      priority: "important",
      sectionId: "wizard-field-contact",
    },
  ];

  const defaultStepLabels: Record<number, string> = {
    1: "Trip Details",
    2: "Vehicle",
    3: "Confirm",
  };

  // Use custom items/labels if provided (admin wizard), otherwise defaults
  const allItems = customItems ?? defaultChecklist;
  const activeStepLabels = customStepLabels ?? defaultStepLabels;
  const stepNums = [...new Set(allItems.map((i) => i.step))].sort(
    (a, b) => a - b,
  );
  const maxStep = stepNums[stepNums.length - 1] ?? 3;

  // ✅ Only show items as "visually complete" (green) if we've reached that step
  function isVisuallyComplete(item: ChecklistItem): boolean {
    if (item.step > currentStep) return false;
    return item.isComplete;
  }

  const visuallyCompleteCount = allItems.filter((item) =>
    isVisuallyComplete(item),
  ).length;
  const totalCount = allItems.length;
  const allComplete =
    currentStep >= maxStep && allItems.every((item) => item.isComplete);
  const progressPercent = Math.round(
    (visuallyCompleteCount / totalCount) * 100,
  );

  function canNavigate(item: ChecklistItem): boolean {
    if (item.step <= currentStep) return true;
    // Can navigate to the next step only if all previous steps are complete
    const previousItems = allItems.filter((c) => c.step < item.step);
    return previousItems.every((c) => c.isComplete);
  }

  function handleClick(item: ChecklistItem) {
    const navigable = canNavigate(item);
    if (!navigable) return;

    if (item.step === currentStep) {
      // Same step — just scroll + highlight
      scrollToSection(item.sectionId);
    } else {
      // Switch step, then scroll after render
      onGoToStep(item.step);
      setTimeout(() => {
        scrollToSection(item.sectionId);
      }, 300);
    }
  }

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
                : `${visuallyCompleteCount} of ${totalCount} completed`}
            </p>
          </div>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist grouped by step */}
      <div className={styles.checklist}>
        {stepNums.map((stepNum) => {
          const stepItems = allItems.filter((item) => item.step === stepNum);
          const isCurrentStep = stepNum === currentStep;
          const stepComplete =
            stepNum <= currentStep &&
            stepItems.every((item) => item.isComplete);

          return (
            <div key={stepNum} className={styles.stepGroup}>
              <div
                className={`${styles.stepHeader} ${isCurrentStep ? styles.stepHeaderActive : ""} ${stepComplete ? styles.stepHeaderComplete : ""}`}
              >
                <div
                  className={`${styles.stepNumber} ${isCurrentStep ? styles.stepNumberActive : ""} ${stepComplete ? styles.stepNumberComplete : ""}`}
                ></div>
                <span className={styles.stepLabel}>
                  <div className={styles.stepNum}>{stepNum}.</div>
                  {activeStepLabels[stepNum] ?? `Step ${stepNum}`}
                </span>
                {isCurrentStep && (
                  <span className={styles.currentBadge}>Current</span>
                )}
              </div>

              <div className={styles.stepItems}>
                {stepItems.map((item) => {
                  const visualComplete = isVisuallyComplete(item);
                  const navigable = canNavigate(item);
                  const isClickable = navigable;

                  return (
                    <div
                      key={item.key}
                      className={`${styles.checkItem} ${visualComplete ? styles.complete : styles.incomplete} ${isClickable ? styles.clickable : ""}`}
                      onClick={() => isClickable && handleClick(item)}
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
                        {visualComplete ? (
                          <Check className={styles.checkIcon} />
                        ) : (
                          <Check className={styles.checkIconGhost} />
                        )}
                      </div>
                      <div className={styles.checkContent}>
                        <div className={styles.checkLabel}>{item.label}</div>
                        {visualComplete ? (
                          <div className={styles.checkValue}>{item.value}</div>
                        ) : (
                          <div className={styles.checkDescription}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      {isClickable && (
                        <div className={styles.goToArrow}>
                          <Arrow className={styles.arrow} />
                        </div>
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
