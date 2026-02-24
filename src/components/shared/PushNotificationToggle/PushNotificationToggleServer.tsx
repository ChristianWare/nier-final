// components/shared/PushNotificationToggle/PushNotificationToggleServer.tsx
// Server component — fetches prefs, passes to client toggle.
// Usage: drop this into admin settings page OR driver settings page.
//
// import PushNotificationToggleServer from "@/components/shared/PushNotificationToggle/PushNotificationToggleServer";
// <PushNotificationToggleServer />

import { getMyPushPreferences } from "../../../../actions/push/pushSubscription";
import PushNotificationToggle from "./PushNotificationToggle";

export default async function PushNotificationToggleServer() {
  const prefs = await getMyPushPreferences();

  return (
    <PushNotificationToggle isAdmin={prefs.isAdmin} initialPrefs={prefs} />
  );
}
