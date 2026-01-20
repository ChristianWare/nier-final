import { getMyAdminNotificationSettings} from "../../../../actions/admin/notificationSettings";
import AdminNotificationSettingsForm from "@/components/admin/AdminNotificationSettingsForm/AdminNotificationSettingsForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const initial = await getMyAdminNotificationSettings();

  return (
    <section className='container'>
      <header className='header'>
        <h1 className='heading h2'>Admin settings</h1>
        <p className='subheading'>
          Control which booking events trigger admin alerts via email and SMS.
        </p>
      </header>

      <AdminNotificationSettingsForm initial={initial} />
    </section>
  );
}
