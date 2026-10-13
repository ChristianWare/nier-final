"use client";

import Link from "next/link";
import styles from "./InvoiceAddressFields.module.css";
import {
  ADDRESS_MAX_LINES,
  addressLines,
  type FromAddressMode,
} from "@/lib/invoice/invoiceAddress";

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
      onFromAddressChange(defaultFromAddress);
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
          <>
            <textarea
              className={styles.textarea}
              value={fromAddress}
              onChange={(e) => onFromAddressChange(e.target.value)}
              placeholder={"123 Main St, Suite 200\nPhoenix, AZ 85004"}
              rows={3}
            />
            <span className={styles.hint}>
              One line per line, up to {ADDRESS_MAX_LINES}. Your phone and email
              still print underneath.
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
          placeholder={"Company or attention line\nStreet address\nCity, State ZIP"}
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
