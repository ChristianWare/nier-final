"use client";

import type { ActionResult } from "@/lib/actionResult";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
      style={{ display: "grid", gap: 10 }}
    >
      <Field label='Name'>
        <input
          name='name'
          defaultValue={unit.name}
          style={inputStyle}
          disabled={isPending}
        />
      </Field>

      <Field label='Plate (optional)'>
        <input
          name='plate'
          defaultValue={unit.plate}
          style={inputStyle}
          disabled={isPending}
        />
      </Field>

      <Field label='Category (optional)'>
        <select
          name='categoryId'
          defaultValue={unit.categoryId}
          style={inputStyle}
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

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type='checkbox'
          name='active'
          defaultChecked={unit.active}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, opacity: 0.8 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.75rem",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
};

const btnStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.2)",
  cursor: "pointer",
  justifySelf: "start",
};
