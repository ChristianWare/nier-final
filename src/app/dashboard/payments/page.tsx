/* eslint-disable @typescript-eslint/no-explicit-any */
import styles from "./PaymentsPage.module.css";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardPayments from "@/components/Dashboard/DashboardPayments/DashboardPayments";
import { PaymentStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Filter = "all" | "paid" | "pending" | "failed" | "refunded";

function normalizeFilter(v?: string | null): Filter {
  if (v === "paid") return "paid";
  if (v === "pending") return "pending";
  if (v === "failed") return "failed";
  if (v === "refunded") return "refunded";
  return "all";
}

type SearchParams = { status?: string | string[] };

async function resolveUserId(session: any) {
  const sessionUserId =
    (session?.user as { id?: string } | undefined)?.id ?? null;
  if (sessionUserId) return sessionUserId;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

const FILTER_MAP: Record<Exclude<Filter, "all">, PaymentStatus[]> = {
  paid: ["PAID"],
  pending: ["NONE", "PENDING"],
  failed: ["FAILED"],
  refunded: ["REFUNDED", "PARTIALLY_REFUNDED"],
};

export default async function DashboardPaymentsPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/payments");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/dashboard/payments");

  const sp = await Promise.resolve(searchParams);
  const rawStatus = Array.isArray(sp?.status) ? sp?.status[0] : sp?.status;
  const filter = normalizeFilter(rawStatus);

  const [counts, payments] = await Promise.all([
    (async () => {
      const [all, paid, pending, failed, refunded] = await Promise.all([
        db.payment.count({ where: { booking: { userId } } }),
        db.payment.count({
          where: { booking: { userId }, status: { in: FILTER_MAP.paid } },
        }),
        db.payment.count({
          where: { booking: { userId }, status: { in: FILTER_MAP.pending } },
        }),
        db.payment.count({
          where: { booking: { userId }, status: { in: FILTER_MAP.failed } },
        }),
        db.payment.count({
          where: { booking: { userId }, status: { in: FILTER_MAP.refunded } },
        }),
      ]);

      return { all, paid, pending, failed, refunded };
    })(),
    db.payment.findMany({
      where:
        filter === "all"
          ? { booking: { userId } }
          : { booking: { userId }, status: { in: FILTER_MAP[filter] } },
      orderBy: [{ booking: { pickupAt: "desc" } }, { updatedAt: "desc" }],
      take: 250,
      include: {
        booking: {
          select: {
            id: true,
            pickupAt: true,
            pickupAddress: true,
            dropoffAddress: true,
            status: true,
            totalCents: true,
            currency: true,
            serviceType: { select: { name: true, slug: true } },
          },
        },
      },
    }),
  ]);

  return (
    <section className={styles.container}>
      <DashboardPayments
        key={filter}
        filter={filter}
        counts={counts}
        payments={payments}
      />
    </section>
  );
}
