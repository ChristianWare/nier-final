"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  saveDriverProfile,
  type DriverProfileInput,
} from "../../../../../actions/admin/drivers";
import styles from "../AdminDriversPage.module.css";

type Values = Omit<DriverProfileInput, "userId">;

function Field({
  label,
  name,
  value,
  type = "text",
  placeholder,
  hint,
}: {
  label: string;
  name: keyof Values;
  value: string;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className={styles.field}>
      <span className='miniNote'>{label}</span>
      <input
        className='selectBorder'
        name={name}
        type={type}
        defaultValue={value}
        placeholder={placeholder}
      />
      {hint ? <span className='miniNote'>{hint}</span> : null}
    </label>
  );
}

export default function DriverProfileForm({
  userId,
  initial,
}: {
  userId: string;
  initial: Values;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const text = (k: keyof Values) => String(fd.get(k) ?? "");
    const input: DriverProfileInput = {
      userId,
      payPercent: text("payPercent"),
      paidPerRide: fd.get("paidPerRide") === "on",
      active: fd.get("active") === "on",
      phone: text("phone"),
      legalName: text("legalName"),
      mailingAddress: text("mailingAddress"),
      w9ReceivedAt: text("w9ReceivedAt"),
      licenseNumber: text("licenseNumber"),
      licenseExpiresAt: text("licenseExpiresAt"),
      permitExpiresAt: text("permitExpiresAt"),
      insuranceExpiresAt: text("insuranceExpiresAt"),
      backgroundCheckAt: text("backgroundCheckAt"),
      notes: text("notes"),
    };
    startTransition(async () => {
      const res = await saveDriverProfile(input);
      if ("error" in res) {
        setMessage(res.error ?? "Couldn't save.");
        return;
      }
      setMessage("Saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className={styles.formGrid}>
        <Field
          label='Pay rate (% of the ride’s full price)'
          name='payPercent'
          value={initial.payPercent}
          placeholder='e.g. 60'
          hint='Filled in when a ride is completed. Tips go to the driver in full.'
        />
        <Field label='Phone' name='phone' value={initial.phone} type='tel' />
      </div>

      <div className={styles.checkRow}>
        <label>
          <input
            type='checkbox'
            name='paidPerRide'
            defaultChecked={initial.paidPerRide}
          />{" "}
          Paid per ride{" "}
          <span className='miniNote'>
            (turn off for owners or salaried drivers)
          </span>
        </label>
        <label>
          <input
            type='checkbox'
            name='active'
            defaultChecked={initial.active}
          />{" "}
          Active
        </label>
      </div>

      <h3 className='cardTitle h6'>For 1099s</h3>
      <div className={styles.formGrid}>
        <Field label='Legal name' name='legalName' value={initial.legalName} />
        <Field
          label='Mailing address'
          name='mailingAddress'
          value={initial.mailingAddress}
        />
        <Field
          label='W-9 received'
          name='w9ReceivedAt'
          value={initial.w9ReceivedAt}
          type='date'
          hint='Keep the W-9 itself with your accountant; no tax ID is stored here.'
        />
      </div>

      <h3 className='cardTitle h6'>Documents</h3>
      <div className={styles.formGrid}>
        <Field
          label='License number'
          name='licenseNumber'
          value={initial.licenseNumber}
        />
        <Field
          label='License expires'
          name='licenseExpiresAt'
          value={initial.licenseExpiresAt}
          type='date'
        />
        <Field
          label='Chauffeur permit expires'
          name='permitExpiresAt'
          value={initial.permitExpiresAt}
          type='date'
        />
        <Field
          label='Insurance expires'
          name='insuranceExpiresAt'
          value={initial.insuranceExpiresAt}
          type='date'
        />
        <Field
          label='Background check date'
          name='backgroundCheckAt'
          value={initial.backgroundCheckAt}
          type='date'
        />
      </div>

      <label className={styles.field} style={{ marginTop: "1.2rem" }}>
        <span className='miniNote'>Notes</span>
        <textarea
          className='selectBorder'
          name='notes'
          rows={3}
          defaultValue={initial.notes}
        />
      </label>

      <div className={styles.formFoot}>
        <button className='rangeSubmitBtn' type='submit' disabled={isPending}>
          {isPending ? "Saving…" : "Save driver"}
        </button>
        {message ? <span className='miniNote'>{message}</span> : null}
      </div>
    </form>
  );
}
