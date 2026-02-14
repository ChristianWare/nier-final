/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import styles from "./EditVehicleCategoryPage.module.css";
import { useRouter } from "next/navigation";
import React, { useState, useMemo, useTransition, useCallback } from "react";
import toast from "react-hot-toast";
import { updateVehicleCategory } from "../../../../../actions/admin/vehicleCategories";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";
import Button from "@/components/shared/Button/Button";

type Category = {
  id: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  capacity: number;
  luggageCapacity: number;
  sortOrder: number;
  minHours: number;
  baseFareCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  active: boolean;
};

const CAPACITY_OPTIONS = Array.from({ length: 60 }, (_, i) => i + 1);
const LUGGAGE_OPTIONS = Array.from({ length: 60 }, (_, i) => i + 1);
const MIN_HOURS_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);

export default function EditVehicleCategoryForm({
  category,
}: {
  category: Category;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /* ── Lock / Unlock state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Controlled state for all fields
  const [name, setName] = useState(category.name);
  const [capacity, setCapacity] = useState(String(category.capacity));
  const [luggageCapacity, setLuggageCapacity] = useState(
    String(category.luggageCapacity),
  );
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [minHours, setMinHours] = useState(String(category.minHours ?? 0));
  const [baseFare, setBaseFare] = useState(
    (category.baseFareCents / 100).toFixed(2),
  );
  const [perMile, setPerMile] = useState(
    (category.perMileCents / 100).toFixed(2),
  );
  const [perMinute, setPerMinute] = useState(
    (category.perMinuteCents / 100).toFixed(2),
  );
  const [perHour, setPerHour] = useState(
    (category.perHourCents / 100).toFixed(2),
  );
  const [active, setActive] = useState(category.active);

  // Track which fields changed for the dirty form modal
  const changedFields = useMemo(() => {
    const fields: string[] = [];
    if (name !== category.name) fields.push("Name");
    if (capacity !== String(category.capacity)) fields.push("Capacity");
    if (luggageCapacity !== String(category.luggageCapacity))
      fields.push("Luggage Capacity");
    if (sortOrder !== String(category.sortOrder)) fields.push("Sort Order");
    if (minHours !== String(category.minHours ?? 0)) fields.push("Min Hours");
    if (baseFare !== (category.baseFareCents / 100).toFixed(2))
      fields.push("Base Fare");
    if (perMile !== (category.perMileCents / 100).toFixed(2))
      fields.push("Per Mile");
    if (perMinute !== (category.perMinuteCents / 100).toFixed(2))
      fields.push("Per Minute");
    if (perHour !== (category.perHourCents / 100).toFixed(2))
      fields.push("Per Hour");
    if (active !== category.active) fields.push("Active Status");
    return fields;
  }, [
    name,
    capacity,
    luggageCapacity,
    sortOrder,
    minHours,
    baseFare,
    perMile,
    perMinute,
    perHour,
    active,
    category,
  ]);

  useDirtyForm(
    "vehicle-category",
    isEditing && changedFields.length > 0,
    "vehicle-category-form",
    changedFields,
  );

  /* ── Helpers ── */
  const isLocked = !isEditing;
  const fieldsDisabled = isLocked || isPending;

  const wrapperClass = justSaved
    ? `${styles.form} ${styles.sectionSaved}`
    : isEditing
      ? `${styles.form} ${styles.sectionEditing}`
      : `${styles.form} ${styles.sectionLocked}`;

  const handleCancel = useCallback(() => {
    setName(category.name);
    setCapacity(String(category.capacity));
    setLuggageCapacity(String(category.luggageCapacity));
    setSortOrder(String(category.sortOrder));
    setMinHours(String(category.minHours ?? 0));
    setBaseFare((category.baseFareCents / 100).toFixed(2));
    setPerMile((category.perMileCents / 100).toFixed(2));
    setPerMinute((category.perMinuteCents / 100).toFixed(2));
    setPerHour((category.perHourCents / 100).toFixed(2));
    setActive(category.active);
    setIsEditing(false);
  }, [category]);

  function handleSave() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("capacity", capacity);
    fd.set("luggageCapacity", luggageCapacity);
    fd.set("sortOrder", sortOrder);
    fd.set("minHours", minHours);
    fd.set("baseFareCents", baseFare);
    fd.set("perMileCents", perMile);
    fd.set("perMinuteCents", perMinute);
    fd.set("perHourCents", perHour);
    if (active) fd.set("active", "on");

    startTransition(() => {
      void (async () => {
        const res = await updateVehicleCategory(category.id, fd);

        if ((res as any)?.error) {
          toast.error((res as any).error);
          return;
        }

        toast.success("Vehicle category updated");
        setJustSaved(true);
        setTimeout(() => {
          setJustSaved(false);
          setIsEditing(false);
        }, 2000);
        router.refresh();
      })();
    });
  }

  /* ── Section action buttons ── */
  const renderActions = () => {
    if (justSaved) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button text='Saved ✓' btnType='greenReg' type='button' disabled />
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className={styles.sectionActionsRow}>
          <Button
            disabled={isPending}
            type='button'
            text={isPending ? "Saving..." : "Save Changes"}
            btnType='blackReg'
            onClick={handleSave}
          />
          {!isPending && (
            <Button
              text='Cancel'
              btnType='redReg'
              type='button'
              onClick={handleCancel}
            />
          )}
        </div>
      );
    }

    return (
      <div className={styles.sectionActionsRow}>
        <Button
          text='Edit Category'
          btnType='blackReg'
          type='button'
          onClick={() => setIsEditing(true)}
        />
      </div>
    );
  };

  return (
    <div id='vehicle-category-form' className={wrapperClass}>
      <Grid2>
        <Field label='Name'>
          <input
            name='name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='input'
            disabled={fieldsDisabled}
          />
        </Field>
      </Grid2>

      <Grid3>
        <Field label='Capacity (pax)'>
          <select
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className='selectBorder'
            disabled={fieldsDisabled}
          >
            <option value='0'>—</option>
            {CAPACITY_OPTIONS.map((n) => (
              <option key={n} value={String(n)}>
                {n} {n === 1 ? "passenger" : "passengers"}
              </option>
            ))}
          </select>
        </Field>

        <Field label='Luggage capacity'>
          <select
            value={luggageCapacity}
            onChange={(e) => setLuggageCapacity(e.target.value)}
            className='selectBorder'
            disabled={fieldsDisabled}
          >
            <option value='0'>—</option>
            {LUGGAGE_OPTIONS.map((n) => (
              <option key={n} value={String(n)}>
                {n} {n === 1 ? "bag" : "bags"}
              </option>
            ))}
          </select>
        </Field>

        <Field label='Sort order'>
          <input
            name='sortOrder'
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className='input'
            disabled={fieldsDisabled}
          />
        </Field>
      </Grid3>

      <Field label='Min hours (HOURLY)'>
        <select
          value={minHours}
          onChange={(e) => setMinHours(e.target.value)}
          className='selectBorder'
          disabled={fieldsDisabled}
        >
          <option value='0'>None</option>
          {MIN_HOURS_OPTIONS.map((n) => (
            <option key={n} value={String(n)}>
              {n} {n === 1 ? "hour" : "hours"}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: "grid", gap: 6 }}>
        <label className='h4 underline'>Pricing (USD)</label>
        <div className='miniNote' style={{ marginTop: -2 }}>
          Enter values in dollars (example: 150.00 = $150.00).
        </div>
      </div>

      <Grid2>
        <Field label='Base fare'>
          <input
            name='baseFareCents'
            value={baseFare}
            onChange={(e) => setBaseFare(e.target.value)}
            className='inputBorder'
            disabled={fieldsDisabled}
          />
        </Field>

        <Field label='Per mile'>
          <input
            name='perMileCents'
            value={perMile}
            onChange={(e) => setPerMile(e.target.value)}
            className='inputBorder'
            disabled={fieldsDisabled}
          />
        </Field>

        <Field label='Per minute'>
          <input
            name='perMinuteCents'
            value={perMinute}
            onChange={(e) => setPerMinute(e.target.value)}
            className='inputBorder'
            disabled={fieldsDisabled}
          />
        </Field>

        <Field label='Per hour'>
          <input
            name='perHourCents'
            value={perHour}
            onChange={(e) => setPerHour(e.target.value)}
            className='inputBorder'
            disabled={fieldsDisabled}
          />
        </Field>
      </Grid2>

      <label className={styles.labelinputcheckbox}>
        <input
          type='checkbox'
          name='active'
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          disabled={fieldsDisabled}
          className={styles.labelinputcheckbox}
        />
        <span className='emptyTitle'>Active</span>
      </label>

      {renderActions()}
    </div>
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
      <label className='emptyTitle'>{label}</label>
      {children}
      {hint ? <div className='miniNote'>{hint}</div> : null}
    </div>
  );
}
