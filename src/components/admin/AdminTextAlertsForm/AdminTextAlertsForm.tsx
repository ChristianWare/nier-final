"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import styles from "./AdminTextAlertsForm.module.css";
import { saveMyAdminTextAlertSettings } from "../../../../actions/admin/notificationSettings";
import { EVENT_META } from "@/lib/notifications/events";
import { SMS_CARRIERS } from "@/lib/sms/carriers";

type Props = {
  initial: {
    smsEnabled: boolean;
    smsTo: string | null;
    smsCarrier: string | null;
    smsEvents: string[];
  };
};

/** Sensible starting point: the alert that actually costs money to miss. */
const DEFAULT_PICK = ["BOOKING_REQUESTED"];

function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function AdminTextAlertsForm({ initial }: Props) {
  const [enabled, setEnabled] = useState(initial.smsEnabled);
  const [phone, setPhone] = useState(formatPhone(initial.smsTo ?? ""));
  const [carrier, setCarrier] = useState(initial.smsCarrier ?? "");
  const [events, setEvents] = useState<string[]>(
    initial.smsEvents.length > 0 ? initial.smsEvents : DEFAULT_PICK,
  );
  const [saving, setSaving] = useState(false);

  const allEvents = Object.entries(EVENT_META).map(([key, meta]) => ({
    key,
    ...meta,
  }));

  function toggleEvent(key: string) {
    setEvents((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("smsEnabled", enabled ? "true" : "false");
      fd.append("smsTo", phone);
      fd.append("smsCarrier", carrier);
      events.forEach((k) => fd.append("smsEvents", k));

      const res = await saveMyAdminTextAlertSettings(fd);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(
          enabled ? "Text alerts saved." : "Text alerts turned off.",
        );
      }
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.form}>
      {/* Master switch */}
      <div className={styles.switchRow}>
        <div>
          <p className='subheading'>Send me text alerts</p>
          <p className={styles.hint}>
            Delivered through your carrier&apos;s text gateway. Usually arrives
            within seconds, but email remains the reliable copy.
          </p>
        </div>
        <button
          type='button'
          role='switch'
          aria-checked={enabled}
          aria-label='Send me text alerts'
          disabled={saving}
          className={`${styles.toggle} ${enabled ? styles.toggleOn : styles.toggleOff}`}
          onClick={() => setEnabled((v) => !v)}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Number + carrier */}
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor='smsTo'>
                Mobile number
              </label>
              <input
                id='smsTo'
                name='smsTo'
                type='tel'
                inputMode='numeric'
                autoComplete='tel'
                placeholder='(480) 555-1234'
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor='smsCarrier'>
                Mobile carrier
              </label>
              <select
                id='smsCarrier'
                name='smsCarrier'
                className={styles.select}
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              >
                <option value=''>Select carrier…</option>
                {SMS_CARRIERS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className={styles.hint}>
                Not sure? Check your phone bill, or ask your carrier. Prepaid
                plans usually run on one of the major networks.
              </p>
            </div>
          </div>

          {/* Which events */}
          <div className={styles.eventsBlock}>
            <p className={styles.label}>Text me when…</p>
            <p className={styles.hint}>
              Keep this short. Too many texts and you&apos;ll stop reading them.
            </p>
            <div className={styles.checkList}>
              {allEvents.map((ev) => (
                <label key={ev.key} className={styles.checkRow}>
                  <input
                    type='checkbox'
                    checked={events.includes(ev.key)}
                    onChange={() => toggleEvent(ev.key)}
                  />
                  <span>{ev.label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      <div className={styles.actions}>
        <button
          type='button'
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save text alert settings"}
        </button>
      </div>
    </div>
  );
}
