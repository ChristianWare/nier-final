"use client";

import styles from "./AssignBookingForm.module.css";
import { useTransition, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  assignBooking,
  unassignBooking,
} from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import DriverSchedulePreview from "../DriverSchedulePreview/DriverSchedulePreview";

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

type TipDistribution = "full" | "custom" | "none";

export default function AssignBookingForm({
  bookingId,
  drivers,
  vehicleUnits,
  currentDriverId,
  currentVehicleUnitId,
  currentDriverPaymentCents,
  currentDriverTipCents,
  bookingTotalCents,
  currency = "USD",
  tipCents = 0,
  pickupAt,
}: {
  bookingId: string;
  drivers: {
    id: string;
    name: string | null;
    email: string;
    rideCount: number;
    monthLabel: string;
  }[];
  vehicleUnits: {
    id: string;
    name: string;
    plate: string | null;
    categoryName: string | null;
    isMatchingCategory: boolean;
  }[];
  currentDriverId?: string | null;
  currentVehicleUnitId?: string | null;
  currentDriverPaymentCents?: number | null;
  currentDriverTipCents?: number | null;
  bookingTotalCents: number;
  currency?: string;
  tipCents?: number;
  pickupAt: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [driverPayment, setDriverPayment] = useState<string>(
    centsToDollars(currentDriverPaymentCents),
  );
  const [showUnassignModal, setShowUnassignModal] = useState(false);

  // ✅ NEW: Tip distribution state
  const getInitialTipDistribution = (): TipDistribution => {
    if (currentDriverTipCents === null || currentDriverTipCents === undefined) {
      return "full"; // Default to full tip
    }
    if (currentDriverTipCents === 0) return "none";
    if (currentDriverTipCents === tipCents) return "full";
    return "custom";
  };

  const [tipDistribution, setTipDistribution] = useState<TipDistribution>(
    getInitialTipDistribution(),
  );
  const [customTipAmount, setCustomTipAmount] = useState<string>(
    currentDriverTipCents &&
      currentDriverTipCents !== tipCents &&
      currentDriverTipCents !== 0
      ? centsToDollars(currentDriverTipCents)
      : "",
  );

  // ✅ NEW: Track selected driver for schedule preview
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
    currentDriverId ?? null,
  );

  // Check if there's a current assignment
  const hasAssignment = !!currentDriverId;

  // Get current driver name for the modal
  const currentDriver = drivers.find((d) => d.id === currentDriverId);
  const currentDriverName =
    currentDriver?.name ?? currentDriver?.email ?? "Driver";

  // ✅ Get selected driver name for schedule preview
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
  const selectedDriverName =
    selectedDriver?.name ?? selectedDriver?.email ?? "Driver";

  // Get current vehicle name for the modal
  const currentVehicle = vehicleUnits.find(
    (v) => v.id === currentVehicleUnitId,
  );
  const currentVehicleName = currentVehicle
    ? `${currentVehicle.name}${currentVehicle.plate ? ` (${currentVehicle.plate})` : ""}`
    : null;

  // Parse current input to cents for comparison
  const currentPaymentCents = dollarsToCents(driverPayment) ?? 0;

  // ✅ Calculate actual driver tip based on distribution selection
  const getDriverTipCents = (): number => {
    if (tipCents === 0) return 0;
    switch (tipDistribution) {
      case "full":
        return tipCents;
      case "none":
        return 0;
      case "custom":
        const customCents = dollarsToCents(customTipAmount);
        // Cap at the actual tip amount
        return Math.min(customCents ?? 0, tipCents);
      default:
        return tipCents;
    }
  };

  const driverTipCents = getDriverTipCents();

  // Calculate total driver earnings (payment + tip)
  const totalDriverEarnings = currentPaymentCents + driverTipCents;

  // Calculate percentage amounts (based on booking total, excluding tips)
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

  function handleUnassign() {
    const fd = new FormData();
    fd.set("bookingId", bookingId);

    startTransition(async () => {
      const res = await unassignBooking(fd);
      if (res?.error) {
        toast.error(res.error);
        setShowUnassignModal(false);
        return;
      }
      toast.success("Driver unassigned successfully");
      setShowUnassignModal(false);
      setDriverPayment(""); // Clear the payment field
      setSelectedDriverId(null); // Clear selected driver
      setTipDistribution("full"); // Reset tip distribution
      setCustomTipAmount(""); // Clear custom tip
      router.refresh();
    });
  }

  return (
    <>
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

          // ✅ Add driver tip cents
          fd.set("driverTipCents", String(driverTipCents));

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
            onChange={(e) => setSelectedDriverId(e.target.value || null)}
          >
            <option value='' disabled>
              Select driver
            </option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name ?? "Driver"} ({d.rideCount}{" "}
                {d.rideCount === 1 ? "Ride" : "Rides"} in {d.monthLabel})
              </option>
            ))}
          </select>
        </div>

        {/* ✅ NEW: Driver Schedule Preview */}
        <DriverSchedulePreview
          driverId={selectedDriverId}
          driverName={selectedDriverName}
          targetPickupAt={pickupAt}
          currentBookingId={bookingId}
        />

        <div className={styles.groupTight}>
          <label className='emptyTitle'>Vehicle unit (optional)</label>
          <select
            name='vehicleUnitId'
            defaultValue={currentVehicleUnitId ?? ""}
            disabled={isPending}
            className={styles.select}
          >
            <option value=''>Unassigned</option>
            {vehicleUnits.some((u) => u.isMatchingCategory) && (
              <optgroup label='Matching Category'>
                {vehicleUnits
                  .filter((u) => u.isMatchingCategory)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.plate ? ` (${u.plate})` : ""}
                    </option>
                  ))}
              </optgroup>
            )}
            {vehicleUnits.some((u) => !u.isMatchingCategory) && (
              <optgroup
                label={
                  vehicleUnits.some((u) => u.isMatchingCategory)
                    ? "Other Vehicles"
                    : "All Vehicles"
                }
              >
                {vehicleUnits
                  .filter((u) => !u.isMatchingCategory)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.plate ? ` (${u.plate})` : ""}
                      {u.categoryName ? ` — ${u.categoryName}` : ""}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Driver payment with percentage options */}
        <div className={styles.driverPaymentSection}>
          {/* Input section - left column */}
          <div className={styles.inputSection}>
            <label className='emptyTitle'>Driver Payment (from company)</label>
            <div className={styles.inputWrapper}>
              <span className={styles.dollarSign}>$</span>
              <input
                type='text'
                inputMode='decimal'
                placeholder='0.00'
                value={driverPayment}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setDriverPayment(val);
                }}
                disabled={isPending}
                className='inputBorder'
              />
            </div>
            <span className='miniNote'>
              Amount the company pays the driver for this trip
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
                      currentPaymentCents === cents
                        ? styles.percentBtnActive
                        : ""
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

        {/* ✅ NEW: Tip Distribution Section - Only show if there's a customer tip */}
        {tipCents > 0 && (
          <div className={styles.tipDistributionSection}>
            <div className={styles.tipDistributionHeader}>
              <span className={styles.tipDistributionIcon}>💰</span>
              <div>
                <label className='emptyTitle'>Customer Tip Distribution</label>
                <span className='miniNote' style={{ marginLeft: "1rem" }}>
                  Customer tipped {formatMoney(tipCents, currency)} during
                  checkout
                </span>
              </div>
            </div>

            <div className={styles.tipDistributionOptions}>
              {/* Full tip option */}
              <label
                className={`${styles.tipOption} ${tipDistribution === "full" ? styles.tipOptionActive : ""}`}
              >
                <input
                  type='radio'
                  name='tipDistribution'
                  value='full'
                  checked={tipDistribution === "full"}
                  onChange={() => setTipDistribution("full")}
                  disabled={isPending}
                  className={styles.tipRadio}
                />
                <div className={styles.tipOptionContent}>
                  <span className={styles.tipOptionLabel}>Full Tip</span>
                  <span className={styles.tipOptionAmount}>
                    {formatMoney(tipCents, currency)}
                  </span>
                  <span className={styles.tipOptionDesc}>
                    Driver receives the entire tip
                  </span>
                </div>
              </label>

              {/* Custom amount option */}
              <label
                className={`${styles.tipOption} ${tipDistribution === "custom" ? styles.tipOptionActive : ""}`}
              >
                <input
                  type='radio'
                  name='tipDistribution'
                  value='custom'
                  checked={tipDistribution === "custom"}
                  onChange={() => setTipDistribution("custom")}
                  disabled={isPending}
                  className={styles.tipRadio}
                />
                <div className={styles.tipOptionContent}>
                  <span className={styles.tipOptionLabel}>Custom Amount</span>
                  {tipDistribution === "custom" && (
                    <div className={styles.customTipInput}>
                      <span className={styles.dollarSign}>$</span>
                      <input
                        type='text'
                        inputMode='decimal'
                        placeholder='0.00'
                        value={customTipAmount}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          setCustomTipAmount(val);
                        }}
                        disabled={isPending}
                        className='inputBorder'
                        style={{ width: "100px" }}
                      />
                      <span className={styles.tipMaxNote}>
                        max {formatMoney(tipCents, currency)}
                      </span>
                    </div>
                  )}
                  <span className={styles.tipOptionDesc}>
                    Specify how much of the tip goes to driver
                  </span>
                </div>
              </label>

              {/* No tip option */}
              <label
                className={`${styles.tipOption} ${tipDistribution === "none" ? styles.tipOptionActive : ""}`}
              >
                <input
                  type='radio'
                  name='tipDistribution'
                  value='none'
                  checked={tipDistribution === "none"}
                  onChange={() => setTipDistribution("none")}
                  disabled={isPending}
                  className={styles.tipRadio}
                />
                <div className={styles.tipOptionContent}>
                  <span className={styles.tipOptionLabel}>
                    No Tip to Driver
                  </span>
                  <span className={styles.tipOptionAmount}>$0.00</span>
                  <span className={styles.tipOptionDesc}>
                    Company retains the full tip
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Driver Earnings Summary Card */}
        <div className={styles.driverEarningsCard}>
          <div className={styles.earningsHeader}>
            <span className={styles.earningsIcon}>💵</span>
            <span className={styles.earningsTitle}>
              Driver Earnings Summary
            </span>
          </div>

          <div className={styles.earningsBreakdown}>
            {/* Company Payment Row */}
            <div className={styles.earningsRow}>
              <span className={styles.earningsLabel}>Company Payment</span>
              <span className={styles.earningsValue}>
                {currentPaymentCents > 0
                  ? formatMoney(currentPaymentCents, currency)
                  : "—"}
              </span>
            </div>

            {/* Customer Tip Row - Updated to show actual driver tip */}
            <div className={styles.earningsRow}>
              <span className={styles.earningsLabel}>
                Driver Tip
                {tipCents > 0 && driverTipCents < tipCents && (
                  <span className={styles.tipBadgeReduced}>
                    {driverTipCents === 0 ? "Not included" : "Partial"}
                  </span>
                )}
                {tipCents > 0 && driverTipCents === tipCents && (
                  <span className={styles.tipBadge}>Full tip</span>
                )}
              </span>
              <span
                className={`${styles.earningsValue} ${driverTipCents > 0 ? styles.tipValue : ""}`}
              >
                {driverTipCents > 0
                  ? formatMoney(driverTipCents, currency)
                  : "—"}
              </span>
            </div>

            {/* Show company retained tip if applicable */}
            {tipCents > 0 && driverTipCents < tipCents && (
              <div
                className={`${styles.earningsRow} ${styles.earningsRowMuted}`}
              >
                <span className={styles.earningsLabel}>Company Retains</span>
                <span className={styles.earningsValue}>
                  {formatMoney(tipCents - driverTipCents, currency)}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className={styles.earningsDivider} />

            {/* Total Row */}
            <div className={`${styles.earningsRow} ${styles.earningsTotalRow}`}>
              <span className={styles.earningsTotalLabel}>
                Total Driver Earnings
              </span>
              <span className={styles.earningsTotalValue}>
                {totalDriverEarnings > 0
                  ? formatMoney(totalDriverEarnings, currency)
                  : "—"}
              </span>
            </div>
          </div>

          {/* Updated tip notes */}
          {tipCents > 0 && driverTipCents === tipCents && (
            <div className={styles.tipNote}>
              💡 The driver will receive the full{" "}
              {formatMoney(tipCents, currency)} tip from the customer.
            </div>
          )}

          {tipCents > 0 && driverTipCents > 0 && driverTipCents < tipCents && (
            <div className={styles.tipNotePartial}>
              ℹ️ The driver will receive {formatMoney(driverTipCents, currency)}{" "}
              of the {formatMoney(tipCents, currency)} customer tip. The company
              retains {formatMoney(tipCents - driverTipCents, currency)}.
            </div>
          )}

          {tipCents > 0 && driverTipCents === 0 && (
            <div className={styles.tipNoteNone}>
              ⚠️ The driver will not receive any of the{" "}
              {formatMoney(tipCents, currency)} customer tip. The company
              retains the full amount.
            </div>
          )}

          {tipCents === 0 && (
            <div className={styles.noTipNote}>
              No customer tip was added during checkout.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.btnContainer}>
          <Button
            disabled={isPending}
            type='submit'
            text={isPending ? "Saving..." : "Assign + Save Driver Payment"}
            btnType='blackReg'
          />

          {/* Unassign Button - only show if there's a current assignment */}
          {hasAssignment && (
            <Button
              disabled={isPending}
              type='button'
              text='Unassign Driver'
              btnType='grayReg'
              onClick={() => setShowUnassignModal(true)}
            />
          )}
        </div>
      </form>

      {/* Unassign Confirmation Modal */}
      <Modal
        isOpen={showUnassignModal}
        onClose={() => setShowUnassignModal(false)}
      >
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Unassign Driver?</div>

          <p className='paragraph'>
            You are about to <strong>remove the driver assignment</strong> from
            this booking.
          </p>

          {/* Current Assignment Info */}
          <div className={styles.currentAssignmentBox}>
            <div className={styles.assignmentRow}>
              <span className={styles.assignmentLabel}>Driver:</span>
              <span className={styles.assignmentValue}>
                {currentDriverName}
              </span>
            </div>
            {currentVehicleName && (
              <div className={styles.assignmentRow}>
                <span className={styles.assignmentLabel}>Vehicle:</span>
                <span className={styles.assignmentValue}>
                  {currentVehicleName}
                </span>
              </div>
            )}
            {currentDriverPaymentCents && currentDriverPaymentCents > 0 && (
              <div className={styles.assignmentRow}>
                <span className={styles.assignmentLabel}>Driver Payment:</span>
                <span className={styles.assignmentValue}>
                  {formatMoney(currentDriverPaymentCents, currency)}
                </span>
              </div>
            )}
          </div>

          <div className={styles.warningBox}>
            <strong>⚠️ Please note:</strong>
            <ul className={styles.warningList}>
              <li>
                The driver will no longer see this trip in their dashboard
              </li>
              <li>You can assign a different driver afterwards</li>
              <li>The booking status will be updated accordingly</li>
            </ul>
          </div>

          <div className={styles.modalActions}>
            <Button
              type='button'
              text='Cancel'
              btnType='grayReg'
              onClick={() => setShowUnassignModal(false)}
              disabled={isPending}
            />
            <Button
              type='button'
              text={isPending ? "Removing..." : "Yes, Unassign Driver"}
              btnType='redReg'
              onClick={handleUnassign}
              disabled={isPending}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
