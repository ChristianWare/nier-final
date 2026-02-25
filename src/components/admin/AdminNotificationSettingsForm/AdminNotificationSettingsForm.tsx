"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import styles from "./AdminNotificationSettingsForm.module.css";
import { saveMyAdminNotificationSettings } from "../../../../actions/admin/notificationSettings";
import { EVENT_META } from "@/lib/notifications/events";
import type { NotificationEvent } from "@/lib/notifications/events";

type Props = {
  initial: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    emailTo: string | null;
    smsTo: string | null;
    emailEvents: string[];
    smsEvents: string[];
  };
};

export default function AdminNotificationSettingsForm({ initial }: Props) {
  const [emailEvents, setEmailEvents] = useState<string[]>(initial.emailEvents);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const events = Object.entries(EVENT_META).map(([key, meta]) => ({
    key,
    ...meta,
  }));

  const groups = {
    Bookings: events.filter((e) => e.group === "Bookings"),
    Payments: events.filter((e) => e.group === "Payments"),
    "Driver & Trip": events.filter((e) => e.group === "Driver & Trip"),
  } as const;

  async function handleToggle(key: NotificationEvent, currentlyOn: boolean) {
    const newEvents = currentlyOn
      ? emailEvents.filter((k) => k !== key)
      : [...emailEvents, key];

    // Optimistic update
    setEmailEvents(newEvents);
    setSavingKey(key);

    try {
      const fd = new FormData();
      newEvents.forEach((k) => fd.append("emailEvents", k));

      const res = await saveMyAdminNotificationSettings(fd);
      if (res?.error) {
        // Revert on error
        setEmailEvents(emailEvents);
        toast.error(res.error);
      } else {
        toast.success("Saved.");
      }
    } catch {
      // Revert on error
      setEmailEvents(emailEvents);
      toast.error("Failed to save. Please try again.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className={styles.form}>
      {Object.entries(groups).map(([groupName, items]) => (
        <div key={groupName} className={styles.section}>
          <div className='cardTitle h4'>{groupName}</div>

          <div className={styles.toggleList}>
            {items.map((it) => {
              const isOn = emailEvents.includes(it.key);
              const isSaving = savingKey === it.key;

              return (
                <div key={it.key} className={styles.toggleRow}>
                  <div className={styles.toggleInfo}>
                    <p className='subheading'>{it.label}</p>
                  </div>

                  <button
                    type='button'
                    role='switch'
                    aria-checked={isOn}
                    aria-label={it.label}
                    disabled={isSaving}
                    className={`${styles.toggle} ${isOn ? styles.toggleOn : styles.toggleOff}`}
                    onClick={() =>
                      handleToggle(it.key as NotificationEvent, isOn)
                    }
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
