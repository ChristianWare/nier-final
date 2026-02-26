// app/(driver)/driver-dashboard/notifications/page.tsx
import styles from "./NotificationsPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { getMyDriverNotificationSettings } from "../../../../actions/driver/notificationSettings";
import DriverNotificationSettingsForm from "@/components/Driver/DriverNotificationSettingsForm/DriverNotificationSettingsForm";
import PushNotificationToggleServer from "@/components/shared/PushNotificationToggle/PushNotificationToggleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function getRoles(
  session: { user?: { roles?: unknown; role?: unknown } } | null,
): AppRole[] {
  const roles = session?.user?.roles;
  if (Array.isArray(roles) && roles.length > 0) return roles as AppRole[];
  const role = session?.user?.role;
  return role ? ([role] as AppRole[]) : (["USER"] as AppRole[]);
}

export default async function DriverNotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login?next=/driver-dashboard/notifications");

  const roles = getRoles(session);
  const isAdmin = roles.includes("ADMIN");
  const isDriver = roles.includes("DRIVER");

  if (!isAdmin && !isDriver) redirect("/");

  const initial = await getMyDriverNotificationSettings();

  return (
    <section className={styles.container}>
      {/* ── Email Notifications ── */}
      <div className={styles.block}>
        <header className={styles.blockHeader}>
          <h1 className='heading h2'>Email Notifications</h1>
          <p className='subheading'>
            Control which trip events send you an email alert.
          </p>
        </header>

        <DriverNotificationSettingsForm initial={initial} />
      </div>

      {/* ── Push Notifications ── */}
      <div className={styles.block}>
        <header className={styles.blockHeader}>
          <h2 className='heading h2'>Push Notifications</h2>
          <p className='subheading'>
            Enable push alerts on this device for new assignments, reminders,
            and trip changes. Each device must be enabled separately.
          </p>
        </header>

        <PushNotificationToggleServer />
      </div>
    </section>
  );
}
