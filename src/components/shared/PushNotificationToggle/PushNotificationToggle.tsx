"use client";

// components/shared/PushNotificationToggle/PushNotificationToggle.tsx
// Handles browser permission request, service worker registration,
// and subscription management for push notifications.

import { useState, useEffect, useTransition } from "react";
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
    pushRideAssigned: boolean;
    pushRideReminder: boolean;
    pushTripUpdated: boolean;
    pushTripCompleted: boolean;
  };
};

type SupportStatus = "loading" | "unsupported" | "denied" | "ready";

// Fix 1: Return Uint8Array<ArrayBuffer> explicitly to satisfy PushSubscriptionOptionsInit
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
  const [isPending, startTransition] = useTransition();
  const [supportStatus, setSupportStatus] = useState<SupportStatus>("loading");
  const [isSubscribed, setIsSubscribed] = useState(initialPrefs.isSubscribed);
  const [isTogglingSubscription, setIsTogglingSubscription] = useState(false);

  // Check browser support on mount
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

    // Register service worker if not already registered
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[PWA] Service worker registration failed:", err);
    });
  }, []);

  async function handleSubscribe() {
    setIsTogglingSubscription(true);
    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSupportStatus("denied");
        toast.error(
          "Notification permission denied. Please enable in browser settings.",
        );
        return;
      }

      // 2. Get VAPID public key from server
      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) throw new Error("Failed to get VAPID key");
      const { publicKey } = await keyRes.json();

      // 3. Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // 4. Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Save to server
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
      // Unsubscribe from browser push manager
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        // Remove from server
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }

      // Remove all DB subscriptions for this user
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

  function handleSavePrefs(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => {
      saveMyPushPreferences(fd).then((res) => {
        // Fix 2: Guard against undefined error value before passing to toast
        if ("error" in res)
          return toast.error(res.error ?? "Something went wrong");
        toast.success("Push preferences saved.");
      });
    });
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

  return (
    <div className={styles.wrapper}>
      {/* ── Subscription Toggle ── */}
      <div className={styles.subscribeRow}>
        <div>
          <p className='cardTitle h4'>Push Notifications</p>
          <p className='miniNote'>
            {isSubscribed
              ? "This device will receive push notifications."
              : "Enable push notifications to receive alerts on this device."}
          </p>
        </div>

        <button
          type='button'
          className={isSubscribed ? "tab" : "primaryBtn"}
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={isTogglingSubscription}
        >
          {isTogglingSubscription
            ? "Please wait…"
            : isSubscribed
              ? "Disable on this device"
              : "Enable on this device"}
        </button>
      </div>

      {/* ── Preferences (only shown when subscribed) ── */}
      {isSubscribed && (
        <form className={styles.prefsForm} onSubmit={handleSavePrefs}>
          <div className='cardTitle h4' style={{ marginBottom: 12 }}>
            Notification Preferences
          </div>

          <label className={styles.masterToggle}>
            <input
              type='checkbox'
              name='pushEnabled'
              defaultChecked={initialPrefs.pushEnabled}
            />
            <span className='emptyTitle'>All push notifications enabled</span>
          </label>

          <div className={styles.divider} />

          {isAdmin ? (
            <>
              <p className='emptyTitleSmall'>Booking Events</p>
              <div className={styles.checkList}>
                <label className={styles.checkRow}>
                  <input
                    type='checkbox'
                    name='pushNewBooking'
                    defaultChecked={initialPrefs.pushNewBooking}
                  />
                  <span>New booking request</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type='checkbox'
                    name='pushPaymentReceived'
                    defaultChecked={initialPrefs.pushPaymentReceived}
                  />
                  <span>Payment received</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type='checkbox'
                    name='pushPaymentLinkSent'
                    defaultChecked={initialPrefs.pushPaymentLinkSent}
                  />
                  <span>Payment link sent</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type='checkbox'
                    name='pushBookingCancelled'
                    defaultChecked={initialPrefs.pushBookingCancelled}
                  />
                  <span>Booking cancelled</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type='checkbox'
                    name='pushBookingDeclined'
                    defaultChecked={initialPrefs.pushBookingDeclined}
                  />
                  <span>Booking declined</span>
                </label>
              </div>
            </>
          ) : (
            <>
              <p className='emptyTitleSmall'>Trip Events</p>
              <div className={styles.checkList}>
                <label className={styles.checkRow}>
                  <input
                    type='checkbox'
                    name='pushRideAssigned'
                    defaultChecked={initialPrefs.pushRideAssigned}
                  />
                  <span>New ride assigned</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type='checkbox'
                    name='pushRideReminder'
                    defaultChecked={initialPrefs.pushRideReminder}
                  />
                  <span>Upcoming ride reminder</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type='checkbox'
                    name='pushTripUpdated'
                    defaultChecked={initialPrefs.pushTripUpdated}
                  />
                  <span>Trip updated or cancelled</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type='checkbox'
                    name='pushTripCompleted'
                    defaultChecked={initialPrefs.pushTripCompleted}
                  />
                  <span>Trip completed</span>
                </label>
              </div>
            </>
          )}

          {/* Hidden fields to satisfy driver-only prefs when admin (and vice versa) */}
          {isAdmin ? (
            <>
              <input type='hidden' name='pushRideAssigned' value='' />
              <input type='hidden' name='pushRideReminder' value='' />
              <input type='hidden' name='pushTripUpdated' value='' />
              <input type='hidden' name='pushTripCompleted' value='' />
            </>
          ) : (
            <>
              <input type='hidden' name='pushNewBooking' value='' />
              <input type='hidden' name='pushPaymentReceived' value='' />
              <input type='hidden' name='pushPaymentLinkSent' value='' />
              <input type='hidden' name='pushBookingCancelled' value='' />
              <input type='hidden' name='pushBookingDeclined' value='' />
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <button type='submit' className='primaryBtn' disabled={isPending}>
              {isPending ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
