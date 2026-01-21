"use client";

import type { ActionResult } from "@/lib/actionResult";
import styles from "./EditVehicleUnitForm.module.css";
import { useRouter } from "next/navigation";
import React, { useTransition } from "react";
import toast from "react-hot-toast";

export default function EditVehicleUnitForm({
  unit,
  categories,
  onUpdate,
}: {
  unit: {
    id: string;
    name: string;
    plate: string;
    categoryId: string;
    active: boolean;
  };
  categories: { id: string; name: string }[];
  onUpdate: (formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);

        // ensure checkbox always sends something
        if (!fd.has("active")) fd.set("active", "false");

        startTransition(() => {
          void (async () => {
            const res = await onUpdate(fd);

            if (res?.error) {
              toast.error(res.error);
              return;
            }

            toast.success(res?.success ?? "vehicle updated");
            router.push("/admin/vehicles");
            router.refresh();
          })();
        });
      }}
    >
      <Field label='Name'>
        <input
          name='name'
          defaultValue={unit.name}
          className='inputBorder'
          disabled={isPending}
        />
      </Field>

      <Field label='Plate (optional)'>
        <input
          name='plate'
          defaultValue={unit.plate}
          className='inputBorder'
          disabled={isPending}
        />
      </Field>

      <Field label='Category (optional)'>
        <select
          name='categoryId'
          defaultValue={unit.categoryId}
          className='inputBorder'
          disabled={isPending}
        >
          <option value=''>Unassigned</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <label className={styles.labelinputcheckbox}>
        <input
          type='checkbox'
          name='active'
          defaultChecked={unit.active}
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
