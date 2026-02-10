"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import styles from "./CorporateSettings.module.css";
import Modal from "@/components/shared/Modal/Modal";
import {
  updateBillingAddress,
  updateBillingEmail,
  updateContactInfo,
  createCardSetupSession,
  removeCardOnFile,
} from "../../../../actions/corporate/corporateSettingsActions";
import Button from "@/components/shared/Button/Button";

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

type CardOnFile = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
} | null;

type Props = {
  account: Account;
  contact: Contact;
  cardOnFile: CardOnFile;
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

function formatCardBrand(brand: string) {
  const brands: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return brands[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function SettingsClient({
  account,
  contact,
  cardOnFile,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // ─── Show toast on return from Stripe ───
  useEffect(() => {
    if (searchParams.get("card_updated") === "true") {
      toast.success("Card updated successfully.");
      // Clean up URL
      window.history.replaceState({}, "", "/corporate/settings");
    }
    if (searchParams.get("card_cancelled") === "true") {
      toast("Card setup cancelled.", { icon: "ℹ️" });
      window.history.replaceState({}, "", "/corporate/settings");
    }
  }, [searchParams]);

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

  // ─── Remove card modal ───
  const [removeModalOpen, setRemoveModalOpen] = useState(false);

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

  function handleAddOrUpdateCard() {
    startTransition(async () => {
      const res = await createCardSetupSession();
      if (res.ok && res.url) {
        window.location.href = res.url;
      } else {
        toast.error(res.error ?? "Failed to start card setup.");
      }
    });
  }

  function handleRemoveCard() {
    startTransition(async () => {
      const res = await removeCardOnFile();
      if (res.ok) {
        toast.success("Card removed.");
        setRemoveModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed to remove card.");
      }
    });
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <h2 className='heading h3'>Settings</h2>
        <p className={styles.meta}>
          Manage your corporate account settings. Payment terms are set by Nier
          Transportation.
        </p>
      </div>

      <div className={styles.grid}>
        {/* ─── Account Overview (read-only) ─── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className='cardTitle h4'>Account Overview</h3>
          </div>
          <div className={styles.keyValList}>
            <KeyVal k='Company Name' v={account.name} />
            <KeyVal k='Account Status' v={formatLabel(account.status)} />
            <KeyVal
              k='Member Since'
              v={new Intl.DateTimeFormat("en-US", {
                month: "long",
                year: "numeric",
              }).format(new Date(account.createdAt))}
            />
            <KeyVal k='Primary Contact' v={contact.userName} />
            <KeyVal k='Login Email' v={contact.userEmail} />
          </div>
        </div>

        {/* ─── Payment Terms (read-only) ─── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className='cardTitle h4'>Payment Terms</h3>
          </div>
          <div className={styles.keyValList}>
            <KeyVal k='Billing Cycle' v={formatLabel(account.billingCycle)} />
            <KeyVal k='Payment Method' v={formatLabel(account.paymentMethod)} />
            <KeyVal k='Payment Terms' v={formatLabel(account.paymentTerms)} />
            <KeyVal
              k='Discount'
              v={
                account.discountPercent ? `${account.discountPercent}%` : "None"
              }
            />
            <KeyVal
              k='Monthly Limit'
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

        {/* ─── Card on File ─── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className='cardTitle h4'>Card on File</h3>
          </div>

          {cardOnFile ? (
            <>
              <div className={styles.cardOnFileDisplay}>
                <div className={styles.cardIcon}>
                  <CardBrandIcon brand={cardOnFile.brand} />
                </div>
                <div className={styles.cardDetails}>
                  <span className={styles.cardBrandLine}>
                    {formatCardBrand(cardOnFile.brand)} ending in{" "}
                    <strong>{cardOnFile.last4}</strong>
                  </span>
                  <span className={styles.cardExpiry}>
                    Expires {String(cardOnFile.expMonth).padStart(2, "0")}/
                    {cardOnFile.expYear}
                  </span>
                </div>
              </div>
              <div className={styles.cardActions}>
                <Button
                  disabled={isPending}
                  type='button'
                  text={isPending ? "Redirecting…" : "Update Card"}
                  btnType='greenReg'
                  onClick={handleAddOrUpdateCard}
                />
                <Button
                  disabled={isPending}
                  type='button'
                  text='Remove Card'
                  btnType='blackReg'
                  onClick={() => setRemoveModalOpen(true)}
                />
                {/* <button
                  className='neutralBtn'
                  onClick={handleAddOrUpdateCard}
                  disabled={isPending}
                >
                  {isPending ? "Redirecting…" : "Update Card"}
                </button>
                <button
                  className='dangerBtn'
                  onClick={() => setRemoveModalOpen(true)}
                  disabled={isPending}
                  style={{ fontSize: "1.3rem" }}
                >
                  Remove Card
                </button> */}
              </div>
            </>
          ) : (
            <>
              <div className={styles.noCardMessage}>
                <p className='subheading'>
                  No card on file. Add a credit card to enable automatic
                  payments for your invoices.
                </p>
              </div>
              <div className={styles.cardActions}>
                {/* <button
                  className='neutralBtn'
                  onClick={handleAddOrUpdateCard}
                  disabled={isPending}
                >
                  {isPending ? "Redirecting…" : "Add Credit Card"}
                </button> */}
                <Button
                  type='button'
                  text={isPending ? "Redirecting…" : "Add Credit Card"}
                  btnType='greenReg'
                  disabled={isPending}
                  onClick={handleAddOrUpdateCard}
                />
              </div>
            </>
          )}

          <p className={styles.cardNote}>
            Card information is securely stored by Stripe. Nier Transportation
            never sees your full card number.
          </p>
        </div>

        {/* ─── Billing Email (editable) ─── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className='cardTitle h4'>Billing Email</h3>
          </div>
          <p className={styles.cardSub}>
            Invoices and billing notifications are sent to this address.
          </p>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Email</label>
              <input
                type='email'
                className='inputBorder'
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.cardActions}>
            <button
              className='neutralBtn'
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
            <h3 className='cardTitle h4'>Billing Address</h3>
          </div>
          <div className={styles.formGrid}>
            <div className={`${styles.formField} ${styles.fullWidth}`}>
              <label className={styles.formLabel}>Street Address</label>
              <input
                type='text'
                className='inputBorder'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder='123 Main St'
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>City</label>
              <input
                type='text'
                className='inputBorder'
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder='Phoenix'
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>State</label>
              <input
                type='text'
                className='inputBorder'
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder='AZ'
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>ZIP</label>
              <input
                type='text'
                className='inputBorder'
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder='85001'
              />
            </div>
          </div>
          <div className={styles.cardActions}>
            <button
              className='neutralBtn'
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
            <h3 className='cardTitle h4'>Your Contact Info</h3>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Title / Role</label>
              <input
                type='text'
                className='inputBorder'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='Office Manager'
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Phone</label>
              <input
                type='tel'
                className='inputBorder'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder='(555) 123-4567'
              />
            </div>
          </div>
          <div className={styles.cardActions}>
            <button
              className='neutralBtn'
              onClick={handleSaveContact}
              disabled={isPending}
            >
              {isPending ? "Saving…" : "Save Contact Info"}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Remove Card Modal ─── */}
      <Modal isOpen={removeModalOpen} onClose={() => setRemoveModalOpen(false)}>
        <div className={styles.modalContent}>
          <div className='cardTitle h5'>Remove card on file?</div>

          <p className='paragraph'>
            You are about to remove your{" "}
            <strong>
              {cardOnFile
                ? `${formatCardBrand(cardOnFile.brand)} ending in ${cardOnFile.last4}`
                : "card"}
            </strong>{" "}
            from this account.
          </p>

          <div className={styles.removeCardWarning}>
            <strong>⚠️ Please note:</strong>
            <ul className={styles.warningList}>
              <li>Future invoices will not be auto-charged</li>
              <li>You will need to pay invoices manually</li>
              <li>You can add a new card at any time</li>
            </ul>
          </div>

          <div className={styles.modalActions}>
            <button
              type='button'
              className='primaryBtn'
              onClick={() => setRemoveModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type='button'
              className='dangerBtn'
              onClick={handleRemoveCard}
              disabled={isPending}
            >
              {isPending ? "Removing…" : "Yes, Remove Card"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Card Brand Icon (simple SVG-based)
   ───────────────────────────────────────────── */

function CardBrandIcon({ brand }: { brand: string }) {
  // Simple colored squares with brand initials
  const colors: Record<string, string> = {
    visa: "#1a1f71",
    mastercard: "#eb001b",
    amex: "#006fcf",
    discover: "#ff6000",
  };

  const bg = colors[brand] ?? "#666";
  const label = brand === "amex" ? "AX" : brand.slice(0, 2).toUpperCase();

  return (
    <div
      style={{
        width: 48,
        height: 32,
        borderRadius: 6,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "1.2rem",
        fontWeight: 800,
        letterSpacing: "0.05em",
      }}
    >
      {label}
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
