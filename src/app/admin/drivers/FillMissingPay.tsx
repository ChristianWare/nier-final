"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import ReportModal from "@/components/admin/ReportModal/ReportModal";
import { fillMissingDriverPay } from "../../../../actions/admin/drivers";
import styles from "./AdminDriversPage.module.css";

export type MissingPayRow = {
  bookingId: string;
  pickupLabel: string;
  driverName: string;
  priceCents: number;
  payPercent: number | null;
  /** Pay that will be filled in; null when the driver has no rate. */
  newPayCents: number | null;
};

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

export default function FillMissingPay({ rows }: { rows: MissingPayRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fillable = rows.filter((r) => r.newPayCents != null);
  const noRate = rows.length - fillable.length;
  const total = fillable.reduce((sum, r) => sum + (r.newPayCents ?? 0), 0);

  function apply() {
    startTransition(async () => {
      const res = await fillMissingDriverPay(fillable.map((r) => r.bookingId));
      if ("error" in res) {
        setMessage(res.error ?? "Something went wrong.");
        return;
      }
      setMessage(
        `Filled in pay on ${res.payFilled} ${res.payFilled === 1 ? "ride" : "rides"}.`,
      );
      router.refresh();
    });
  }

  return (
    <>
      <button
        type='button'
        className='rangeSubmitBtn'
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
        disabled={rows.length === 0}
      >
        Fill in missing pay
      </button>

      {open ? (
        <ReportModal
          title='Fill in missing pay'
          onClose={() => setOpen(false)}
          footer={
            <>
              {message ? <span className='miniNote'>{message}</span> : null}
              <button
                type='button'
                className='tab'
                onClick={() => setOpen(false)}
              >
                Close
              </button>
              <button
                type='button'
                className='rangeSubmitBtn'
                onClick={apply}
                disabled={isPending || fillable.length === 0 || !!message}
              >
                {isPending
                  ? "Filling in…"
                  : `Fill in ${fillable.length} ${fillable.length === 1 ? "ride" : "rides"}`}
              </button>
            </>
          }
        >
          <p className='miniNote'>
            Each driver&apos;s rate is applied to the ride&apos;s full price
            (fees and taxes included). Tips go to the driver in full. Pay
            already entered on a ride is never changed.
          </p>
          {noRate > 0 ? (
            <p className={`miniNote ${styles.warnNote}`}>
              {noRate} {noRate === 1 ? "ride is" : "rides are"} skipped because
              the driver has no pay rate yet. Set it on the driver&apos;s page.
            </p>
          ) : null}
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadRow}>
                  <th className={styles.th}>Ride</th>
                  <th className={styles.th}>Driver</th>
                  <th className={`${styles.th} ${styles.num}`}>Price</th>
                  <th className={`${styles.th} ${styles.num}`}>Rate</th>
                  <th className={`${styles.th} ${styles.num}`}>
                    Pay to fill in
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.bookingId} className={styles.tr}>
                    <td className={styles.td}>{r.pickupLabel}</td>
                    <td className={styles.td}>{r.driverName}</td>
                    <td className={`${styles.td} ${styles.num}`}>
                      {money(r.priceCents)}
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      {r.payPercent == null ? "Not set" : `${r.payPercent}%`}
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      {r.newPayCents == null ? "—" : money(r.newPayCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {fillable.length > 0 ? (
                <tfoot>
                  <tr className={styles.tr}>
                    <td className={styles.td} colSpan={4}>
                      <strong>Total</strong>
                    </td>
                    <td className={`${styles.td} ${styles.num}`}>
                      <strong>{money(total)}</strong>
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </ReportModal>
      ) : null}
    </>
  );
}
