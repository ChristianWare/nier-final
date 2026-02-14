"use client";

import styles from "./EditServiceForm.module.css";
import React, { useMemo, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { slugify } from "@/lib/slugify";
import Modal from "@/components/shared/Modal/Modal";
import Button from "@/components/shared/Button/Button";
import { useDirtyForm } from "@/components/shared/DirtyFormProvider/DirtyFormProvider";

export type ActionResult = { success?: string; error?: string };

type AirportDTO = {
  id: string;
  name: string;
  iata: string;
  address: string;
};

type AirportLegUI = "NONE" | "PICKUP" | "DROPOFF";
type PricingStrategyUI = "POINT_TO_POINT" | "HOURLY" | "FLAT";

type ServiceFeeDTO = {
  id: string;
  label: string;
  amountCents: number;
};

type FeeUI = {
  id: string;
  label: string;
  amount: string;
};

type ServiceTypeDTO = {
  id: string;
  name: string;
  slug: string;
  pricingStrategy: PricingStrategyUI;
  minFareCents: number;
  baseFeeCents: number;
  perMileCents: number;
  perMinuteCents: number;
  perHourCents: number;
  minHours: number;
  sortOrder: number;
  active: boolean;
  airportLeg: AirportLegUI;
  airportIds: string[];
  fees: ServiceFeeDTO[];
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

function initialFees(fees: ServiceFeeDTO[]): FeeUI[] {
  return fees.map((f) => ({
    id: f.id,
    label: f.label,
    amount: centsToDollarsInput(f.amountCents),
  }));
}

export default function EditServiceForm({
  service,
  airports,
  onUpdate,
  onDelete,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /* ── Lock / Unlock state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  /* ── Controlled field state ── */
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
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategyUI>(
    service.pricingStrategy,
  );
  const [minHours, setMinHours] = useState(String(service.minHours ?? 0));
  const [sortOrder, setSortOrder] = useState(String(service.sortOrder ?? 0));
  const [active, setActive] = useState(service.active);
  const [fees, setFees] = useState<FeeUI[]>(initialFees(service.fees));
  const [confirmOpen, setConfirmOpen] = useState(false);

  const showAirportConfig = airportLeg !== "NONE";
  const showMinHours = pricingStrategy === "HOURLY";

  /* ── Lock helpers ── */
  const isLocked = !isEditing;
  const fieldsDisabled = isLocked || isPending;

  const wrapperClass = justSaved
    ? `${styles.form} ${styles.sectionSaved}`
    : isEditing
      ? `${styles.form} ${styles.sectionEditing}`
      : `${styles.form} ${styles.sectionLocked}`;

  /* ── Dirty tracking ── */
  const isDirty = useMemo(() => {
    if (name !== service.name) return true;
    if (slug !== service.slug) return true;
    if (pricingStrategy !== service.pricingStrategy) return true;
    if (airportLeg !== (service.airportLeg ?? "NONE")) return true;
    if (sortOrder !== String(service.sortOrder ?? 0)) return true;
    if (minHours !== String(service.minHours ?? 0)) return true;
    if (active !== service.active) return true;

    const origIds = [...(service.airportIds ?? [])].sort();
    const currIds = [...selectedAirportIds].sort();
    if (
      origIds.length !== currIds.length ||
      origIds.some((id, i) => id !== currIds[i])
    )
      return true;

    const origFees = service.fees;
    if (fees.length !== origFees.length) return true;
    for (let i = 0; i < fees.length; i++) {
      const orig = origFees[i];
      const curr = fees[i];
      if (!orig || curr.label !== orig.label) return true;
      if (curr.amount !== centsToDollarsInput(orig.amountCents)) return true;
    }

    return false;
  }, [
    name,
    slug,
    pricingStrategy,
    airportLeg,
    selectedAirportIds,
    sortOrder,
    minHours,
    active,
    fees,
    service,
  ]);

  useDirtyForm("service-settings", isEditing && isDirty, "service-form");

  /* ── Cancel — reset all fields ── */
  const handleCancel = useCallback(() => {
    setName(service.name);
    setSlug(service.slug);
    setSlugTouched(false);
    setAirportLeg(service.airportLeg ?? "NONE");
    setSelectedAirportIds(
      Array.isArray(service.airportIds) ? service.airportIds : [],
    );
    setPricingStrategy(service.pricingStrategy);
    setMinHours(String(service.minHours ?? 0));
    setSortOrder(String(service.sortOrder ?? 0));
    setActive(service.active);
    setFees(initialFees(service.fees));
    setIsEditing(false);
  }, [service]);

  /* ── Save ── */
  function handleSave() {
    if (showAirportConfig && selectedAirportIds.length === 0) {
      toast.error("Select at least one airport for an airport service.");
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("slug", slug);
    formData.set("airportLeg", airportLeg);
    formData.set("pricingStrategy", pricingStrategy);
    formData.set("minHours", minHours);
    formData.set("sortOrder", sortOrder);
    if (active) formData.set("active", "on");

    // Hidden zero values for pricing fields managed on vehicle categories
    formData.set("minFare", "0");
    formData.set("baseFee", "0");
    formData.set("perMile", "0");
    formData.set("perMinute", "0");
    formData.set("perHour", "0");

    selectedAirportIds.forEach((id) => formData.append("airportIds", id));

    fees.forEach((fee) => {
      if (fee.label.trim() && fee.amount.trim()) {
        formData.append("feeLabel", fee.label.trim());
        formData.append("feeAmount", fee.amount.trim());
      }
    });

    startTransition(() => {
      void (async () => {
        const res = await onUpdate(formData);
        if (res?.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Service updated");
        setJustSaved(true);
        setTimeout(() => {
          setJustSaved(false);
          setIsEditing(false);
        }, 2000);
        router.refresh();
      })();
    });
  }

  /* ── Airport helpers ── */
  function toggleAirport(id: string) {
    setSelectedAirportIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  /* ── Fee helpers ── */
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

  /* ── Delete ── */
  function runDelete() {
    startTransition(async () => {
      const res = await onDelete();
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Service deleted");
      setConfirmOpen(false);
      router.push("/admin/services");
      router.refresh();
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
          text='Edit Service'
          btnType='blackReg'
          type='button'
          onClick={() => setIsEditing(true)}
        />
      </div>
    );
  };

  return (
    <>
      <div id='service-form' className={wrapperClass}>
        <Field label='Name'>
          <input
            value={name}
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (!slugTouched) setSlug(slugify(next));
            }}
            className='input'
            disabled={fieldsDisabled}
          />
        </Field>

        <Field
          label='Slug (optional)'
          hint='Auto-fills from name. You can override it if needed.'
        >
          <div style={{ display: "grid", gap: 8 }}>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder={suggestedSlug || "auto-generated"}
              className='input'
              disabled={fieldsDisabled}
            />

            {isEditing && (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type='button'
                  onClick={() => {
                    setSlugTouched(false);
                    setSlug(slugify(name));
                  }}
                  className='tab tabActive'
                  disabled={fieldsDisabled}
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
            )}
          </div>
        </Field>

        <Field
          label='Service kind'
          hint='Choose "Standard" unless pickup or dropoff should be selected from an airport list.'
        >
          <select
            className='input'
            value={airportLeg}
            onChange={(e) => {
              const next = e.target.value as AirportLegUI;
              setAirportLeg(next);
              if (next === "NONE") setSelectedAirportIds([]);
            }}
            disabled={fieldsDisabled}
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
                          disabled={fieldsDisabled}
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

              {isEditing && (
                <div className={styles.airportActions}>
                  <button
                    type='button'
                    className='tab tabActive'
                    disabled={fieldsDisabled || airports.length === 0}
                    onClick={() =>
                      setSelectedAirportIds(airports.map((a) => a.id))
                    }
                  >
                    Select all
                  </button>
                  <button
                    type='button'
                    className='tab'
                    disabled={fieldsDisabled}
                    onClick={() => setSelectedAirportIds([])}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </Field>
        ) : null}

        <Field label='Pricing strategy'>
          <select
            value={pricingStrategy}
            onChange={(e) =>
              setPricingStrategy(e.target.value as PricingStrategyUI)
            }
            className='selectBorder'
            disabled={fieldsDisabled}
          >
            <option value='POINT_TO_POINT'>POINT_TO_POINT</option>
            <option value='HOURLY'>HOURLY</option>
            <option value='FLAT'>FLAT</option>
          </select>
        </Field>

        <Grid2>
          {showMinHours && (
            <Field
              label='Minimum hours'
              hint='Service-level minimum. Vehicle minimums may also apply.'
            >
              <input
                type='number'
                step='1'
                inputMode='numeric'
                value={minHours}
                onChange={(e) => setMinHours(e.target.value)}
                min='0'
                className='input'
                disabled={fieldsDisabled}
              />
            </Field>
          )}

          <Field label='Sort order' hint='Lower shows first. Use 10, 20, 30...'>
            <input
              type='number'
              step='1'
              inputMode='numeric'
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className='input'
              disabled={fieldsDisabled}
            />
          </Field>
        </Grid2>

        <div className='miniNote'>
          Per-mile, per-hour, and base fare pricing is managed on each{" "}
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
                No fees added yet.
                {isEditing && " Click below to add a fee."}
              </div>
            ) : (
              <div className={styles.feesList}>
                {fees.map((fee) => (
                  <div key={fee.id} className={styles.feeRow}>
                    <div className={styles.feeInputs}>
                      <input
                        type='text'
                        placeholder='Fee name (e.g., Airport Fee)'
                        value={fee.label}
                        onChange={(e) =>
                          updateFee(fee.id, "label", e.target.value)
                        }
                        className='input'
                        disabled={fieldsDisabled}
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
                          className='input'
                          style={{ paddingLeft: "24px" }}
                          disabled={fieldsDisabled}
                        />
                      </div>
                    </div>
                    {isEditing && (
                      <button
                        type='button'
                        onClick={() => removeFee(fee.id)}
                        className={styles.feeRemoveBtn}
                        disabled={fieldsDisabled}
                        title='Remove fee'
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isEditing && (
              <div className={styles.airportActions}>
                <button
                  type='button'
                  className='tab tabActive'
                  onClick={addFee}
                  disabled={fieldsDisabled}
                >
                  + Add fee
                </button>
                {fees.length > 0 && (
                  <button
                    type='button'
                    className='tab'
                    onClick={() => setFees([])}
                    disabled={fieldsDisabled}
                  >
                    Clear all
                  </button>
                )}
              </div>
            )}

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
                {fees.filter((f) => f.label.trim() && f.amount.trim())
                  .length === 0 && (
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
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={fieldsDisabled}
            className={styles.labelinputcheckbox}
          />
          <span className='emptyTitle'>Active</span>
        </label>

        {renderActions()}
      </div>
      {/* Danger zone — always visible below actions */}
      <div className={styles.dangerZone}>
        <div style={{ display: "grid", gap: 10 }}>
          <div className='cardTitle h5'>Danger zone</div>
          <div className='miniNote'>
            Deleting removes this service permanently.
          </div>
          <div className={styles.btnContainer}>
            <button
              type='button'
              className='dangerBtn'
              onClick={() => setConfirmOpen(true)}
              disabled={isPending}
            >
              Delete service
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={confirmOpen}
        onClose={() => {
          if (isPending) return;
          setConfirmOpen(false);
        }}
      >
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Delete this service?</div>

          <p className='paragraph'>
            This will permanently delete the service and remove it from your
            booking flow.
          </p>

          <div className='miniNote'>This action cannot be undone.</div>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='primaryBtn'
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </button>

            <button
              type='button'
              className='dangerBtn'
              onClick={runDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Confirm delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
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
      <label className='emptyTitle'>{label}</label>
      {children}
      {hint ? <div className='miniNote'>{hint}</div> : null}
    </div>
  );
}
