"use client";

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
      style={{ display: "grid", gap: 10 }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 12, opacity: 0.8 }}>Driver</label>
        <select
          name='driverId'
          defaultValue={currentDriverId ?? ""}
          disabled={isPending}
          style={selectStyle}
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

      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ fontSize: 12, opacity: 0.8 }}>
          Vehicle unit (optional)
        </label>
        <select
          name='vehicleUnitId'
          defaultValue={currentVehicleUnitId ?? ""}
          disabled={isPending}
          style={selectStyle}
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

      <button disabled={isPending} style={btnStyle} type='submit'>
        {isPending ? "Saving..." : "Assign"}
      </button>
    </form>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "0.75rem",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
};

const btnStyle: React.CSSProperties = {
  padding: "0.85rem 1rem",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.2)",
  cursor: "pointer",
  justifySelf: "start",
};
