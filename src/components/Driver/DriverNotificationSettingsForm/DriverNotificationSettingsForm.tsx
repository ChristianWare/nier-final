"use client";

// components/driver/DriverNotificationSettingsForm/DriverNotificationSettingsForm.tsx

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import styles from "./DriverNotificationSettingsForm.module.css";
import { saveMyDriverNotificationSettings } from "../../../../actions/driver/notificationSettings";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import Button from "@/components/shared/Button/Button";

type InitialSettings = {
  emailEnabled: boolean;
  emailTo: string;
  emailRideAssigned: boolean;
  emailRideReminder: boolean;
  emailTripUpdated: boolean;
  emailTripCancelled: boolean;
};

type BoolPrefKey =
  | "emailEnabled"
  | "emailRideAssigned"
  | "emailRideReminder"
  | "emailTripUpdated"
  | "emailTripCancelled";

type Props = {
  initial: InitialSettings;
};

const EVENT_ROWS: { key: BoolPrefKey; label: string; note: string }[] = [
  {
    key: "emailRideAssigned",
    label: "New ride assigned",
    note: "Receive an email when a trip is assigned to you",
  },
  {
    key: "emailRideReminder",
    label: "Upcoming ride reminder",
    note: "Get reminded before your trip starts",
  },
  {
    key: "emailTripUpdated",
    label: "Trip details updated",
    note: "Notified when pickup time, address, or notes change",
  },
  {
    key: "emailTripCancelled",
    label: "Trip cancelled",
    note: "Alerted when one of your assigned trips is cancelled",
  },
];

