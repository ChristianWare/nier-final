"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { slugify } from "@/lib/slugify";

type ActionResult = { success?: string; error?: string };

type Props = {
  action: (formData: FormData) => Promise<ActionResult>;
};

export default function NewServiceForm({ action }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const suggestedSlug = useMemo(() => slugify(name || ""), [name]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        const form = e.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
          const res = await action(formData);

          if (res?.error) {
            toast.error(res.error);
            return;
          }

          toast.success("service added");
          router.push("/admin/services");
          router.refresh();
        });
      }}
      style={{ display: "grid", gap: 10 }}
    >
      <Field label='Name'>
        <input
          name='name'
          value={name}
          onChange={(e) => {
            const nextName = e.target.value;
            setName(nextName);

            if (!slugTouched) {
              setSlug(slugify(nextName));
            }
          }}
          style={inputStyle}
          disabled={isPending}
        />
      </Field>

      <Field
        label='Slug (optional)'
        hint='Auto-fills from name. You can override it if needed.'
      >
        <div style={{ display: "grid", gap: 8 }}>
          <input
            name='slug'
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder={suggestedSlug || "auto-generated"}
            style={inputStyle}
            disabled={isPending}
          />

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type='button'
              onClick={() => {
                setSlugTouched(false);
                setSlug(slugify(name));
              }}
              style={smallBtnStyle}
              disabled={isPending}
            >
              Reset to auto
            </button>

            <span style={{ fontSize: 12, opacity: 0.7 }}>
              Preview:{" "}
              <span style={{ fontFamily: "monospace" }}>
                {slug || suggestedSlug || ""}
              </span>
            </span>
          </div>
        </div>
      </Field>

      <Select
        label='Pricing strategy'
        name='pricingStrategy'
        options={["POINT_TO_POINT", "HOURLY", "FLAT"]}
        disabled={isPending}
      />

      <Grid2>
        <Field label='Min fare ($)'>
          <input
            type='number'
            step='0.01'
            inputMode='decimal'
            name='minFare'
            defaultValue='55.00'
            style={inputStyle}
            disabled={isPending}
          />
        </Field>

        <Field label='Base fee ($)'>
          <input
            type='number'
            step='0.01'
            inputMode='decimal'
            name='baseFee'
            defaultValue='0.00'
            style={inputStyle}
            disabled={isPending}
          />
        </Field>

        <Field label='Per mile ($)'>
          <input
            type='number'
            step='0.01'
            inputMode='decimal'
            name='perMile'
            defaultValue='2.75'
            style={inputStyle}
            disabled={isPending}
          />
        </Field>

        <Field label='Per minute ($)'>
          <input
            type='number'
            step='0.01'
            inputMode='decimal'
            name='perMinute'
            defaultValue='0.00'
            style={inputStyle}
            disabled={isPending}
          />
        </Field>

        <Field label='Per hour ($)'>
          <input
            type='number'
            step='0.01'
            inputMode='decimal'
            name='perHour'
            defaultValue='0.00'
            style={inputStyle}
            disabled={isPending}
          />
        </Field>

        <Field label='Sort order' hint='Lower shows first. Use 10, 20, 30...'>
          <input
            type='number'
            step='1'
            inputMode='numeric'
            name='sortOrder'
            defaultValue='0'
            style={inputStyle}
            disabled={isPending}
          />
        </Field>
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

      <button type='submit' style={submitBtnStyle} disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {children}
    </div>
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

function Select({
  label,
  name,
  options,
  disabled,
}: {
  label: string;
  name: string;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, opacity: 0.8 }}>{label}</label>
      <select
        name={name}
        defaultValue={options[0]}
        style={inputStyle}
        disabled={disabled}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.75rem",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
};

const submitBtnStyle: React.CSSProperties = {
  padding: "0.8rem 1rem",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.2)",
  cursor: "pointer",
  justifySelf: "start",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "0.4rem 0.6rem",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.2)",
  cursor: "pointer",
  background: "transparent",
};
