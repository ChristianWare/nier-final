import { getCompanySettings } from "../../../../../actions/admin/companySettings"; 
import CompanySettingsForm from "@/components/admin/CompanySettingsForm/CompanySettingsForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminCompanySettingsPage() {
  const initial = await getCompanySettings();

  return (
    <section className='container'>
      <header className='header'>
        <h1 className='heading h2'>Company Settings</h1>
        <p className='subheading'>
          Manage contact information displayed to drivers on the support page.
        </p>
      </header>

      <CompanySettingsForm initial={initial} />
    </section>
  );
}
