/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./EditVehicleCategoryPage.module.css";
import { useRouter } from "next/navigation";
import React, { useTransition } from "react";
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
      className={styles.form}
    >
      <Grid2>
        <Field label='Name'>
          <input
            name='name'
            defaultValue={category.name}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        {/* <Field label='Image URL (optional)'>
          <input
            name='imageUrl'
            defaultValue={category.imageUrl ?? ""}
            className='inputBorder'
            disabled={isPending}
          />
        </Field> */}
      </Grid2>

      {/* <Field label='Description (optional)'>
        <input
          name='description'
          defaultValue={category.description ?? ""}
          className='inputBorder'
          disabled={isPending}
        />
      </Field> */}

      <Grid3>
        <Field label='Capacity (pax)'>
          <input
            name='capacity'
            defaultValue={String(category.capacity)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Luggage capacity'>
          <input
            name='luggageCapacity'
            defaultValue={String(category.luggageCapacity)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Sort order'>
          <input
            name='sortOrder'
            defaultValue={String(category.sortOrder)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>
      </Grid3>

      <Field label='Min hours (HOURLY)'>
        <input
          name='minHours'
          defaultValue={String(category.minHours ?? 0)}
          className='inputBorder'
          disabled={isPending}
        />
      </Field>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Pricing (cents)</label>
        <div className='miniNote' style={{ marginTop: -2 }}>
          Enter values in cents (example: 15000 = $150.00).
        </div>
      </div>

      <Grid2>
        <Field label='Base fare'>
          <input
            name='baseFareCents'
            defaultValue={String(category.baseFareCents)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Per mile'>
          <input
            name='perMileCents'
            defaultValue={String(category.perMileCents)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Per minute'>
          <input
            name='perMinuteCents'
            defaultValue={String(category.perMinuteCents)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Per hour'>
          <input
            name='perHourCents'
            defaultValue={String(category.perHourCents)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>
      </Grid2>

      <label className={styles.labelinputcheckbox}>
        <input
          type='checkbox'
          name='active'
          defaultChecked={category.active}
          disabled={isPending}
          className={styles.labelinputcheckbox}
        />
        <span className='emptyTitle'>Active</span>
      </label>

      <div className={styles.btnContainer}>
        <button type='submit' className='primaryBtn' disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid2}>{children}</div>;
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid3}>{children}</div>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label className='cardTitle h5'>{label}</label>
      {children}
      {hint ? <div className='miniNote'>{hint}</div> : null}
    </div>
  );
}
