"use client";

import styles from "./NewServiceForm.module.css";
import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { slugify } from "@/lib/slugify";
import Link from "next/link";

type ActionResult = { success?: string; error?: string };

type AirportDTO = {
  id: string;
  name: string;
  iata: string;
  address: string;
};

type Props = {
  action: (formData: FormData) => Promise<ActionResult>;
  airports: AirportDTO[];
};

type AirportLegUI = "NONE" | "PICKUP" | "DROPOFF";

export default function NewServiceForm({ action, airports }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const suggestedSlug = useMemo(() => slugify(name || ""), [name]);

  const [airportLeg, setAirportLeg] = useState<AirportLegUI>("NONE");
  const [selectedAirportIds, setSelectedAirportIds] = useState<string[]>([]);

  const showAirportConfig = airportLeg !== "NONE";

  function toggleAirport(id: string) {
    setSelectedAirportIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();

        if (showAirportConfig && selectedAirportIds.length === 0) {
          toast.error("Select at least one airport for an airport service.");
          return;
        }

        const form = e.currentTarget;
        const formData = new FormData(form);

        formData.set("airportLeg", airportLeg);
        selectedAirportIds.forEach((id) => formData.append("airportIds", id));

        startTransition(async () => {
          const res = await action(formData);

          if (res?.error) {
            toast.error(res.error);
            return;
          }

          toast.success("Service added");
          router.push("/admin/services");
          router.refresh();
        });
      }}
      className={styles.form}
    >
      <Field label='Name'>
        <input
          name='name'
          value={name}
          onChange={(e) => {
            const nextName = e.target.value;
            setName(nextName);

            if (!slugTouched) setSlug(slugify(nextName));
          }}
          className='inputBorder'
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
            className='inputBorder'
            disabled={isPending}
          />

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type='button'
              onClick={() => {
                setSlugTouched(false);
                setSlug(slugify(name));
              }}
              className='tab tabActive'
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

      {/* ✅ Option 2a: simple, clear selector. If "Standard", airport UI stays hidden */}
      <Field
        label='Service kind'
        hint='Choose “Standard” unless pickup or dropoff should be selected from an airport list.'
      >
        <select
          className='inputBorder'
          value={airportLeg}
          onChange={(e) => {
            const next = e.target.value as AirportLegUI;
            setAirportLeg(next);
            if (next === "NONE") setSelectedAirportIds([]);
          }}
          disabled={isPending}
        >
          <option value='NONE'>Standard (no airport dropdown)</option>
          <option value='PICKUP'>Airport pickup (pickup is an airport)</option>
          <option value='DROPOFF'>
            Airport dropoff (dropoff is an airport)
          </option>
        </select>
      </Field>

      {/* ✅ Only shown when relevant */}
      {showAirportConfig ? (
        <Field
          label='Airports for this service'
          hint='These airports will appear as a dropdown in the BookingWizard.'
        >
          <div className={styles.airportBox}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div className='miniNote'>
                Airports are managed in <strong>Admin → Airports</strong>.
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className='tab tabActive' href='/admin/airports'>
                  Manage airports
                </Link>
                <Link className='tab' href='/admin/airports/new'>
                  Add airport
                </Link>
              </div>
            </div>

            {airports.length === 0 ? (
              <div style={{ paddingTop: 10 }}>
                <div className='emptyTitle underline'>No airports yet</div>
                <p className='emptySmall'>
                  Add airports first, then come back and select them here.
                </p>
              </div>
            ) : (
              <div className={styles.airportList}>
                {airports.map((a) => {
                  const checked = selectedAirportIds.includes(a.id);
                  return (
                    <label key={a.id} className={styles.airportRow}>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={() => toggleAirport(a.id)}
                        disabled={isPending}
                      />
                      <div className={styles.airportRowText}>
                        <div className={styles.airportName}>
                          {a.name}{" "}
                          <span className={styles.iata}>({a.iata})</span>
                        </div>
                        <div className={styles.airportAddr}>{a.address}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className={styles.airportActions}>
              <button
                type='button'
                className='tab tabActive'
                disabled={isPending || airports.length === 0}
                onClick={() => setSelectedAirportIds(airports.map((a) => a.id))}
              >
                Select all
              </button>
              <button
                type='button'
                className='tab'
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
            className='inputBorder'
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
            className='inputBorder'
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
            className='inputBorder'
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
            className='inputBorder'
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
            className='inputBorder'
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
      <label className='cardTitle h5'>{label}</label>
      <select
        name={name}
        defaultValue={options[0]}
        className='inputBorder'
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
