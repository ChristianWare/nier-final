"use client";

// components/shared/PushNotificationToggle/PushNotificationToggle.tsx

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import styles from "./PushNotificationToggle.module.css";
import {
  saveMyPushPreferences,
  removeAllMyPushSubscriptions,
} from "../../../../actions/push/pushSubscription";

type Props = {
  isAdmin: boolean;
  initialPrefs: {
    isSubscribed: boolean;
    pushEnabled: boolean;
    pushNewBooking: boolean;
    pushPaymentReceived: boolean;
    pushPaymentLinkSent: boolean;
    pushBookingCancelled: boolean;
    pushBookingDeclined: boolean;
    pushNoShow: boolean;
    pushTripCompleted: boolean;
    pushRefundIssued: boolean;
    pushRideAssigned: boolean;
    pushRideReminder: boolean;
    pushTripUpdated: boolean;
  };
};

type SupportStatus = "loading" | "unsupported" | "denied" | "ready";

type PrefKey =
  | "pushEnabled"
  | "pushNewBooking"
  | "pushPaymentReceived"
  | "pushPaymentLinkSent"
  | "pushBookingCancelled"
  | "pushBookingDeclined"
  | "pushNoShow"
  | "pushTripCompleted"
  | "pushRefundIssued"
  | "pushRideAssigned"
  | "pushRideReminder"
  | "pushTripUpdated";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export default function PushNotificationToggle({
  isAdmin,
  initialPrefs,
}: Props) {
  const [supportStatus, setSupportStatus] = useState<SupportStatus>("loading");
  const [isSubscribed, setIsSubscribed] = useState(initialPrefs.isSubscribed);
  const [isTogglingSubscription, setIsTogglingSubscription] = useState(false);

  const [prefs, setPrefs] = useState({
    pushEnabled: initialPrefs.pushEnabled,
    pushNewBooking: initialPrefs.pushNewBooking,
    pushPaymentReceived: initialPrefs.pushPaymentReceived,
    pushPaymentLinkSent: initialPrefs.pushPaymentLinkSent,
    pushBookingCancelled: initialPrefs.pushBookingCancelled,
    pushBookingDeclined: initialPrefs.pushBookingDeclined,
    pushNoShow: initialPrefs.pushNoShow,
    pushTripCompleted: initialPrefs.pushTripCompleted,
    pushRefundIssued: initialPrefs.pushRefundIssued,
    pushRideAssigned: initialPrefs.pushRideAssigned,
    pushRideReminder: initialPrefs.pushRideReminder,
    pushTripUpdated: initialPrefs.pushTripUpdated,
  });
  const [savingKey, setSavingKey] = useState<PrefKey | null>(null);

useEffect(() => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    setSupportStatus("unsupported");
    return;
  }
  if (Notification.permission === "denied") {
    setSupportStatus("denied");
    return;
  }
  setSupportStatus("ready");

  navigator.serviceWorker
    .register("/sw.js")
    .then(async () => {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      // Override the server-side value with what this browser actually has
      setIsSubscribed(!!existingSub);
    })
    .catch((err) => {
      console.error("[PWA] Service worker registration failed:", err);
    });
}, []);

  // ─── Subscribe / Unsubscribe ─────────────────────────────────────────────

  async function handleSubscribe() {
    setIsTogglingSubscription(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSupportStatus("denied");
        toast.error(
          "Notification permission denied. Please enable in browser settings.",
        );
        return;
      }

      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) throw new Error("Failed to get VAPID key");
      const { publicKey } = await keyRes.json();

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = subscription.toJSON();
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Failed to save subscription",
        );
      }

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
    } catch (err: unknown) {
      console.error("[PWA] Subscribe error:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to enable push notifications",
      );
    } finally {
      setIsTogglingSubscription(false);
    }
  }

  async function handleUnsubscribe() {
    setIsTogglingSubscription(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }

      await removeAllMyPushSubscriptions();
      setIsSubscribed(false);
      toast.success("Push notifications disabled.");
    } catch (err: unknown) {
      console.error("[PWA] Unsubscribe error:", err);
      toast.error("Failed to disable push notifications");
    } finally {
      setIsTogglingSubscription(false);
    }
  }

  // ─── Auto-save a single pref ─────────────────────────────────────────────

  async function handlePrefToggle(key: PrefKey) {
    const newValue = !prefs[key];
    const prevPrefs = { ...prefs };
    const newPrefs = { ...prefs, [key]: newValue };

    setPrefs(newPrefs);
    setSavingKey(key);

    try {
      const fd = new FormData();
      Object.entries(newPrefs).forEach(([k, v]) => {
        if (v) fd.append(k, "on");
      });

      const res = await saveMyPushPreferences(fd);
      if ("error" in res) {
        setPrefs(prevPrefs);
        toast.error(res.error ?? "Something went wrong");
      } else {
        toast.success("Saved.");
      }
    } catch {
      setPrefs(prevPrefs);
      toast.error("Failed to save. Please try again.");
    } finally {
      setSavingKey(null);
    }
  }

  // ─── Render States ───────────────────────────────────────────────────────

  if (supportStatus === "loading") {
    return <div className='miniNote'>Checking notification support…</div>;
  }

  if (supportStatus === "unsupported") {
    return (
      <div className={styles.unsupported}>
        <p className='emptyTitle'>Push notifications not supported</p>
        <p className='miniNote'>
          Your browser does not support push notifications. On iPhone, make sure
          you&apos;re using Safari and have added this app to your home screen
          (iOS 16.4+).
        </p>
      </div>
    );
  }

  if (supportStatus === "denied") {
    return (
      <div className={styles.denied}>
        <p className='emptyTitle'>Notifications blocked</p>
        <p className='miniNote'>
          Push notifications are blocked in your browser. To enable them, go to
          your browser settings and allow notifications for this site, then
          reload the page.
        </p>
      </div>
    );
  }

  const adminPrefs: { key: PrefKey; label: string }[] = [
    { key: "pushNewBooking", label: "New booking request" },
    { key: "pushPaymentReceived", label: "Payment received" },
    { key: "pushPaymentLinkSent", label: "Payment link sent" },
    { key: "pushBookingCancelled", label: "Booking cancelled" },
    { key: "pushBookingDeclined", label: "Booking declined" },
    { key: "pushNoShow", label: "No show" },
    { key: "pushTripCompleted", label: "Trip completed" },
    { key: "pushRefundIssued", label: "Refund issued" },
  ];

  const driverPrefs: { key: PrefKey; label: string }[] = [
    { key: "pushRideAssigned", label: "New ride assigned" },
    { key: "pushRideReminder", label: "Upcoming ride reminder" },
    { key: "pushTripUpdated", label: "Trip updated or cancelled" },
  ];

  const prefRows = isAdmin ? adminPrefs : driverPrefs;

  return (
    <div className={styles.wrapper}>
      {/* ── Device subscription — styled checkbox ── */}
      <div className={styles.subscribeRow}>
        <div>
          <h2 className='cardTitle h4'>Push Notifications</h2>
          <p className='miniNote'>
            {isSubscribed
              ? "This device will receive push notifications."
              : "Enable push notifications to receive alerts on this device."}
          </p>
        </div>

        <label
          className={`${styles.checkboxWrap} ${isTogglingSubscription ? styles.checkboxDisabled : ""}`}
        >
          <input
            type='checkbox'
            className={styles.checkboxInput}
            checked={isSubscribed}
            disabled={isTogglingSubscription}
            onChange={isSubscribed ? handleUnsubscribe : handleSubscribe}
          />
          <span className={styles.checkboxCustom}>
            <svg
              viewBox='0 0 12 10'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              className={styles.checkmark}
            >
              <path
                d='M1 5L4.5 8.5L11 1.5'
                stroke='white'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </span>
          <span className={styles.checkboxLabel}>
            {isTogglingSubscription
              ? "Please wait…"
              : isSubscribed
                ? "Enabled on this device"
                : "Disabled on this device"}
          </span>
        </label>
      </div>

      {/* ── Preferences (only shown when subscribed) ── */}
      {isSubscribed && (
        <div className={styles.prefsCard}>
          {/* Individual pref toggles */}
          <p className='cardTitle h4'>Notification Preferences</p>
          <p className='emptyTitleSmall'>
            {isAdmin ? "Booking Events" : "Trip Events"}
          </p>

          <div className={styles.prefList}>
            {prefRows.map((row) => {
              const isOn = prefs[row.key];
              const isSaving = savingKey === row.key;
              const isDisabled = !prefs.pushEnabled || isSaving;

              return (
                <div
                  key={row.key}
                  className={`${styles.prefRow} ${isDisabled ? styles.prefRowDisabled : ""}`}
                >
                  <span className={styles.prefLabel}>{row.label}</span>
                  <button
                    type='button'
                    role='switch'
                    aria-checked={isOn}
                    aria-label={row.label}
                    disabled={isDisabled}
                    className={`${styles.toggle} ${isOn ? styles.toggleOn : styles.toggleOff}`}
                    onClick={() => handlePrefToggle(row.key)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
