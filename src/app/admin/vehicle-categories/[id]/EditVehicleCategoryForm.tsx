/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./EditVehicleCategoryPage.module.css";
import { useRouter } from "next/navigation";
import React, { useState, useMemo, useTransition } from "react";
import toast from "react-hot-toast";
import { updateVehicleCategory } from "../../../../../actions/admin/vehicleCategories";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

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

  // Controlled state for all fields
  const [name, setName] = useState(category.name);
  const [capacity, setCapacity] = useState(String(category.capacity));
  const [luggageCapacity, setLuggageCapacity] = useState(
    String(category.luggageCapacity),
  );
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [minHours, setMinHours] = useState(String(category.minHours ?? 0));
  const [baseFare, setBaseFare] = useState(
    (category.baseFareCents / 100).toFixed(2),
  );
  const [perMile, setPerMile] = useState(
    (category.perMileCents / 100).toFixed(2),
  );
  const [perMinute, setPerMinute] = useState(
    (category.perMinuteCents / 100).toFixed(2),
  );
  const [perHour, setPerHour] = useState(
    (category.perHourCents / 100).toFixed(2),
  );
  const [active, setActive] = useState(category.active);

  // Track which fields changed for the dirty form modal
  const changedFields = useMemo(() => {
    const fields: string[] = [];
    if (name !== category.name) fields.push("Name");
    if (capacity !== String(category.capacity)) fields.push("Capacity");
    if (luggageCapacity !== String(category.luggageCapacity))
      fields.push("Luggage Capacity");
    if (sortOrder !== String(category.sortOrder)) fields.push("Sort Order");
    if (minHours !== String(category.minHours ?? 0)) fields.push("Min Hours");
    if (baseFare !== (category.baseFareCents / 100).toFixed(2))
      fields.push("Base Fare");
    if (perMile !== (category.perMileCents / 100).toFixed(2))
      fields.push("Per Mile");
    if (perMinute !== (category.perMinuteCents / 100).toFixed(2))
      fields.push("Per Minute");
    if (perHour !== (category.perHourCents / 100).toFixed(2))
      fields.push("Per Hour");
    if (active !== category.active) fields.push("Active Status");
    return fields;
  }, [
    name,
    capacity,
    luggageCapacity,
    sortOrder,
    minHours,
    baseFare,
    perMile,
    perMinute,
    perHour,
    active,
    category,
  ]);

  useDirtyForm(
    "vehicle-category",
    changedFields.length > 0,
    "vehicle-category-form",
    changedFields,
  );

  return (
    <form
      id='vehicle-category-form'
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>
      </Grid2>

      <Grid3>
        <Field label='Capacity (pax)'>
          <input
            name='capacity'
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Luggage capacity'>
          <input
            name='luggageCapacity'
            value={luggageCapacity}
            onChange={(e) => setLuggageCapacity(e.target.value)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Sort order'>
          <input
            name='sortOrder'
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>
      </Grid3>

      <Field label='Min hours (HOURLY)'>
        <input
          name='minHours'
          value={minHours}
          onChange={(e) => setMinHours(e.target.value)}
          className='inputBorder'
          disabled={isPending}
        />
      </Field>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='cardTitle h5'>Pricing (USD)</label>
        <div className='miniNote' style={{ marginTop: -2 }}>
          Enter values in dollars (example: 150.00 = $150.00).
        </div>
      </div>

      <Grid2>
        <Field label='Base fare'>
          <input
            name='baseFareCents'
            value={baseFare}
            onChange={(e) => setBaseFare(e.target.value)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Per mile'>
          <input
            name='perMileCents'
            value={perMile}
            onChange={(e) => setPerMile(e.target.value)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Per minute'>
          <input
            name='perMinuteCents'
            value={perMinute}
            onChange={(e) => setPerMinute(e.target.value)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Per hour'>
          <input
            name='perHourCents'
            value={perHour}
            onChange={(e) => setPerHour(e.target.value)}
            className='inputBorder'
            disabled={isPending}
          />
        </Field>
      </Grid2>

      <label className={styles.labelinputcheckbox}>
        <input
          type='checkbox'
          name='active'
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
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
