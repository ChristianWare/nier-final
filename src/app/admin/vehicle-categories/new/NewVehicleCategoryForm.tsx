/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./NewVehicleCategoryPage.module.css";
import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
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
      className={styles.form}
    >
      <Grid2>
        <Field label='Name'>
          <input
            name='name'
            defaultValue=''
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Image URL (optional)'>
          <input
            name='imageUrl'
            defaultValue=''
            className='inputBorder'
            disabled={isPending}
          />
        </Field>
      </Grid2>

      <Field label='Description (optional)'>
        <input
          name='description'
          defaultValue=''
          className='inputBorder'
          disabled={isPending}
        />
      </Field>

      <Grid3>
        <Field label='Capacity (pax)'>
          <input
            name='capacity'
            defaultValue='7'
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Luggage capacity'>
          <input
            name='luggageCapacity'
            defaultValue='6'
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Sort order'>
          <input
            name='sortOrder'
            defaultValue='0'
            className='inputBorder'
            disabled={isPending}
          />
        </Field>
      </Grid3>

      <Field label='Min hours (HOURLY)'>
        <input
          name='minHours'
          defaultValue='0'
          className='inputBorder'
          disabled={isPending}
        />
      </Field>

      <div className={styles.sectionTitle}>Pricing (cents)</div>

      <Grid2>
        <Field label='Base fare'>
          <input
            name='baseFareCents'
            defaultValue='0'
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Per mile'>
          <input
            name='perMileCents'
            defaultValue='0'
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Per minute'>
          <input
            name='perMinuteCents'
            defaultValue='0'
            className='inputBorder'
            disabled={isPending}
          />
        </Field>

        <Field label='Per hour'>
          <input
            name='perHourCents'
            defaultValue='0'
            className='inputBorder'
            disabled={isPending}
          />
        </Field>
      </Grid2>

      <label className={styles.labelinputcheckbox}>
        <input
          type='checkbox'
          name='active'
          defaultChecked
          disabled={isPending}
          className={styles.labelinputcheckbox}
        />
        <span className='emptyTitle'>Active</span>
      </label>

      <div className={styles.btnContainer}>
        <button type='submit' className='primaryBtn' disabled={isPending}>
          {isPending ? "Creating..." : "Create"}
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
