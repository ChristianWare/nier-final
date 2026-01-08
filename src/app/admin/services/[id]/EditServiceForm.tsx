"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { slugify } from "@/lib/slugify";

export type ActionResult = { success?: string; error?: string };

type ServiceTypeDTO = {
  id: string;
  name: string;
  slug: string;
  pricingStrategy: "POINT_TO_POINT" | "HOURLY" | "FLAT";
  minFareCents: number;
  baseFeeCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  sortOrder: number;
  active: boolean;
};

type Props = {
  service: ServiceTypeDTO;
  onUpdate: (formData: FormData) => Promise<ActionResult>;
  onDelete: () => Promise<ActionResult>;
};

function centsToDollarsInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function EditServiceForm({
  service,
  onUpdate,
  onDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(service.name);
  const [slug, setSlug] = useState(service.slug);
  const [slugTouched, setSlugTouched] = useState(false);

  const suggestedSlug = useMemo(() => slugify(name || ""), [name]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);

          startTransition(async () => {
            const res = await onUpdate(formData);
            if (res?.error) {
              toast.error(res.error);
              return;
            }
            toast.success("service updated");
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
              const next = e.target.value;
              setName(next);
              if (!slugTouched) setSlug(slugify(next));
            }}
            style={inputStyle}
            disabled={isPending}
          />
        </Field>

        <Field
          label='Slug (optional)'
          hint='Auto-fills from name until you edit it.'
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
          defaultValue={service.pricingStrategy}
          disabled={isPending}
        />

        <Grid2>
          <Field label='Min fare ($)'>
            <input
              type='number'
              step='0.01'
              inputMode='decimal'
              name='minFare'
              defaultValue={centsToDollarsInput(service.minFareCents)}
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
              defaultValue={centsToDollarsInput(service.baseFeeCents)}
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
              defaultValue={centsToDollarsInput(service.perMileCents)}
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
              defaultValue={centsToDollarsInput(service.perMinuteCents)}
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
              defaultValue={centsToDollarsInput(service.perHourCents)}
              style={inputStyle}
              disabled={isPending}
            />
          </Field>

          <Field label='Sort order'>
            <input
              type='number'
              step='1'
              inputMode='numeric'
              name='sortOrder'
              defaultValue={String(service.sortOrder ?? 0)}
              style={inputStyle}
              disabled={isPending}
            />
          </Field>
        </Grid2>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type='checkbox'
            name='active'
            defaultChecked={service.active}
            disabled={isPending}
          />
          Active
        </label>

        <button type='submit' style={submitBtnStyle} disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </button>
      </form>

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 14 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirm("Delete this service? This cannot be undone.")) return;

            startTransition(async () => {
              const res = await onDelete();
              if (res?.error) {
                toast.error(res.error);
                return;
              }
              toast.success("service deleted");
              router.push("/admin/services");
              router.refresh();
            });
          }}
        >
          <button
            type='submit'
            style={{
              padding: "0.75rem 1rem",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.2)",
              cursor: "pointer",
              background: "transparent",
            }}
            disabled={isPending}
          >
            Delete service
          </button>
        </form>
      </div>
    </div>
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
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, opacity: 0.8 }}>{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
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
