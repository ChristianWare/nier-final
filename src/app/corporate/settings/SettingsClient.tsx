"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./CorporateSettings.module.css";
import {
  updateBillingAddress,
  updateBillingEmail,
  updateContactInfo,
} from "../../../../actions/corporate/corporateSettingsActions";

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

type Account = {
  id: string;
  name: string;
  billingEmail: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCycle: string;
  paymentMethod: string;
  paymentTerms: string;
  discountPercent: number | null;
  monthlyLimitCents: number | null;
  status: string;
  createdAt: string;
};

type Contact = {
  id: string;
  role: string;
  title: string;
  phone: string;
  userName: string;
  userEmail: string;
};

type Props = {
  account: Account;
  contact: Contact;
};

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function SettingsClient({ account, contact }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ─── Billing address form ───
  const [address, setAddress] = useState(account.billingAddress);
  const [city, setCity] = useState(account.billingCity);
  const [state, setState] = useState(account.billingState);
  const [zip, setZip] = useState(account.billingZip);

  // ─── Billing email form ───
  const [billingEmail, setBillingEmail] = useState(account.billingEmail);

  // ─── Contact info form ───
  const [title, setTitle] = useState(contact.title);
  const [phone, setPhone] = useState(contact.phone);

  function handleSaveAddress() {
    startTransition(async () => {
      const res = await updateBillingAddress({
        billingAddress: address,
        billingCity: city,
        billingState: state,
        billingZip: zip,
      });
      if (res.ok) {
        toast.success("Billing address updated.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to save.");
      }
    });
  }

  function handleSaveEmail() {
    startTransition(async () => {
      const res = await updateBillingEmail(billingEmail);
      if (res.ok) {
        toast.success("Billing email updated.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to save.");
      }
    });
  }

  function handleSaveContact() {
    startTransition(async () => {
      const res = await updateContactInfo({ title, phone });
      if (res.ok) {
        toast.success("Contact info updated.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to save.");
      }
    });
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <h2 className="heading h3">Settings</h2>
        <p className={styles.meta}>
          Manage your corporate account settings. Payment terms are set by Nier
          Transportation.
        </p>
      </div>

      <div className={styles.grid}>
        {/* ─── Account Overview (read-only) ─── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className="cardTitle">Account Overview</h3>
          </div>
          <div className={styles.keyValList}>
            <KeyVal k="Company Name" v={account.name} />
            <KeyVal k="Account Status" v={formatLabel(account.status)} />
            <KeyVal
              k="Member Since"
              v={new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
              }).format(new Date(account.createdAt))}
            />
            <KeyVal k="Primary Contact" v={contact.userName} />
            <KeyVal k="Login Email" v={contact.userEmail} />
          </div>
        </div>

        {/* ─── Payment Terms (read-only) ─── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className="cardTitle">Payment Terms</h3>
            {/* <span className={styles.readOnlyBadge}>Set by Nier</span> */}
          </div>
          <div className={styles.keyValList}>
            <KeyVal
              k="Billing Cycle"
              v={formatLabel(account.billingCycle)}
            />
            <KeyVal
              k="Payment Method"
              v={formatLabel(account.paymentMethod)}
            />
            <KeyVal
              k="Payment Terms"
              v={formatLabel(account.paymentTerms)}
            />
            <KeyVal
              k="Discount"
              v={
                account.discountPercent
                  ? `${account.discountPercent}%`
                  : "None"
              }
            />
            <KeyVal
              k="Monthly Limit"
              v={
                account.monthlyLimitCents
                  ? formatMoney(account.monthlyLimitCents)
                  : "No limit"
              }
            />
          </div>
          <p className={styles.cardNote}>
            Contact Nier Transportation to request changes to payment terms.
          </p>
        </div>

        {/* ─── Billing Email (editable) ─── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className="cardTitle">Billing Email</h3>
          </div>
          <p className={styles.cardSub}>
            Invoices and billing notifications are sent to this address.
          </p>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Email</label>
              <input
                type="email"
                className='inputBorder'
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.cardActions}>
            <button
              className="neutralBtn"
              onClick={handleSaveEmail}
              disabled={isPending || billingEmail === account.billingEmail}
            >
              {isPending ? "Saving…" : "Save Email"}
            </button>
          </div>
        </div>

        {/* ─── Billing Address (editable) ─── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className="cardTitle">Billing Address</h3>
          </div>
          <div className={styles.formGrid}>
            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Street Address</label>
              <input
                type="text"
                className='inputBorder'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>City</label>
              <input
                type="text"
                className='inputBorder'
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Phoenix"
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>State</label>
              <input
                type="text"
                className='inputBorder'
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="AZ"
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>ZIP</label>
              <input
                type="text"
                className='inputBorder'
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="85001"
              />
            </div>
          </div>
          <div className={styles.cardActions}>
            <button
              className="neutralBtn"
              onClick={handleSaveAddress}
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Save Address"}
            </button>
          </div>
        </div>

        {/* ─── Contact Info (editable) ─── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className="cardTitle">Your Contact Info</h3>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Title / Role</label>
              <input
                type="text"
                className='inputBorder'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Office Manager"
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Phone</label>
              <input
                type="tel"
                className='inputBorder'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div className={styles.cardActions}>
            <button
              className="neutralBtn"
              onClick={handleSaveContact}
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Save Contact Info"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Key-Value row
   ───────────────────────────────────────────── */

function KeyVal({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.keyVal}>
      <span className={styles.keyLabel}>{k}</span>
      <span className={styles.keyValue}>{v}</span>
    </div>
  );
}