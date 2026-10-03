import { formatMdy } from "@/lib/booking/statusBadge";
import Button from "@/components/shared/Button/Button";
import * as tz from "@/lib/timezone";
import { describeDiscount } from "@/lib/discounts/discountRules";
import { Tip } from "@/components/admin/RideBadges/RideBadges";
import { getCompanySettings } from "../../../../actions/admin/companySettings";
import { loadCodes, STATUS_BADGE } from "./codeData";
import styles from "../drivers/AdminDriversPage.module.css";
import own from "./DiscountCodes.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function range(from: Date | null, until: Date | null, timezone: string) {
  const f = from ? formatMdy(from, timezone) : null;
  const t = until ? formatMdy(new Date(until.getTime() - 1), timezone) : null;
  if (f && t) return f === t ? f : `${f} – ${t}`;
  if (f) return `From ${f}`;
  if (t) return `Through ${t}`;
  return "Any time";
}

export default async function DiscountCodesPage() {
  const [{ timezone }, codes] = await Promise.all([
    getCompanySettings(),
    loadCodes(),
  ]);
  const money = (c: number) => tz.formatMoney(c, "USD");

  return (
    <section className={`${styles.container} ${own.page}`}>
      <header className={styles.header}>
        <div className={own.headerRow}>
          <h1 className={`${styles.heading} h2`}>Discount Codes</h1>
          <Button
            href='/admin/discount-codes/new'
            text='New code +'
            btnType='greenReg'
          />
        </div>
        <p className={`${styles.subcopy} ${own.subcopy}`}>
          Codes customers can enter in the booking tool. You set the discount,
          the dates it works, and how many times it can be used. It comes off
          the ride price only, never fees, taxes or tips.
        </p>
      </header>

      {codes.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyTitle}>No codes yet</div>
          <p className='miniNote'>Create one with “New code +”.</p>
        </div>
      ) : (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.theadRow}>
                <th className={styles.th}>Code</th>
                <th className={styles.th}>Discount</th>
                <th className={styles.th}>Booking dates</th>
                <th className={styles.th}>Ride dates</th>
                <th className={`${styles.th} ${styles.num}`}>Uses</th>
                <th className={`${styles.th} ${styles.num}`}>Discount given</th>
                <th className={styles.th}>Status</th>
                <th
                  className={`${styles.th} ${styles.num}`}
                  aria-label='Details'
                />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const s = STATUS_BADGE[c.status];
                return (
                  <tr key={c.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={own.codeName}>{c.code}</div>
                      <div className='miniNote'>
                        {c.name}
                        {c.partner ? ` · ${c.partner}` : ""}
                      </div>
                    </td>
                    <td className={styles.td}>{describeDiscount(c)}</td>
                    <td className={styles.td}>
                      {range(c.bookFrom, c.bookUntil, timezone)}
                    </td>
                    <td className={styles.td}>
                      {range(c.rideFrom, c.rideUntil, timezone)}
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      {c.maxUses != null ? `${c.uses} / ${c.maxUses}` : c.uses}
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      {money(c.givenCents)}
                    </td>
                    <td className={styles.td}>
                      <Tip text={s.tip}>
                        <span className={`badge ${s.cls}`}>{s.label}</span>
                      </Tip>
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      <Button
                        href={`/admin/discount-codes/${c.id}`}
                        text='More Details'
                        btnType='blackReg'
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
