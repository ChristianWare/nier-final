import { getCompanySettings } from "../../../../actions/admin/companySettings";
import CompanySettingsForm from "@/components/admin/CompanySettingsForm/CompanySettingsForm";
import DirtyFormProvider from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminCompanyPage() {
  const initial = await getCompanySettings();

  return (
    <DirtyFormProvider>
      <section className='container'>
        <header className='header'>
          <h1 className='heading h2'>Company Settings</h1>
          <p className='subheading'>
            Manage contact information displayed to drivers on the support page.
          </p>
        </header>

        <CompanySettingsForm initial={initial} />
      </section>
    </DirtyFormProvider>
  );
}
