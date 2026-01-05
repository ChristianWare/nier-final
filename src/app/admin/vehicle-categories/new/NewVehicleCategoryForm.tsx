"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { createVehicleCategory } from "../../../../../actions/admin/vehicleCategories";

export default function NewVehicleCategoryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);

        startTransition(() => {
          void (async () => {
            const res = await createVehicleCategory(fd);

            if ((res as any)?.error) {
              toast.error((res as any).error);
              return;
            }

            toast.success("Vehicle category added");
            router.push("/admin/vehicle-categories");
            router.refresh();
          })();
        });
      }}
      style={{ display: "grid", gap: 10 }}
    >
      <Grid2>
        <Field label='Name' name='name' defaultValue='' disabled={isPending} />
        <Field
          label='Image URL (optional)'
          name='imageUrl'
          defaultValue=''
          disabled={isPending}
        />
      </Grid2>

      <Field
        label='Description (optional)'
        name='description'
        defaultValue=''
        disabled={isPending}
      />

      <Grid3>
        <Field
          label='Capacity (pax)'
          name='capacity'
          defaultValue='7'
          disabled={isPending}
        />
        <Field
          label='Luggage capacity'
          name='luggageCapacity'
          defaultValue='6'
          disabled={isPending}
        />
        <Field
          label='Sort order'
          name='sortOrder'
          defaultValue='0'
          disabled={isPending}
        />
      </Grid3>

      {/* ✅ NEW */}
      <Field
        label='Min hours (HOURLY)'
        name='minHours'
        defaultValue='0'
        disabled={isPending}
      />

      <h3 style={{ margin: "10px 0 0", fontSize: 14, opacity: 0.85 }}>
        Pricing (cents)
      </h3>

      <Grid2>
        <Field
          label='Base fare'
          name='baseFareCents'
          defaultValue='0'
          disabled={isPending}
        />
        <Field
          label='Per mile'
          name='perMileCents'
          defaultValue='0'
          disabled={isPending}
        />
        <Field
          label='Per minute'
          name='perMinuteCents'
          defaultValue='0'
          disabled={isPending}
        />
        <Field
          label='Per hour'
          name='perHourCents'
          defaultValue='0'
          disabled={isPending}
        />
      </Grid2>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type='checkbox'
          name='active'
          defaultChecked
          disabled={isPending}
        />
        Active
      </label>

      <button type='submit' style={btnStyle} disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.2)",
  cursor: "pointer",
  justifySelf: "start",
};

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {children}
    </div>
  );
}
function Grid3({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, opacity: 0.8 }}>{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        style={{
          padding: "0.75rem",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
}
