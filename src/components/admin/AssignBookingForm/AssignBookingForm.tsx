"use client";

import styles from "./AssignBookingForm.module.css";
import { useTransition, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { assignBooking } from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";

function centsToDollars(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function dollarsToCents(dollars: string): number | null {
  const cleaned = dollars.trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

export default function AssignBookingForm({
  bookingId,
  drivers,
  vehicleUnits,
  currentDriverId,
  currentVehicleUnitId,
  currentDriverPaymentCents,
}: {
  bookingId: string;
  drivers: { id: string; name: string | null; email: string }[];
  vehicleUnits: { id: string; name: string; plate: string | null }[];
  currentDriverId?: string | null;
  currentVehicleUnitId?: string | null;
  currentDriverPaymentCents?: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [driverPayment, setDriverPayment] = useState<string>(
    centsToDollars(currentDriverPaymentCents),
  );

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("bookingId", bookingId);

        // Convert driver payment to cents
        const paymentCents = dollarsToCents(driverPayment);
        if (paymentCents !== null) {
          fd.set("driverPaymentCents", String(paymentCents));
        }

        startTransition(() => {
          assignBooking(fd).then((res) => {
            if (res?.error) return toast.error(res.error);
            toast.success("Assignment saved");
            router.refresh();
          });
        });
      }}
    >
      <div className={styles.group}>
        <label className='emptyTitle'>Driver</label>
        <select
          name='driverId'
          defaultValue={currentDriverId ?? ""}
          disabled={isPending}
          className={styles.select}
        >
          <option value='' disabled>
            Select driver
          </option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name ?? "Driver"} — {d.email}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.groupTight}>
        <label className='emptyTitle'>Vehicle unit (optional)</label>
        <select
          name='vehicleUnitId'
          defaultValue={currentVehicleUnitId ?? ""}
          disabled={isPending}
          className={styles.select}
        >
          <option value=''>Unassigned</option>
          {vehicleUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.plate ? ` (${u.plate})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* ✅ NEW: Driver payment amount */}
      <div className={styles.group}>
        <label className='emptyTitle'>Driver payment (optional)</label>
        <div className={styles.inputWrapper}>
          <span className={styles.dollarSign}>$</span>
          <input
            type='number'
            step='0.01'
            min='0'
            placeholder='0.00'
            value={driverPayment}
            onChange={(e) => setDriverPayment(e.target.value)}
            disabled={isPending}
            className={styles.input}
          />
        </div>
        <div className='miniNote' style={{ marginTop: 4 }}>
          Amount the driver will be paid for this trip
        </div>
      </div>

      <div className={styles.btnContainer}>
        {/* <button disabled={isPending} className='primaryBtn' type='submit'>
          {isPending ? "Saving..." : "Assign + Pay Driver"}
        </button> */}
        <Button
          disabled={isPending}
          type='submit'
          text={isPending ? "Saving..." : "Assign + Pay Driver"}
          btnType='black'
          arrow
        />
      </div>
    </form>
  );
}
