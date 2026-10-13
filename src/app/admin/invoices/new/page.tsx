import NewInvoiceForm from "./NewInvoiceForm";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import { defaultFromAddress } from "@/lib/invoice/invoiceAddress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminNewInvoicePage() {
  const settings = await getCompanySettings();

  return (
    <section className="container" aria-label="New invoice">
      <header className="header">
        <h1 className="heading h2">New invoice</h1>
        <p className="subheading">
          Bill an account holder or a guest for any amount. They&apos;ll pay
          through the same secure checkout used for bookings and get an emailed
          receipt.
        </p>
      </header>

      <NewInvoiceForm defaultFromAddress={defaultFromAddress(settings)} />
    </section>
  );
}