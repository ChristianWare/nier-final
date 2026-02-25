import { getMyAdminNotificationSettings } from "../../../../actions/admin/notificationSettings";
import AdminNotificationSettingsForm from "@/components/admin/AdminNotificationSettingsForm/AdminNotificationSettingsForm";
import PushNotificationToggleServer from "@/components/shared/PushNotificationToggle/PushNotificationToggleServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const initial = await getMyAdminNotificationSettings();

  return (
    <>
      {/* ── Email Notification Settings ── */}
      <section className='container'>
        <header className='header'>
          <h1 className='heading h2'>Email Notifications</h1>
          <p className='subheading'>
            Control which booking events trigger admin alerts via email.
          </p>
        </header>

        <AdminNotificationSettingsForm initial={initial} />
      </section>

      {/* ── Push Notification Settings ── */}
      <section className='container' style={{ marginTop: "7rem" }}>
        <header className='header'>
          <h2 className='heading h2'>Push notifications</h2>
          <p className='subheading'>
            Enable push alerts on this device for new bookings, payments, and
            cancellations. Each device must be enabled separately.
          </p>
        </header>

        <PushNotificationToggleServer />
      </section>
    </>
  );
}
