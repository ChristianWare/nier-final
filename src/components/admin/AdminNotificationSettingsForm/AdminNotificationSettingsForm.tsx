"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import styles from "./AdminNotificationSettingsForm.module.css";
import { saveMyAdminNotificationSettings } from "../../../../actions/admin/notificationSettings";
import { EVENT_META } from "@/lib/notifications/events";
import Button from "@/components/shared/Button/Button";

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
        <div className='cardTitle h4'>Email event triggers</div>
        <div className={styles.table}>
          <div className={styles.headerRow}>
            <div className='emptyTitleSmall'>Event</div>
            <div className='emptyTitleSmall'>Email</div>
          </div>

          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName} className={styles.group}>
              <div className='emptyTitle'>{groupName}</div>

              {items.map((it) => (
                <div key={it.key} className={styles.row}>
                  <div className='subheading'>{it.label}</div>

                  <div className={styles.colCheck}>
                    <input
                      type='checkbox'
                      name='emailEvents'
                      value={it.key}
                      defaultChecked={initial.emailEvents.includes(it.key)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          text={isPending ? "Saving..." : "Save settings"}
          btnType='blackReg'
          disabled={isPending}
          type='submit'
        />
      </div>
    </form>
  );
}
