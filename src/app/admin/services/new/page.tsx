import { createService } from "../../../../../actions/admin/services";
import NewServiceForm from "./NewServiceForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function NewServicePage() {
  return (
    <section style={{ display: "grid", gap: 14, maxWidth: 720 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>New service</h1>
      <NewServiceForm action={createService} />
    </section>
  );
}
