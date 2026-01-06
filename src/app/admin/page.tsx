// app/admin/page.tsx
import AdminPageIntro from "@/components/admin/AdminPageIntro/AdminPageIntro";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const [pendingReview, pendingPayment, confirmed] = await Promise.all([
    db.booking.count({ where: { status: "PENDING_REVIEW" } }),
    db.booking.count({ where: { status: "PENDING_PAYMENT" } }),
    db.booking.count({ where: { status: "CONFIRMED" } }),
  ]);

  return (
    <>
      <AdminPageIntro
        name='Barry'
        pendingReview={pendingReview}
        pendingPayment={pendingPayment}
        confirmed={confirmed}
      />
    </>
  );
}
