// components/admin/StripeSettingsSection/StripeSettingsSection.tsx
"use client";

import styles from "./StripeSettingsSection.module.css";
import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  saveStripeKeys,
  removeStripeKey,
  type StripeSettingsDisplay,
} from "../../../../actions/admin/stripeSettings";
import Button from "@/components/shared/Button/Button";

type Props = {
  initial: StripeSettingsDisplay;
};

export default function StripeSettingsSection({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /* ── Lock / Unlock state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  /* ── Form state ── */
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  /* ── Track which fields to show ── */
  const [editingSecret, setEditingSecret] = useState(false);
  const [editingPublishable, setEditingPublishable] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(false);

  const hasAnyKey =
    initial.hasSecretKey || initial.publishableKey || initial.hasWebhookSecret;

  /* ── Helpers ── */
  const isLocked = !isEditing;
  const fieldsDisabled = isLocked || isPending;

  const wrapperClass = justSaved
    ? `${styles.container} ${styles.sectionSaved}`
    : isEditing
      ? `${styles.container} ${styles.sectionEditing}`
      : `${styles.container} ${styles.sectionLocked}`;

  const handleCancel = useCallback(() => {
    setSecretKey("");
    setPublishableKey("");
    setWebhookSecret("");
    setEditingSecret(false);
    setEditingPublishable(false);
    setEditingWebhook(false);
    setIsEditing(false);
  }, []);

  function handleStartEditing() {
    setEditingSecret(!initial.hasSecretKey);
    setEditingPublishable(!initial.publishableKey);
    setEditingWebhook(!initial.hasWebhookSecret);
    setIsEditing(true);
  }

  function handleSave() {
    const payload: {
      secretKey?: string;
      publishableKey?: string;
      webhookSecret?: string;
    } = {};

    if (editingSecret && secretKey.trim()) {
      payload.secretKey = secretKey.trim();
    }
    if (editingPublishable && publishableKey.trim()) {
      payload.publishableKey = publishableKey.trim();
    }
    if (editingWebhook && webhookSecret.trim()) {
      payload.webhookSecret = webhookSecret.trim();
    }

    if (Object.keys(payload).length === 0) {
      toast.error("Enter at least one key to save.");
      return;
    }

    startTransition(async () => {
      const result = await saveStripeKeys(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Stripe keys saved successfully.");
      setSecretKey("");
      setPublishableKey("");
      setWebhookSecret("");
      setEditingSecret(false);
      setEditingPublishable(false);
      setEditingWebhook(false);
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
        setIsEditing(false);
      }, 2000);
      router.refresh();
    });
  }

  function handleRemove(keyType: "secret" | "publishable" | "webhook") {
    const label =
      keyType === "secret"
        ? "secret key"
        : keyType === "publishable"
          ? "publishable key"
          : "webhook secret";

    if (
      !confirm(`Remove the ${label}? The app will fall back to .env if set.`)
    ) {
      return;
    }

    startTransition(async () => {
      const result = await removeStripeKey(keyType);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `${label.charAt(0).toUpperCase() + label.slice(1)} removed.`,
      );
      router.refresh();
    });
  }

  // Mode badge
  const mode = initial.secretKeyPrefix === "sk_live" ? "Live" : "Test";
  const modeCls =
    initial.secretKeyPrefix === "sk_live" ? styles.modeLive : styles.modeTest;

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
            text={isPending ? "Validating & saving..." : "Save Changes"}
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
          text={hasAnyKey ? "Edit Payment Settings" : "Add Stripe Keys"}
          btnType='blackReg'
          type='button'
          onClick={handleStartEditing}
        />
      </div>
    );
  };

  return (
    <section className={wrapperClass}>
      <div className={styles.header}>
        <div className="header">
          <h2 className='cardTitle h4'>Payment Settings</h2>
          <div className='miniNote'>
            Connect your Stripe account to accept payments
          </div>
        </div>
        {initial.hasSecretKey && (
          <span className={`${styles.modeBadge} ${modeCls}`}>{mode}</span>
        )}
      </div>

      {/* Current status */}
      <div className={styles.keyGrid}>
        <KeyStatusRow
          label='Secret Key'
          configured={initial.hasSecretKey}
          hint={
            initial.hasSecretKey
              ? `••••••••${initial.secretKeyLast4}`
              : "Not configured"
          }
        
          onRemove={
            initial.hasSecretKey ? () => handleRemove("secret") : undefined
          }
          isEditing={isEditing}
          isPending={isPending}
        />

        <KeyStatusRow
          label='Publishable Key'
          configured={!!initial.publishableKey}
          hint={
            initial.publishableKey
              ? `${initial.publishableKey.slice(0, 12)}••••${initial.publishableKey.slice(-4)}`
              : "Not configured"
          }
         
          onRemove={
            initial.publishableKey
              ? () => handleRemove("publishable")
              : undefined
          }
          isEditing={isEditing}
          isPending={isPending}
        />

        <KeyStatusRow
          label='Webhook Secret'
          configured={initial.hasWebhookSecret}
          hint={
            initial.hasWebhookSecret
              ? `whsec_••••${initial.webhookSecretLast4}`
              : "Not configured"
          }
         
          onRemove={
            initial.hasWebhookSecret ? () => handleRemove("webhook") : undefined
          }
          isEditing={isEditing}
          isPending={isPending}
        />
      </div>

      {/* Fallback note */}
      {!hasAnyKey && (
        <div className={styles.fallbackNote}>
          Currently using keys from your <code>.env</code> file. Add your keys
          here to manage them from the dashboard.
        </div>
      )}

      {/* Editing form — only visible when unlocked */}
      {isEditing && (
        <div className={styles.form}>
          {editingSecret && (
            <div className={styles.field}>
              <label className={styles.label}>Secret Key</label>
              <input
                type='password'
                className={styles.input}
                placeholder='sk_live_...'
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                disabled={fieldsDisabled}
                autoComplete='off'
                spellCheck={false}
              />
              <span className='miniNote'>
                Found in your Stripe Dashboard → Developers → API keys
              </span>
            </div>
          )}

          {editingPublishable && (
            <div className={styles.field}>
              <label className={styles.label}>Publishable Key</label>
              <input
                type='text'
                className={styles.input}
                placeholder='pk_live_...'
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                disabled={fieldsDisabled}
                autoComplete='off'
                spellCheck={false}
              />
              <span className='miniNote'>
                This is your public-facing key, safe to expose to browsers
              </span>
            </div>
          )}

          {editingWebhook && (
            <div className={styles.field}>
              <label className={styles.label}>Webhook Secret</label>
              <input
                type='password'
                className={styles.input}
                placeholder='whsec_...'
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                disabled={fieldsDisabled}
                autoComplete='off'
                spellCheck={false}
              />
              <span className='miniNote'>
                Found in Stripe Dashboard → Developers → Webhooks → your
                endpoint → Signing secret
              </span>
            </div>
          )}

          {/* Toggle fields that aren't already showing */}
          <div className={styles.toggleRow}>
            {!editingSecret && (
              <button
                type='button'
                className={styles.toggleBtn}
                onClick={() => setEditingSecret(true)}
                disabled={fieldsDisabled}
              >
                + Secret key
              </button>
            )}
            {!editingPublishable && (
              <button
                type='button'
                className={styles.toggleBtn}
                onClick={() => setEditingPublishable(true)}
                disabled={fieldsDisabled}
              >
                + Publishable key
              </button>
            )}
            {!editingWebhook && (
              <button
                type='button'
                className={styles.toggleBtn}
                onClick={() => setEditingWebhook(true)}
                disabled={fieldsDisabled}
              >
                + Webhook secret
              </button>
            )}
          </div>

          <div className={styles.securityNote}>
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
              <path d='M7 11V7a5 5 0 0 1 10 0v4' />
            </svg>
            Secret keys are encrypted before being stored. They are never
            exposed in the browser.
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {renderActions()}
    </section>
  );
}

/* ─────────────────────────────────────────── */

function KeyStatusRow({
  label,
  configured,
  hint,
  onRemove,
  isEditing,
  isPending,
}: {
  label: string;
  configured: boolean;
  hint: string;
  onRemove?: () => void;
  isEditing: boolean;
  isPending: boolean;
}) {
  return (
    <div className={styles.keyRow}>
      <div className={styles.keyInfo}>
        <span className={styles.keyLabel}>{label}</span>
        <span
          className={`${styles.keyHint} ${configured ? styles.keyConfigured : styles.keyMissing}`}
        >
          {hint}
        </span>
      </div>
      <div className={styles.keyActions}>
        {isEditing && onRemove && (
          <button
            type='button'
            className={styles.removeBtn}
            onClick={onRemove}
            disabled={isPending}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
