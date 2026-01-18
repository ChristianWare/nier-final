"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { slugify } from "@/lib/slugify";

export type ActionResult = { success?: string; error?: string };

type AirportDTO = {
  id: string;
  name: string;
  iata: string;
  address: string;
};

type AirportLegUI = "NONE" | "PICKUP" | "DROPOFF";

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
  airportLeg: AirportLegUI;
  airportIds: string[];
};

type Props = {
  service: ServiceTypeDTO;
  airports: AirportDTO[];
  onUpdate: (formData: FormData) => Promise<ActionResult>;
  onDelete: () => Promise<ActionResult>;
};

function centsToDollarsInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function EditServiceForm({
  service,
  airports,
  onUpdate,
  onDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(service.name);
  const [slug, setSlug] = useState(service.slug);
  const [slugTouched, setSlugTouched] = useState(false);

  const suggestedSlug = useMemo(() => slugify(name || ""), [name]);

  const [airportLeg, setAirportLeg] = useState<AirportLegUI>(
    service.airportLeg ?? "NONE",
  );
  const [selectedAirportIds, setSelectedAirportIds] = useState<string[]>(
    Array.isArray(service.airportIds) ? service.airportIds : [],
  );

  const showAirportConfig = airportLeg !== "NONE";

  function toggleAirport(id: string) {
    setSelectedAirportIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();

          if (showAirportConfig && selectedAirportIds.length === 0) {
            toast.error("Select at least one airport for an airport service.");
            return;
          }

          const formData = new FormData(e.currentTarget);

          formData.set("airportLeg", airportLeg);
          selectedAirportIds.forEach((id) => formData.append("airportIds", id));

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

        <Field
          label='Service kind'
          hint='Choose “Standard” unless pickup or dropoff should be selected from an airport list.'
        >
          <select
            name='airportLeg'
            value={airportLeg}
            onChange={(e) => {
              const next = e.target.value as AirportLegUI;
              setAirportLeg(next);
              if (next === "NONE") setSelectedAirportIds([]);
            }}
            style={inputStyle}
            disabled={isPending}
          >
            <option value='NONE'>Standard (no airport dropdown)</option>
            <option value='PICKUP'>
              Airport pickup (pickup is an airport)
            </option>
            <option value='DROPOFF'>
              Airport dropoff (dropoff is an airport)
            </option>
          </select>
        </Field>

        {showAirportConfig ? (
          <Field
            label='Airports for this service'
            hint='These airports will appear as a dropdown in the BookingWizard.'
          >
            <div style={airportBoxStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Airports are managed in <strong>Admin → Airports</strong>.
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href='/admin/airports' style={chipLinkStyle}>
                    Manage airports
                  </Link>
                  <Link href='/admin/airports/new' style={chipLinkMutedStyle}>
                    Add airport
                  </Link>
                </div>
              </div>

              {airports.length === 0 ? (
                <div style={{ paddingTop: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    No airports yet
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.75 }}>
                    Add airports first, then come back and select them here.
                  </p>
                </div>
              ) : (
                <div style={airportListStyle}>
                  {airports.map((a) => {
                    const checked = selectedAirportIds.includes(a.id);
                    return (
                      <label key={a.id} style={airportRowStyle}>
                        <input
                          type='checkbox'
                          checked={checked}
                          onChange={() => toggleAirport(a.id)}
                          disabled={isPending}
                        />
                        <div style={{ display: "grid", gap: 2 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>
                            {a.name}{" "}
                            <span
                              style={{ fontFamily: "monospace", opacity: 0.7 }}
                            >
                              ({a.iata})
                            </span>
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.75 }}>
                            {a.address}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type='button'
                  style={smallBtnStyle}
                  disabled={isPending || airports.length === 0}
                  onClick={() =>
                    setSelectedAirportIds(airports.map((a) => a.id))
                  }
                >
                  Select all
                </button>
                <button
                  type='button'
                  style={smallBtnStyle}
                  disabled={isPending}
                  onClick={() => setSelectedAirportIds([])}
                >
                  Clear
                </button>
              </div>
            </div>
          </Field>
        ) : null}

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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
      }}
    >
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

const airportBoxStyle: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 12,
  background: "rgba(0,0,0,0.02)",
};

const airportListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  maxHeight: 260,
  overflow: "auto",
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "rgba(255,255,255,0.6)",
};

const airportRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "16px 1fr",
  gap: 10,
  alignItems: "start",
};

const chipLinkStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.18)",
  textDecoration: "none",
  color: "inherit",
  fontWeight: 700,
};

const chipLinkMutedStyle: React.CSSProperties = {
  ...chipLinkStyle,
  fontWeight: 600,
  opacity: 0.8,
};