export default function DriverNotificationSettingsForm({ initial }: Props) {
  const [prefs, setPrefs] = useState<InitialSettings>(initial);
  const [savingKey, setSavingKey] = useState<BoolPrefKey | null>(null);

  // ── Email address edit state ──────────────────────────────────────────────
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInputValue, setEmailInputValue] = useState(initial.emailTo);
  const [savingEmail, setSavingEmail] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const isEmailDirty = isEditingEmail && emailInputValue !== prefs.emailTo;

  useDirtyForm(
    "driver-notification-email",
    isEmailDirty,
    undefined,
    isEmailDirty ? ["Notification email address"] : [],
  );

  // ── Save a single boolean pref ────────────────────────────────────────────

  async function handleToggle(key: BoolPrefKey) {
    const newValue = !prefs[key];
    const prev = { ...prefs };
    const next = { ...prefs, [key]: newValue };

    setPrefs(next);
    setSavingKey(key);

    try {
      const fd = new FormData();
      Object.entries(next).forEach(([k, v]) => {
        if (typeof v === "boolean") {
          if (v) fd.append(k, "on");
        } else if (typeof v === "string" && v) {
          fd.append(k, v);
        }
      });

      const res = await saveMyDriverNotificationSettings(fd);
      if ("error" in res) {
        setPrefs(prev);
        toast.error(res.error ?? "Something went wrong");
      } else {
        toast.success("Saved.");
      }
    } catch {
      setPrefs(prev);
      toast.error("Failed to save. Please try again.");
    } finally {
      setSavingKey(null);
    }
  }

  // ── Email edit handlers ───────────────────────────────────────────────────

  function handleEditEmail() {
    setEmailInputValue(prefs.emailTo);
    setJustSaved(false);
    setIsEditingEmail(true);
    setTimeout(() => emailInputRef.current?.focus(), 0);
  }

  function handleCancelEmail() {
    setEmailInputValue(prefs.emailTo);
    setIsEditingEmail(false);
    setJustSaved(false);
  }

  async function handleSaveEmail() {
    const emailTo = emailInputValue.trim();
    if (!emailTo) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSavingEmail(true);

    try {
      const fd = new FormData();
      Object.entries(prefs).forEach(([k, v]) => {
        if (typeof v === "boolean") {
          if (v) fd.append(k, "on");
        }
      });
      fd.append("emailTo", emailTo);

      const res = await saveMyDriverNotificationSettings(fd);
      if ("error" in res) {
        toast.error(res.error ?? "Something went wrong");
      } else {
        setPrefs((p) => ({ ...p, emailTo }));
        setJustSaved(true);
        toast.success("Email address updated.");
        // Close edit mode after the flash so user sees the green button briefly
        setTimeout(() => {
          setIsEditingEmail(false);
          setJustSaved(false);
        }, 1500);
      }
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSavingEmail(false);
    }
  }

  const eventsDisabled = !prefs.emailEnabled;

  return (
    <div className={styles.form}>
      {/* ── Master email toggle + address ── */}
      <div
        className={`${styles.section} ${isEditingEmail ? styles.sectionEditing : ""}`}
      >
        {/* Master toggle row */}
        <h2 className='cardTitle h4'>Email notifications</h2>
        <div
          className={styles.toggleRow}
          style={{ paddingTop: 0, border: "none", paddingBottom: 0 }}
        >
          <div className={styles.toggleInfo}>
            <span className={styles.toggleNote}>
              {prefs.emailEnabled
                ? "You will receive email alerts for the events below."
                : "Email notifications are turned off."}
            </span>
          </div>

          <button
            type='button'
            role='switch'
            aria-checked={prefs.emailEnabled}
            aria-label='Email notifications'
            disabled={savingKey === "emailEnabled"}
            className={`${styles.toggle} ${prefs.emailEnabled ? styles.toggleOn : styles.toggleOff}`}
            onClick={() => handleToggle("emailEnabled")}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>

        {/* Email address — only shown when email is enabled */}
        {prefs.emailEnabled && (
          <div className={styles.emailBlock}>
            <span className={styles.label}>Send notifications to</span>

            {isEditingEmail ? (
              /* ── Edit mode ── */
              <div className={styles.emailEditRow}>
                <input
                  ref={emailInputRef}
                  type='email'
                  className={`inputBorder ${styles.input}`}
                  value={emailInputValue}
                  placeholder='your@email.com'
                  disabled={savingEmail || justSaved}
                  onChange={(e) => setEmailInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEmail();
                    if (e.key === "Escape") handleCancelEmail();
                  }}
                />
                <div className={styles.sectionActionsRow}>
                  {justSaved ? (
                    <Button
                      text='Saved ✓'
                      btnType='greenReg'
                      type='button'
                      disabled
                    />
                  ) : (
                    <>
                      <Button
                        type='button'
                        text={savingEmail ? "Saving…" : "Save Changes"}
                        btnType='blackReg'
                        disabled={savingEmail || !emailInputValue.trim()}
                        onClick={handleSaveEmail}
                      />
                      {!savingEmail && (
                        <Button
                          text='Cancel'
                          btnType='redReg'
                          type='button'
                          onClick={handleCancelEmail}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* ── Display mode ── */
              <>
                <div className={`inputBorder ${styles.emailDisplayRow}`}>
                  <span className={styles.emailDisplay}>
                    {prefs.emailTo || (
                      <span className={styles.emailPlaceholder}>
                        No email set
                      </span>
                    )}
                  </span>
                </div>

                <div className={styles.btnContainer}>
                  <Button
                    text='Edit Email'
                    btnType='blackReg'
                    type='button'
                    onClick={handleEditEmail}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Individual event toggles ── */}
      <div className={styles.section}>
        <p className='emptyTitleSmall'>Trip Events</p>

        <div className={styles.toggleList}>
          {EVENT_ROWS.map((row) => {
            const isOn = prefs[row.key];
            const isSaving = savingKey === row.key;
            const isDisabled = eventsDisabled || isSaving;

            return (
              <div
                key={row.key}
                className={`${styles.toggleRow} ${isDisabled ? styles.toggleRowDisabled : ""}`}
              >
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleLabel}>{row.label}</span>
                  <span className={styles.toggleNote}>{row.note}</span>
                </div>

                <button
                  type='button'
                  role='switch'
                  aria-checked={isOn}
                  aria-label={row.label}
                  disabled={isDisabled}
                  className={`${styles.toggle} ${isOn ? styles.toggleOn : styles.toggleOff}`}
                  onClick={() => handleToggle(row.key)}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
