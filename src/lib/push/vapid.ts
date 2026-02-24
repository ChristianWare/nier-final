// lib/push/vapid.ts
// VAPID key configuration for web push notifications.
//
// To generate keys, run once:
//   npx web-push generate-vapid-keys
//
// Then add to your .env:
//   VAPID_PUBLIC_KEY=<your public key>
//   VAPID_PRIVATE_KEY=<your private key>
//   VAPID_SUBJECT=mailto:admin@niertransportation.com

export function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT || "mailto:admin@niertransportation.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys not configured. Run: npx web-push generate-vapid-keys\n" +
        "Then set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your .env",
    );
  }

  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey(): string {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) throw new Error("VAPID_PUBLIC_KEY not set");
  return key;
}
