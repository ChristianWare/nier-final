import Link from "next/link";
import { notFound } from "next/navigation";
import Button from "@/components/shared/Button/Button";
import RideBadges, { Tip } from "@/components/admin/RideBadges/RideBadges";
import { db } from "@/lib/db";
import * as tz from "@/lib/timezone";
import { formatClock, formatMdy } from "@/lib/booking/statusBadge";
import { paymentTag, statusBadge } from "@/lib/booking/rideBadges";
import { describeDiscount, codeStatus } from "@/lib/discounts/discountRules";
import { RELEASED_STATUSES } from "@/lib/discounts/discountCodes";
import { toDiscountCodeInput } from "@/lib/discounts/discountForm";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import DiscountCodeForm from "../DiscountCodeForm";
import CodeActions from "../CodeActions";
import { STATUS_BADGE } from "../codeData";
import styles from "../../drivers/AdminDriversPage.module.css";
import own from "../DiscountCodes.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DiscountCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ timezone }, code] = await Promise.all([
    getCompanySettings(),
    db.discountCode.findUnique({ where: { id } }),
  ]);
  if (!code) notFound();

  const bookings = await db.booking.findMany({
    where: { discountCodeId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      pickupAt: true,
      totalCents: true,
      discountCents: true,
      tripGroupId: true,
      guestName: true,
      guestEmail: true,
      user: { select: { name: true, email: true } },
      payment: { select: { status: true } },
      tripGroup: { select: { paymentStatus: true, amountPaidCents: true } },
    },
  });
  const counted = bookings.filter((b) => !RELEASED_STATUSES.includes(b.status));
  const uses = new Set(counted.map((b) => b.tripGroupId ?? b.id)).size;
  const status = STATUS_BADGE[codeStatus(code, uses, new Date())];
  const money = (c: number) => tz.formatMoney(c, "USD");

  return (
    <section className={`${styles.container} ${own.page}`}>
      <header className={styles.header}>
        <div className='miniNote'>
          <Link href='/admin/discount-codes'>← All discount codes</Link>
        </div>
        <div className={own.headerRow}>
          <h1 className={`${styles.heading} h2 ${own.codeName}`}>
            {code.code}
          </h1>
          <Tip text={status.tip}>
            <span className={`badge ${status.cls}`}>{status.label}</span>
          </Tip>
        </div>
        <p className={`${styles.subcopy} ${own.subcopy}`}>
          {code.name}
          {code.partner ? ` · ${code.partner}` : ""} · {describeDiscount(code)}
        </p>
        <CodeActions
          id={code.id}
          code={code.code}
          active={code.active}
          used={bookings.length > 0}
        />
      </header>

      <div className={own.kpis}>
        <div className={own.kpi}>
          <span className='miniNote'>Uses</span>
          <span className={own.kpiValue}>
            {code.maxUses != null ? `${uses} / ${code.maxUses}` : uses}
          </span>
          <span className='miniNote'>A trip counts once</span>
        </div>
        <div className={own.kpi}>
          <span className='miniNote'>Rides</span>
          <span className={own.kpiValue}>{counted.length}</span>
          <span className='miniNote'>Not counting cancelled ones</span>
        </div>
        <div className={own.kpi}>
          <span className='miniNote'>Booked</span>
          <span className={own.kpiValue}>
            {tz.formatMoneyShort(
              counted.reduce((s, b) => s + b.totalCents, 0),
              "USD",
            )}
          </span>
          <span className='miniNote'>After the discount</span>
        </div>
        <div className={own.kpi}>
          <span className='miniNote'>Discount given</span>
          <span className={own.kpiValue}>
            {tz.formatMoneyShort(
              counted.reduce((s, b) => s + (b.discountCents ?? 0), 0),
              "USD",
            )}
          </span>
          <span className='miniNote'>Across those rides</span>
        </div>
      </div>

      <div className={styles.block}>
        <div className={styles.blockHead}>
          <h2 className='cardTitle h5'>Bookings that used it</h2>
          <span className='miniNote'>
            Cancelled and declined bookings are listed but don&apos;t count as
            uses.
          </span>
        </div>
        {bookings.length === 0 ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyTitle}>
              Nobody has used this code yet
            </div>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadRow}>
                  <th className={styles.th}>Booked</th>
                  <th className={styles.th}>Customer</th>
                  <th className={styles.th}>Pickup</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.num}`}>Price</th>
                  <th className={`${styles.th} ${styles.num}`}>Discount</th>
                  <th
                    className={`${styles.th} ${styles.num}`}
                    aria-label='Details'
                  />
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.dateCell}>
                        {formatMdy(b.createdAt, timezone)}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <strong>
                        {b.user?.name?.trim() ||
                          b.guestName?.trim() ||
                          "Customer"}
                      </strong>
                      <div className='miniNote'>
                        {b.user?.email ?? b.guestEmail ?? ""}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.dateCell}>
                        {formatMdy(b.pickupAt, timezone)}
                      </div>
                      <div className='miniNote'>
                        {formatClock(b.pickupAt, timezone)}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <RideBadges
                        status={statusBadge(b.status)}
                        payment={paymentTag({
                          status: b.status,
                          paymentStatus: b.payment?.status ?? null,
                          trip: b.tripGroup ?? null,
                        })}
                      />
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      {money(b.totalCents)}
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      −{money(b.discountCents ?? 0)}
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      <Button
                        href={`/admin/bookings/${b.id}`}
                        text='More Details'
                        btnType='blackReg'
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={styles.block}>
        <div className={styles.blockHead}>
          <h2 className='cardTitle h5'>Code details</h2>
        </div>
        <DiscountCodeForm initial={toDiscountCodeInput(code, timezone)} />
      </div>
    </section>
  );
}
