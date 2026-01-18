import AdminBlackoutDates, {
  BlackoutItem,
} from "@/components/admin/AdminBlackoutDates/AdminBlackoutDates";
import { db } from "@/lib/db";

export default async function AdminBlackoutDatesSection() {
  const items = await db.blackoutDate.findMany({
    orderBy: [{ ymd: "asc" }],
    select: { id: true, ymd: true, reason: true },
  });

  return <AdminBlackoutDates items={items as BlackoutItem[]} />;
}
