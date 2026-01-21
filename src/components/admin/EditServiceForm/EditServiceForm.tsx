"use client";

import styles from "./EditServiceForm.module.css";
import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { slugify } from "@/lib/slugify";
import Modal from "@/components/shared/Modal/Modal";

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

  const [confirmOpen, setConfirmOpen] = useState(false);

  const showAirportConfig = airportLeg !== "NONE";

  function toggleAirport(id: string) {
    setSelectedAirportIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

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

  return (
    <>
      <div className={styles.form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();

            if (showAirportConfig && selectedAirportIds.length === 0) {
              toast.error(
                "Select at least one airport for an airport service.",
              );
              return;
            }

            const formData = new FormData(e.currentTarget);

            formData.set("airportLeg", airportLeg);
            selectedAirportIds.forEach((id) =>
              formData.append("airportIds", id),
            );

            startTransition(async () => {
              const res = await onUpdate(formData);
              if (res?.error) {
                toast.error(res.error);
                return;
              }
              toast.success("Service updated");
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
                const next = e.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugify(next));
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
                            disabled={isPending}
                          />
                          <div className={styles.airportRowText}>
                            <div className={styles.airportName}>
                              {a.name}{" "}
                              <span className={styles.iata}>({a.iata})</span>
                            </div>
                            <div className={styles.airportAddr}>
                              {a.address}
                            </div>
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
                    onClick={() =>
                      setSelectedAirportIds(airports.map((a) => a.id))
                    }
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
                defaultValue={centsToDollarsInput(service.baseFeeCents)}
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
                defaultValue={centsToDollarsInput(service.perMileCents)}
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
                defaultValue={centsToDollarsInput(service.perMinuteCents)}
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
                defaultValue={centsToDollarsInput(service.perHourCents)}
                className='inputBorder'
                disabled={isPending}
              />
            </Field>

            <Field
              label='Sort order'
              hint='Lower shows first. Use 10, 20, 30...'
            >
              <input
                type='number'
                step='1'
                inputMode='numeric'
                name='sortOrder'
                defaultValue={String(service.sortOrder ?? 0)}
                className='inputBorder'
                disabled={isPending}
              />
            </Field>
          </Grid2>

          <label className={styles.labelinputcheckbox}>
            <input
              type='checkbox'
              name='active'
              defaultChecked={service.active}
              disabled={isPending}
              className={styles.labelinputcheckbox}
            />
            <span className='emptyTitle'>Active</span>
          </label>

          <div className={styles.btnContainer}>
            <button type='submit' className='primaryBtn' disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>

        <div className={styles.airportBox}>
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
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label className='cardTitle h5'>{label}</label>
      <select
        name={name}
        defaultValue={defaultValue ?? options[0]}
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
