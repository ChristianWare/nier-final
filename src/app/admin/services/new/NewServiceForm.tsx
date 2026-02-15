/* eslint-disable @typescript-eslint/no-unused-vars */
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
type PricingStrategyUI = "POINT_TO_POINT" | "HOURLY" | "FLAT";

// Fee type for UI state
type FeeUI = {
  id: string;
  label: string;
  amount: string;
};

export default function NewServiceForm({ action, airports }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const suggestedSlug = useMemo(() => slugify(name || ""), [name]);

  const [airportLeg, setAirportLeg] = useState<AirportLegUI>("NONE");
  const [selectedAirportIds, setSelectedAirportIds] = useState<string[]>([]);

  const [pricingStrategy, setPricingStrategy] =
    useState<PricingStrategyUI>("POINT_TO_POINT");

  const [fees, setFees] = useState<FeeUI[]>([]);

  const showAirportConfig = airportLeg !== "NONE";
  const showMinHours = pricingStrategy === "HOURLY";

  function toggleAirport(id: string) {
    setSelectedAirportIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function addFee() {
    setFees((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", amount: "" },
    ]);
  }

  function updateFee(id: string, field: "label" | "amount", value: string) {
    setFees((prev) =>
      prev.map((fee) => (fee.id === id ? { ...fee, [field]: value } : fee)),
    );
  }

  function removeFee(id: string) {
    setFees((prev) => prev.filter((fee) => fee.id !== id));
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

        // Add fees to form data
        fees.forEach((fee) => {
          if (fee.label.trim() && fee.amount.trim()) {
            formData.append("feeLabel", fee.label.trim());
            formData.append("feeAmount", fee.amount.trim());
          }
        });

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

      <Field
        label='Service kind'
        hint='Choose "Standard" unless pickup or dropoff should be selected from an airport list.'
      >
        <select
          className='selectBorder emptySmall'
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

      <Field label='Pricing strategy'>
        <select
          name='pricingStrategy'
          value={pricingStrategy}
          onChange={(e) =>
            setPricingStrategy(e.target.value as PricingStrategyUI)
          }
          className='selectBorder emptySmall'
          disabled={isPending}
        >
          <option value='POINT_TO_POINT'>POINT_TO_POINT</option>
          <option value='HOURLY'>HOURLY</option>
          <option value='FLAT'>FLAT</option>
        </select>
      </Field>

      {/* Hidden inputs to send $0 for removed pricing fields */}
      <input type='hidden' name='minFare' value='0' />
      <input type='hidden' name='baseFee' value='0' />
      <input type='hidden' name='perMile' value='0' />
      <input type='hidden' name='perMinute' value='0' />
      <input type='hidden' name='perHour' value='0' />

      <Grid2>
        {/* Min hours field - only shown for HOURLY */}
        {showMinHours && (
          <Field
            label='Minimum hours'
            hint='Service-level minimum. Vehicle minimums may also apply.'
          >
            <input
              type='number'
              step='1'
              inputMode='numeric'
              name='minHours'
              defaultValue='0'
              min='0'
              className='inputBorder'
              disabled={isPending}
            />
          </Field>
        )}

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

      <div className='miniNote'>
        💡 Per-mile, per-hour, and base fare pricing is managed on each{" "}
        <Link href='/admin/vehicle-categories' style={{ fontWeight: 600 }}>
          Vehicle Category
        </Link>
        .
      </div>

      {/* Service Fees Section */}
      <Field
        label='Service fees (optional)'
        hint="Flat fees shown as line items on invoices. E.g., 'Airport Fee', 'Meet & Greet'."
      >
        <div className={styles.airportBox}>
          {fees.length === 0 ? (
            <div className='miniNote'>
              No fees added yet. Click below to add a fee.
            </div>
          ) : (
            <div className={styles.feesList}>
              {fees.map((fee, index) => (
                <div key={fee.id} className={styles.feeRow}>
                  <div className={styles.feeInputs}>
                    <input
                      type='text'
                      placeholder='Fee name (e.g., Airport Fee)'
                      value={fee.label}
                      onChange={(e) =>
                        updateFee(fee.id, "label", e.target.value)
                      }
                      className='inputBorder'
                      disabled={isPending}
                    />
                    <div className={styles.feeAmountWrapper}>
                      <span className={styles.feeCurrency}>$</span>
                      <input
                        type='number'
                        step='0.01'
                        inputMode='decimal'
                        placeholder='0.00'
                        value={fee.amount}
                        onChange={(e) =>
                          updateFee(fee.id, "amount", e.target.value)
                        }
                        className='inputBorder'
                        style={{ paddingLeft: "24px" }}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => removeFee(fee.id)}
                    className={styles.feeRemoveBtn}
                    disabled={isPending}
                    title='Remove fee'
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.airportActions}>
            <button
              type='button'
              className='tab tabActive'
              onClick={addFee}
              disabled={isPending}
            >
              + Add fee
            </button>
            {fees.length > 0 && (
              <button
                type='button'
                className='tab'
                onClick={() => setFees([])}
                disabled={isPending}
              >
                Clear all
              </button>
            )}
          </div>

          {fees.length > 0 && (
            <div className={styles.feesPreview}>
              <div className='emptyTitle' style={{ marginBottom: 8 }}>
                Preview on invoice:
              </div>
              {fees
                .filter((f) => f.label.trim() && f.amount.trim())
                .map((fee) => (
                  <div key={fee.id} className={styles.feePreviewRow}>
                    <span>{fee.label}</span>
                    <span>${parseFloat(fee.amount || "0").toFixed(2)}</span>
                  </div>
                ))}
              {fees.filter((f) => f.label.trim() && f.amount.trim()).length ===
                0 && (
                <div className='miniNote'>
                  Fill in fee name and amount to see preview.
                </div>
              )}
            </div>
          )}
        </div>
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
    <div style={{ display: "grid", gap: 10 }}>
      <label className='cardTitle h5'>{label}</label>
      {children}
      {hint ? <div className='miniNote'>{hint}</div> : null}
    </div>
  );
}
