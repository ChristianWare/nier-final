"use client";

import styles from "./NewVehicleUnitForm.module.css";
import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type ActionResult = { success?: string; error?: string };

type Category = { id: string; name: string };

export default function NewVehicleUnitForm({
  action,
  categories,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  categories: Category[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
          const res = await action(formData);

          if (res?.error) {
            toast.error(res.error);
            return;
          }

          toast.success(res?.success ?? "vehicle added");
          router.push("/admin/vehicles");
          router.refresh();
        });
      }}
      className={styles.form}
    >
      <Field label='Vehicle name' hint='Examples: "SUV #1", "Sprinter Van A"'>
        <input
          name='name'
          className='inputBorder'
          disabled={isPending}
          required
        />
      </Field>

      <Field label='Plate (optional)'>
        <input name='plate' className='inputBorder' disabled={isPending} />
      </Field>

      <Field
        label='Category'
        hint='This is what determines capacity + pricing rules.'
      >
        <select
          name='categoryId'
          className='inputBorder'
          disabled={isPending}
          required
          defaultValue={categories[0]?.id ?? ""}
        >
          {categories.length === 0 ? (
            <option value='' disabled>
              No categories yet — create one first
            </option>
          ) : (
            categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          )}
        </select>
      </Field>

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
        <button
          type='submit'
          className='primaryBtn'
          disabled={isPending || categories.length === 0}
        >
          {isPending ? "Creating..." : "Create"}
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
