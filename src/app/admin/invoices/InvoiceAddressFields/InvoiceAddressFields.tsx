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

function isBlank(p: AddressParts): boolean {
  return !p.street.trim() && !p.city.trim() && !p.state && !p.zip.trim();
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
 * Street / city / state / ZIP fields that read and write one address string.
 * The string stays empty until every field is filled in.
 */
function AddressPartsInput({
  idPrefix,
  value,
  onChange,
  optional = false,
  completeHint,
  blankHint,
}: {
  idPrefix: string;
  value: string;
  onChange: (v: string) => void;
  /** Blank is fine; a half-filled address shows a warning instead. */
  optional?: boolean;
  completeHint?: string;
  /** Shown while an optional address is left blank. */
  blankHint?: string;
}) {
  // The fields, plus the last text we handed up. When the prop changes from
  // outside (e.g. the edit dialog opening), re-read it into the fields.
  const [parts, setParts] = useState<AddressParts>(() => parseAddress(value));
  const [emitted, setEmitted] = useState(value);
  if (value !== emitted) {
    setEmitted(value);
    setParts(parseAddress(value));
  }

  function updatePart(patch: Partial<AddressParts>) {
    const next = { ...parts, ...patch };
    setParts(next);
    const text = composeAddress(next);
    setEmitted(text);
    onChange(text);
  }

  const blank = isBlank(parts);
  const missing = missingParts(parts);

  let hint: string | null = null;
  let warn = false;
  if (missing.length === 0) {
    hint = completeHint ?? null;
  } else if (optional && blank) {
    hint = blankHint ?? null;
  } else if (optional) {
    hint = `Finish the address or clear it. A partial address won't be printed (still needed: ${missing.join(", ")}).`;
    warn = true;
  } else {
    hint = `Still needed: ${missing.join(", ")}.`;
  }

  return (
    <>
      <div className={styles.addressGrid}>
        <div className={`${styles.subField} ${styles.streetField}`}>
          <label className={styles.subLabel} htmlFor={`${idPrefix}Street`}>
            Street address
          </label>
          <input
            id={`${idPrefix}Street`}
            className={styles.input}
            value={parts.street}
            onChange={(e) => updatePart({ street: e.target.value })}
            placeholder='123 Main St, Suite 200'
            autoComplete='off'
          />
        </div>

        <div className={styles.subField}>
          <label className={styles.subLabel} htmlFor={`${idPrefix}City`}>
            City
          </label>
          <input
            id={`${idPrefix}City`}
            className={styles.input}
            value={parts.city}
            onChange={(e) => updatePart({ city: e.target.value })}
            placeholder='Phoenix'
            autoComplete='off'
          />
        </div>

        <div className={styles.subField}>
          <label className={styles.subLabel} htmlFor={`${idPrefix}State`}>
            State
          </label>
          <select
            id={`${idPrefix}State`}
            className={styles.select}
            value={parts.state}
            onChange={(e) => updatePart({ state: e.target.value })}
          >
            <option value=''>Select…</option>
            {US_STATES.map((st) => (
              <option key={st.code} value={st.code}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.subField}>
          <label className={styles.subLabel} htmlFor={`${idPrefix}Zip`}>
            ZIP
          </label>
          <input
            id={`${idPrefix}Zip`}
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
      {hint && (
        <span className={warn ? `${styles.hint} ${styles.warn}` : styles.hint}>
          {hint}
        </span>
      )}
    </>
  );
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

  function chooseCustom() {
    // Start from the default so a small change (new suite) is quick.
    if (!fromAddress.trim() && defaultFromAddress) {
      onFromAddressChange(composeAddress(parseAddress(defaultFromAddress)));
    }
    onFromAddressModeChange("custom");
  }

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
          <AddressPartsInput
            idPrefix='from'
            value={fromAddress}
            onChange={onFromAddressChange}
            completeHint='Your phone and email still print underneath.'
          />
        )}
      </div>

      {/* ── Recipient address ── */}
      <div className={styles.field}>
        <span className={styles.label}>Customer&apos;s address (optional)</span>
        <AddressPartsInput
          idPrefix='billTo'
          value={billToAddress}
          onChange={onBillToAddressChange}
          optional
          completeHint="Printed under the customer's name in the Bill To section."
          blankHint='Leave blank to show just their name and contact details.'
        />
      </div>
    </div>
  );
}
