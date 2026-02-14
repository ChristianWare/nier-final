"use client";

import type { ActionResult } from "@/lib/actionResult";
import styles from "./EditVehicleUnitForm.module.css";
import { useRouter } from "next/navigation";
import React, { useState, useTransition, useCallback } from "react";
import toast from "react-hot-toast";
import Button from "@/components/shared/Button/Button";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

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

  /* ── Lock / Unlock state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  /* ── Controlled fields ── */
  const [name, setName] = useState(unit.name);
  const [plate, setPlate] = useState(unit.plate);
  const [categoryId, setCategoryId] = useState(unit.categoryId);
  const [active, setActive] = useState(unit.active);

  /* ── Helpers ── */

  const isDirty =
    isEditing &&
    (name !== unit.name ||
      plate !== unit.plate ||
      categoryId !== unit.categoryId ||
      active !== unit.active);

  useDirtyForm("vehicle-unit", isDirty, "vehicle-unit-form");

  const isLocked = !isEditing;
  const fieldsDisabled = isLocked || isPending;

  const wrapperClass = justSaved
    ? `${styles.form} ${styles.sectionSaved}`
    : isEditing
      ? `${styles.form} ${styles.sectionEditing}`
      : `${styles.form} ${styles.sectionLocked}`;

  const handleCancel = useCallback(() => {
    setName(unit.name);
    setPlate(unit.plate);
    setCategoryId(unit.categoryId);
    setActive(unit.active);
    setIsEditing(false);
  }, [unit]);

  function handleSave() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("plate", plate);
    fd.set("categoryId", categoryId);
    fd.set("active", active ? "on" : "false");

    startTransition(() => {
      void (async () => {
        const res = await onUpdate(fd);

        if (res?.error) {
          toast.error(res.error);
          return;
        }

        toast.success(res?.success ?? "Vehicle updated");
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
          text='Edit Vehicle'
          btnType='blackReg'
          type='button'
          onClick={() => setIsEditing(true)}
        />
      </div>
    );
  };

  return (
    <div className={wrapperClass}>
      <Field label='Name'>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className='input'
          disabled={fieldsDisabled}
        />
      </Field>

      <Field label='Plate (optional)'>
        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          className='input'
          disabled={fieldsDisabled}
        />
      </Field>

      <Field label='Category (optional)'>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className='selectBorder'
          disabled={fieldsDisabled}
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
      <label className='h6 fw700'>{label}</label>
      {children}
      {hint ? <div className='miniNote'>{hint}</div> : null}
    </div>
  );
}
