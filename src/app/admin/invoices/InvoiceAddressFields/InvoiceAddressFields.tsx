"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./InvoiceAddressFields.module.css";
import {
  addressLines,
  type FromAddressMode,
} from "@/lib/invoice/invoiceAddress";

const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const STATE_CODES = new Set(US_STATES.map((s) => s.code));

type AddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

const EMPTY_PARTS: AddressParts = { street: "", city: "", state: "", zip: "" };

/**
 * Read saved address text ("street\nCity, ST 85268") back into fields.
 * Accepts "AZ." and missing commas so older or default addresses still fill in.
 */
function parseAddress(text: string): AddressParts {
  const lines = addressLines(text);
  if (lines.length === 0) return { ...EMPTY_PARTS };

  const last = lines[lines.length - 1];
  const m = last.match(/^(.*?)[,\s]+([A-Za-z]{2})\.?\s+(\d{5}(?:-\d{4})?)$/);
  if (m && STATE_CODES.has(m[2].toUpperCase())) {
    return {
      street: lines.slice(0, -1).join(", "),
      city: m[1].trim().replace(/,$/, ""),
      state: m[2].toUpperCase(),
      zip: m[3],
    };
  }
  // Not in a recognisable format: keep it all as the street line.
  return { ...EMPTY_PARTS, street: lines.join(", ") };
}

/** Build the saved text. Empty until every field is filled in. */
function composeAddress(p: AddressParts): string {
  const street = p.street.trim();
  const city = p.city.trim();
  const zip = p.zip.trim();
  if (!street || !city || !p.state || !/^\d{5}(-\d{4})?$/.test(zip)) return "";
  return `${street}\n${city}, ${p.state} ${zip}`;
}

function missingParts(p: AddressParts): string[] {
  const missing: string[] = [];
  if (!p.street.trim()) missing.push("street");
  if (!p.city.trim()) missing.push("city");
  if (!p.state) missing.push("state");
  if (!/^\d{5}(-\d{4})?$/.test(p.zip.trim())) missing.push("5-digit ZIP");
  return missing;
}

/**
 * Sender ("from") and bill-to address fields for admin invoices.
 * Used by the new-invoice form and the edit-addresses dialog.
 */
export default function InvoiceAddressFields({
  defaultFromAddress,
  fromAddressMode,
  onFromAddressModeChange,
  fromAddress,
  onFromAddressChange,
  billToAddress,
  onBillToAddressChange,
}: {
  defaultFromAddress: string;
  fromAddressMode: FromAddressMode;
  onFromAddressModeChange: (mode: FromAddressMode) => void;
  fromAddress: string;
  onFromAddressChange: (v: string) => void;
  billToAddress: string;
  onBillToAddressChange: (v: string) => void;
}) {
  const defaultLines = addressLines(defaultFromAddress);

  // The fields, plus the last text we handed up. When the prop changes from
  // outside (e.g. the edit dialog opening), re-read it into the fields.
  const [parts, setParts] = useState<AddressParts>(() =>
    parseAddress(fromAddress),
  );
  const [emitted, setEmitted] = useState(fromAddress);
  if (fromAddress !== emitted) {
    setEmitted(fromAddress);
    setParts(parseAddress(fromAddress));
  }

  function emit(next: AddressParts) {
    setParts(next);
    const text = composeAddress(next);
    setEmitted(text);
    onFromAddressChange(text);
  }

  function updatePart(patch: Partial<AddressParts>) {
    emit({ ...parts, ...patch });
  }

  function chooseCustom() {
    // Start from the default so a small change (new suite) is quick.
    if (!fromAddress.trim() && defaultFromAddress) {
      emit(parseAddress(defaultFromAddress));
    }
    onFromAddressModeChange("custom");
  }

  const missing = missingParts(parts);

  return (
    <div className={styles.wrap}>
      {/* ── Sender address ── */}
      <div className={styles.field}>
        <span className={styles.label}>Your address on the invoice</span>
        <div className={styles.toggle} role='radiogroup'>
          <button
            type='button'
            role='radio'
            aria-checked={fromAddressMode === "default"}
            className={`${styles.toggleBtn} ${fromAddressMode === "default" ? styles.toggleActive : ""}`}
            onClick={() => onFromAddressModeChange("default")}
          >
            Use default address
          </button>
          <button
            type='button'
            role='radio'
            aria-checked={fromAddressMode === "custom"}
            className={`${styles.toggleBtn} ${fromAddressMode === "custom" ? styles.toggleActive : ""}`}
            onClick={chooseCustom}
          >
            Use a different address
          </button>
        </div>

        {fromAddressMode === "default" ? (
          defaultLines.length > 0 ? (
            <div className={styles.preview}>
              {defaultLines.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
              <span className={styles.hint}>
                From{" "}
                <Link href='/admin/company' className={styles.link}>
                  Company Settings
                </Link>
                . A copy is saved on this invoice, so changing settings later
                won&apos;t change it.
              </span>
            </div>
          ) : (
            <p className={styles.hint}>
              No office address is set in{" "}
              <Link href='/admin/company' className={styles.link}>
                Company Settings
              </Link>
              , so none will be printed. Use a different address to add one.
            </p>
          )
        ) : (
          <>
            <div className={styles.addressGrid}>
              <div className={`${styles.subField} ${styles.streetField}`}>
                <label className={styles.subLabel} htmlFor='fromStreet'>
                  Street address
                </label>
                <input
                  id='fromStreet'
                  className={styles.input}
                  value={parts.street}
                  onChange={(e) => updatePart({ street: e.target.value })}
                  placeholder='123 Main St, Suite 200'
                  autoComplete='off'
                />
              </div>

              <div className={styles.subField}>
                <label className={styles.subLabel} htmlFor='fromCity'>
                  City
                </label>
                <input
                  id='fromCity'
                  className={styles.input}
                  value={parts.city}
                  onChange={(e) => updatePart({ city: e.target.value })}
                  placeholder='Phoenix'
                  autoComplete='off'
                />
              </div>

              <div className={styles.subField}>
                <label className={styles.subLabel} htmlFor='fromState'>
                  State
                </label>
                <select
                  id='fromState'
                  className={styles.select}
                  value={parts.state}
                  onChange={(e) => updatePart({ state: e.target.value })}
                >
                  <option value=''>Select…</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.subField}>
                <label className={styles.subLabel} htmlFor='fromZip'>
                  ZIP
                </label>
                <input
                  id='fromZip'
                  className={styles.input}
                  inputMode='numeric'
                  value={parts.zip}
                  onChange={(e) =>
                    updatePart({
                      zip: e.target.value.replace(/[^\d-]/g, "").slice(0, 10),
                    })
                  }
                  placeholder='85004'
                  autoComplete='off'
                />
              </div>
            </div>
            <span className={styles.hint}>
              {missing.length > 0
                ? `Still needed: ${missing.join(", ")}.`
                : "Your phone and email still print underneath."}
            </span>
          </>
        )}
      </div>

      {/* ── Recipient address ── */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor='billToAddress'>
          Customer&apos;s address (optional)
        </label>
        <textarea
          id='billToAddress'
          className={styles.textarea}
          value={billToAddress}
          onChange={(e) => onBillToAddressChange(e.target.value)}
          placeholder={
            "Company or attention line\nStreet address\nCity, State ZIP"
          }
          rows={3}
        />
        <span className={styles.hint}>
          Printed under the customer&apos;s name in the Bill To section. Leave
          blank to show just their name and contact details.
        </span>
      </div>
    </div>
  );
}
