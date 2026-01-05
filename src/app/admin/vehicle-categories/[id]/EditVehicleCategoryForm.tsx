"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { updateVehicleCategory } from "../../../../../actions/admin/vehicleCategories";

type Category = {
  id: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  capacity: number;
  luggageCapacity: number;
  sortOrder: number;
  minHours: number;
  baseFareCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  active: boolean;
};

export default function EditVehicleCategoryForm({
  category,
}: {
  category: Category;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);

        startTransition(() => {
          void (async () => {
            const res = await updateVehicleCategory(category.id, fd);

            if ((res as any)?.error) {
              toast.error((res as any).error);
              return;
            }

            toast.success("Vehicle category updated");
            router.push("/admin/vehicle-categories");
            router.refresh();
          })();
        });
      }}
      style={{ display: "grid", gap: 10 }}
    >
      <Grid2>
        <Field
          label='Name'
          name='name'
          defaultValue={category.name}
          disabled={isPending}
        />
        <Field
          label='Image URL (optional)'
          name='imageUrl'
          defaultValue={category.imageUrl ?? ""}
          disabled={isPending}
        />
      </Grid2>

      <Field
        label='Description (optional)'
        name='description'
        defaultValue={category.description ?? ""}
        disabled={isPending}
      />

      <Grid3>
        <Field
          label='Capacity (pax)'
          name='capacity'
          defaultValue={String(category.capacity)}
          disabled={isPending}
        />
        <Field
          label='Luggage capacity'
          name='luggageCapacity'
          defaultValue={String(category.luggageCapacity)}
          disabled={isPending}
        />
        <Field
          label='Sort order'
          name='sortOrder'
          defaultValue={String(category.sortOrder)}
          disabled={isPending}
        />
      </Grid3>

      <Field
        label='Min hours (HOURLY)'
        name='minHours'
        defaultValue={String(category.minHours ?? 0)}
        disabled={isPending}
      />

      <h3 style={{ margin: "10px 0 0", fontSize: 14, opacity: 0.85 }}>
        Pricing (cents)
      </h3>

      <Grid2>
        <Field
          label='Base fare'
          name='baseFareCents'
          defaultValue={String(category.baseFareCents)}
          disabled={isPending}
        />
        <Field
          label='Per mile'
          name='perMileCents'
          defaultValue={String(category.perMileCents)}
          disabled={isPending}
        />
        <Field
          label='Per minute'
          name='perMinuteCents'
          defaultValue={String(category.perMinuteCents)}
          disabled={isPending}
        />
        <Field
          label='Per hour'
          name='perHourCents'
          defaultValue={String(category.perHourCents)}
          disabled={isPending}
        />
      </Grid2>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type='checkbox'
          name='active'
          defaultChecked={category.active}
          disabled={isPending}
        />
        Active
      </label>

      <button type='submit' style={btnStyle} disabled={isPending}>
        {isPending ? "Saving..." : "Save changes"}
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
