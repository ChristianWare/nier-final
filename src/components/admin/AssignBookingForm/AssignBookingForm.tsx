"use client";

import styles from "./AssignBookingForm.module.css";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { assignBooking } from "../../../../actions/admin/bookings";

export default function AssignBookingForm({
  bookingId,
  drivers,
  vehicleUnits,
  currentDriverId,
  currentVehicleUnitId,
}: {
  bookingId: string;
  drivers: { id: string; name: string | null; email: string }[];
  vehicleUnits: { id: string; name: string; plate: string | null }[];
  currentDriverId?: string | null;
  currentVehicleUnitId?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("bookingId", bookingId);

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
      <div className={styles.btnContainer}>
        <button disabled={isPending} className='primaryBtn' type='submit'>
          {isPending ? "Saving..." : "Assign"}
        </button>
      </div>
    </form>
  );
}
