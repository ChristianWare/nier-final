import NewInvoiceForm from "./NewInvoiceForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminNewInvoicePage() {
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

      <NewInvoiceForm />
    </section>
  );
}