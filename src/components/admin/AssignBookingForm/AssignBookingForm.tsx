"use client";

import styles from "./AssignBookingForm.module.css";
import { useTransition, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { assignBooking } from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";

function formatMoney(cents: number, currency = "USD") {
  const n = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

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
  bookingTotalCents,
  currency = "USD",
}: {
  bookingId: string;
  drivers: { id: string; name: string | null; email: string }[];
  vehicleUnits: { id: string; name: string; plate: string | null }[];
  currentDriverId?: string | null;
  currentVehicleUnitId?: string | null;
  currentDriverPaymentCents?: number | null;
  bookingTotalCents: number;
  currency?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [driverPayment, setDriverPayment] = useState<string>(
    centsToDollars(currentDriverPaymentCents),
  );

  // Parse current input to cents for comparison
  const currentPaymentCents = dollarsToCents(driverPayment) ?? 0;

  // Calculate percentage amounts
  const percentageOptions = [
    { label: "10%", percent: 0.1 },
    { label: "20%", percent: 0.2 },
    { label: "30%", percent: 0.3 },
    { label: "50%", percent: 0.5 },
    { label: "70%", percent: 0.7 },
  ];

  const percentageAmounts = percentageOptions.map(({ label, percent }) => ({
    label,
    cents: Math.round(bookingTotalCents * percent),
  }));

  function setAmountFromCents(cents: number) {
    setDriverPayment((cents / 100).toFixed(2));
  }

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

      {/* ✅ Driver payment with percentage options - matching RefundButton layout */}

      <div className={styles.driverPaymentSection}>
        {/* Booking total reference - spans full width */}

        {/* Input section - left column */}
        <div className={styles.inputSection}>
          <label className='emptyTitle'>Driver Payment</label>
          <div className={styles.inputWrapper}>
            <span className={styles.dollarSign}>$</span>
            <input
              type='text'
              inputMode='decimal'
              placeholder='0.00'
              value={driverPayment}
              onChange={(e) => {
                // Allow only numbers and decimal
                const val = e.target.value.replace(/[^0-9.]/g, "");
                setDriverPayment(val);
              }}
              disabled={isPending}
              className='inputBorder'
            />
          </div>
          <span className='miniNote'>
            Amount the driver will be paid for this trip
          </span>
        </div>

        {/* Percentage quick buttons - right column */}
        {bookingTotalCents > 0 && (
          <div className={styles.percentageSection}>
            {bookingTotalCents > 0 && (
              <div className='subheading'>
                Booking total:{" "}
                <strong>{formatMoney(bookingTotalCents, currency)}</strong>
              </div>
            )}
            <br />
            <label className='emptyTitle'>Quick Select</label>
            <div className={styles.percentageButtons}>
              {percentageAmounts.map(({ label, cents }) => (
                <button
                  key={label}
                  type='button'
                  className={`${styles.percentBtn} ${
                    currentPaymentCents === cents ? styles.percentBtnActive : ""
                  }`}
                  onClick={() => setAmountFromCents(cents)}
                  disabled={isPending || cents === 0}
                >
                  {label}
                  <span className={styles.percentAmount}>
                    {formatMoney(cents, currency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.btnContainer}>
        <Button
          disabled={isPending}
          type='submit'
          text={isPending ? "Saving..." : "Assign + Pay Driver"}
          btnType='blackReg'
        />
      </div>
    </form>
  );
}
