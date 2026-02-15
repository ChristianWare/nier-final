/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import styles from "./AssignBookingForm.module.css";
import { useTransition, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  assignBooking,
  unassignBooking,
} from "../../../../actions/admin/bookings";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import DriverSchedulePreview from "../DriverSchedulePreview/DriverSchedulePreview";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

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
  bookedVehicleCategoryName,
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
  bookedVehicleCategoryName?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  /* ── Lock / Unlock state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [showUnassignModal, setShowUnassignModal] = useState(false);

  const [errors, setErrors] = useState<{
    driver?: boolean;
    vehicle?: boolean;
  }>({});

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
    currentDriverId ?? null,
  );
  const [selectedVehicleUnitId, setSelectedVehicleUnitId] = useState<
    string | null
  >(currentVehicleUnitId ?? null);

  const [mismatchAcknowledged, setMismatchAcknowledged] = useState(false);

  const hasAssignment = !!currentDriverId;

  const currentDriver = drivers.find((d) => d.id === currentDriverId);
  const currentDriverName =
    currentDriver?.name ?? currentDriver?.email ?? "Driver";

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
  const selectedDriverName =
    selectedDriver?.name ?? selectedDriver?.email ?? "Driver";

  const currentVehicle = vehicleUnits.find(
    (v) => v.id === currentVehicleUnitId,
  );
  const currentVehicleName = currentVehicle
    ? `${currentVehicle.name}${currentVehicle.plate ? ` (${currentVehicle.plate})` : ""}`
    : null;

  /* ── Vehicle mismatch detection ── */
  const selectedVehicleUnit = vehicleUnits.find(
    (v) => v.id === selectedVehicleUnitId,
  );
  const isVehicleMismatch =
    !!selectedVehicleUnit && !selectedVehicleUnit.isMatchingCategory;

  const selectedVehicleDisplay = selectedVehicleUnit
    ? `${selectedVehicleUnit.name}${selectedVehicleUnit.plate ? ` (${selectedVehicleUnit.plate})` : ""}${selectedVehicleUnit.categoryName ? ` — ${selectedVehicleUnit.categoryName}` : ""}`
    : null;

  /* ── Helpers ── */
  const isLocked = !isEditing;
  const fieldsDisabled = isLocked || isPending;

  const wrapperClass = justSaved
    ? `${styles.form} ${styles.sectionSaved}`
    : isEditing
      ? `${styles.form} ${styles.sectionEditing}`
      : `${styles.form} ${styles.sectionLocked}`;

  function formatMoney(cents: number, curr = "USD") {
    const n = cents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 2,
    }).format(n);
  }

  const handleCancel = useCallback(() => {
    setSelectedDriverId(currentDriverId ?? null);
    setSelectedVehicleUnitId(currentVehicleUnitId ?? null);
    setMismatchAcknowledged(false);
    setErrors({});
    setIsEditing(false);
  }, [currentDriverId, currentVehicleUnitId]);

  function handleSave() {
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

    // Block save if vehicle mismatch isn't acknowledged
    if (isVehicleMismatch && !mismatchAcknowledged) {
      toast.error("Please confirm the vehicle mismatch before saving.");
      return;
    }

    const fd = new FormData();
    fd.set("bookingId", bookingId);
    fd.set("driverId", selectedDriverId!);
    fd.set("vehicleUnitId", selectedVehicleUnitId!);

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
        setMismatchAcknowledged(false);
        setJustSaved(true);
        setTimeout(() => {
          setJustSaved(false);
          setIsEditing(false);
        }, 2000);
        router.refresh();
      });
    });
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
      setMismatchAcknowledged(false);
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
        setIsEditing(false);
      }, 2000);
      router.refresh();
    });
  }

  const isDirty =
    isEditing &&
    ((selectedDriverId ?? "") !== (currentDriverId ?? "") ||
      (selectedVehicleUnitId ?? "") !== (currentVehicleUnitId ?? ""));

  useDirtyForm("driver-vehicle-assignment", isDirty, "assign-section");

  /* ── Section action buttons ── */
  const renderActions = () => {
    if (justSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            disabled={isPending}
            type='button'
            text={isPending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            onClick={handleSave}
          />
          {!isPending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handleCancel}
            />
          )}
          {hasAssignment && !isPending && (
            <Button
              disabled={isPending}
              type='button'
              text='Unassign Driver'
              btnType='grayReg'
              onClick={() => setShowUnassignModal(true)}
            />
          )}
        </div>
      );
    }

    return (
      <div className={styles.sectionActionsRow}>
        <Button
          text='Edit Assignment'
          btnType='blackReg'
          type='button'
          onClick={() => setIsEditing(true)}
        />
      </div>
    );
  };

  return (
    <>
      <div className={wrapperClass}>
        <div className={styles.group}>
          <label className='emptyTitle'>Driver</label>
          <select
            name='driverId'
            value={selectedDriverId ?? ""}
            disabled={fieldsDisabled}
            className={`${styles.select} ${errors.driver ? styles.selectError : ""} selectBorder emptySmall`}
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

        {/* Driver Schedule Preview — only show when editing */}
        {isEditing && (
          <DriverSchedulePreview
            driverId={selectedDriverId}
            driverName={selectedDriverName}
            targetPickupAt={pickupAt}
            currentBookingId={bookingId}
          />
        )}

        <div className={styles.groupTight}>
          <label className='emptyTitle'>Vehicle unit</label>
          <select
            name='vehicleUnitId'
            value={selectedVehicleUnitId ?? ""}
            disabled={fieldsDisabled}
            className={`${styles.select} ${errors.vehicle ? styles.selectError : ""} selectBorder emptySmall`}
            onChange={(e) => {
              setSelectedVehicleUnitId(e.target.value || null);
              setMismatchAcknowledged(false);
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

        {/* Vehicle Mismatch Warning */}
        {isVehicleMismatch && isEditing && (
          <div className={styles.mismatchWarning}>
            <div className={styles.mismatchHeader}>
              <span className={styles.mismatchIcon}>⚠️</span>
              <strong className={styles.mismatchTitle}>Vehicle Mismatch</strong>
            </div>
            <p className={styles.mismatchText}>
              This booking calls for{" "}
              <strong>
                {bookedVehicleCategoryName ?? "the booked category"}
              </strong>{" "}
              but you are assigning <strong>{selectedVehicleDisplay}</strong>.
            </p>
            <p className={styles.mismatchSubtext}>
              Only proceed if the requested vehicle category is unavailable or
              the customer has approved the change.
            </p>
            <label className={styles.mismatchCheckLabel}>
              <input
                type='checkbox'
                checked={mismatchAcknowledged}
                onChange={(e) => setMismatchAcknowledged(e.target.checked)}
                disabled={fieldsDisabled}
                className={styles.mismatchCheckbox}
              />
              <span>I confirm this vehicle substitution is intentional</span>
            </label>
          </div>
        )}

        {renderActions()}
      </div>

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
