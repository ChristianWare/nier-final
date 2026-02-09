/* eslint-disable @typescript-eslint/no-unused-vars */
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

  const [showUnassignModal, setShowUnassignModal] = useState(false);

  // Validation error state
  const [errors, setErrors] = useState<{
    driver?: boolean;
    vehicle?: boolean;
  }>({});

  // Track selected driver for schedule preview
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
    currentDriverId ?? null,
  );
  const [selectedVehicleUnitId, setSelectedVehicleUnitId] = useState<
    string | null
  >(currentVehicleUnitId ?? null);

  // Check if there's a current assignment
  const hasAssignment = !!currentDriverId;

  // Get current driver name for the modal
  const currentDriver = drivers.find((d) => d.id === currentDriverId);
  const currentDriverName =
    currentDriver?.name ?? currentDriver?.email ?? "Driver";

  // Get selected driver name for schedule preview
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

  function formatMoney(cents: number, curr = "USD") {
    const n = cents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 2,
    }).format(n);
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
      setSelectedDriverId(null);
      setSelectedVehicleUnitId(null);
      router.refresh();
    });
  }

  return (
    <>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();

          // Validate required fields
          const newErrors: { driver?: boolean; vehicle?: boolean } = {};
          if (!selectedDriverId) newErrors.driver = true;
          if (!selectedVehicleUnitId) newErrors.vehicle = true;

          if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please select both a driver and vehicle unit.");
            return;
          }
          setErrors({});

          const fd = new FormData(e.currentTarget);
          fd.set("bookingId", bookingId);

          // Pass through existing driver payment if present (preserve it)
          if (currentDriverPaymentCents != null) {
            fd.set("driverPaymentCents", String(currentDriverPaymentCents));
          }
          if (currentDriverTipCents != null) {
            fd.set("driverTipCents", String(currentDriverTipCents));
          }

          startTransition(() => {
            assignBooking(fd).then((res) => {
              if (res?.error) return toast.error(res.error);
              toast.success("Driver & vehicle assigned");
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
            className={`${styles.select} ${errors.driver ? styles.selectError : ""}`}
            onChange={(e) => {
              setSelectedDriverId(e.target.value || null);
              setErrors((prev) => ({ ...prev, driver: false }));
            }}
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
          {errors.driver && (
            <span className={styles.errorText}>Driver is required</span>
          )}
        </div>

        {/* Driver Schedule Preview */}
        <DriverSchedulePreview
          driverId={selectedDriverId}
          driverName={selectedDriverName}
          targetPickupAt={pickupAt}
          currentBookingId={bookingId}
        />

        <div className={styles.groupTight}>
          <label className='emptyTitle'>Vehicle unit</label>
          <select
            name='vehicleUnitId'
            defaultValue={currentVehicleUnitId ?? ""}
            disabled={isPending}
            className={`${styles.select} ${errors.vehicle ? styles.selectError : ""}`}
            onChange={(e) => {
              setSelectedVehicleUnitId(e.target.value || null);
              setErrors((prev) => ({ ...prev, vehicle: false }));
            }}
          >
            <option value='' disabled>
              Select vehicle
            </option>
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
          {errors.vehicle && (
            <span className={styles.errorText}>Vehicle unit is required</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.btnContainer}>
          <Button
            disabled={isPending}
            type='submit'
            text={isPending ? "Saving..." : "Assign Driver & Vehicle"}
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
