// "Add to calendar" for a ride: a small menu with Apple Calendar or Outlook
// (the .ics download) and Google Calendar. Built on <details>, so it works
// without any script.

import Calendar from "@/components/shared/icons/Calendar/Calendar";
import { googleCalendarUrl, type CalendarEvent } from "@/lib/calendar";
import styles from "./AddToCalendar.module.css";

type Props = {
  /** A customer's ride: the .ics comes from /dashboard/trips/[id]/calendar. */
  bookingId?: string;
  /** Or the .ics link itself (corporate rides have their own). */
  icsHref?: string;
  event: CalendarEvent;
  /** Just the calendar icon, for a row in a list; the menu opens leftward. */
  compact?: boolean;
};

export default function AddToCalendar({
  bookingId,
  icsHref,
  event,
  compact = false,
}: Props) {
  const ics = icsHref ?? `/dashboard/trips/${bookingId}/calendar`;
  return (
    <details className={`${styles.menu} ${compact ? styles.compact : ""}`}>
      <summary
        className={styles.button}
        aria-label={compact ? "Add to calendar" : undefined}
        title={compact ? "Add to calendar" : undefined}
      >
        <Calendar className={styles.icon} aria-hidden='true' />
        {compact ? null : "Add to calendar"}
      </summary>
      <div className={styles.panel}>
        <a href={ics} className={styles.option} download>
          Apple Calendar or Outlook
        </a>
        <a
          href={googleCalendarUrl(event)}
          className={styles.option}
          target='_blank'
          rel='noopener noreferrer'
        >
          Google Calendar
        </a>
      </div>
    </details>
  );
}
