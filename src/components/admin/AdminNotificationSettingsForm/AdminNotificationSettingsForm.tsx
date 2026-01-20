"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import styles from "./AdminNotificationSettingsForm.module.css";
import { saveMyAdminNotificationSettings } from "../../../../actions/admin/notificationSettings";
import { EVENT_META } from "@/lib/notifications/events";

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
  const [isPending, startTransition] = useTransition();

  const events = Object.entries(EVENT_META).map(([key, meta]) => ({
    key,
    ...meta,
  }));

  const groups = {
    Bookings: events.filter((e) => e.group === "Bookings"),
    Payments: events.filter((e) => e.group === "Payments"),
    "Driver & Trip": events.filter((e) => e.group === "Driver & Trip"),
  } as const;

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);

        startTransition(() => {
          saveMyAdminNotificationSettings(fd).then((res) => {
            if (res?.error) return toast.error(res.error);
            toast.success("Notification settings saved.");
          });
        });
      }}
    >
      <div className={styles.section}>
        <div className='cardTitle h4'>Channels</div>

        <div className={styles.channelRow}>
          <label className={styles.checkRow}>
            <input
              type='checkbox'
              name='emailEnabled'
              defaultChecked={initial.emailEnabled}
            />
            <span>Email notifications</span>
          </label>

          <div className={styles.field}>
            <div className='emptyTitleSmall'>Send to (optional override)</div>
            <input
              name='emailTo'
              className='input emptySmall'
              placeholder='ops@yourdomain.com'
              defaultValue={initial.emailTo ?? ""}
              inputMode='email'
            />
            <div className='val' style={{ opacity: 0.75, fontSize: 12 }}>
              If blank, we’ll use your admin account email.
            </div>
          </div>
        </div>

        <div className={styles.channelRow}>
          <label className={styles.checkRow}>
            <input
              type='checkbox'
              name='smsEnabled'
              defaultChecked={initial.smsEnabled}
            />
            <span>SMS notifications</span>
          </label>

          <div className={styles.field}>
            <div className='emptyTitleSmall'>Send to (E.164)</div>
            <input
              name='smsTo'
              className='input emptySmall'
              placeholder='+16025551234'
              defaultValue={initial.smsTo ?? ""}
              inputMode='tel'
            />
            <div className='val' style={{ opacity: 0.75, fontSize: 12 }}>
              Use E.164 format (example: +16025551234).
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className='cardTitle h4'>Event triggers</div>
        <div className={styles.table}>
          <div className={styles.headerRow}>
            <div className={styles.colEvent}>Event</div>
            <div className={styles.colCheck}>Email</div>
            <div className={styles.colCheck}>SMS</div>
          </div>

          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} className={styles.group}>
              <div className={styles.groupTitle}>{groupName}</div>

              {items.map((it) => (
                <div key={it.key} className={styles.row}>
                  <div className={styles.colEvent}>{it.label}</div>

                  <div className={styles.colCheck}>
                    <input
                      type='checkbox'
                      name='emailEvents'
                      value={it.key}
                      defaultChecked={initial.emailEvents.includes(it.key)}
                    />
                  </div>

                  <div className={styles.colCheck}>
                    <input
                      type='checkbox'
                      name='smsEvents'
                      value={it.key}
                      defaultChecked={initial.smsEvents.includes(it.key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className='miniNote'>
          Tip: keep SMS to only high-urgency events (new booking + payment
          received).
        </div>
      </div>

      <div className={styles.actions}>
        <button className='primaryBtn' type='submit' disabled={isPending}>
          {isPending ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}
