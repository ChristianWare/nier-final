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
    <section style={{ display: "grid", gap: 14, maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Dashboard</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <Card title='Pending review' value={pendingReview} />
        <Card title='Pending payment' value={pendingPayment} />
        <Card title='Confirmed' value={confirmed} />
      </div>
    </section>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 14,
        padding: "1rem",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
