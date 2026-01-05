"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
      style={{ display: "grid", gap: 10 }}
    >
      <Field label='Vehicle name' hint='Examples: "SUV #1", "Sprinter Van A"'>
        <input name='name' style={inputStyle} disabled={isPending} required />
      </Field>

      <Field label='Plate (optional)'>
        <input name='plate' style={inputStyle} disabled={isPending} />
      </Field>

      <Field
        label='Category'
        hint='This is what determines capacity + pricing rules.'
      >
        <select
          name='categoryId'
          style={inputStyle}
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

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type='checkbox'
          name='active'
          defaultChecked
          disabled={isPending}
        />
        Active
      </label>

      <button
        type='submit'
        style={submitBtnStyle}
        disabled={isPending || categories.length === 0}
      >
        {isPending ? "Creating..." : "Create"}
      </button>
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
      <label style={{ fontSize: 12, opacity: 0.8 }}>{label}</label>
      {children}
      {hint ? <div style={{ fontSize: 12, opacity: 0.6 }}>{hint}</div> : null}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.75rem",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "white",
};

const submitBtnStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.2)",
  cursor: "pointer",
  justifySelf: "start",
  background: "white",
};
