// actions/admin/stripeSettings.ts
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { encrypt, decrypt } from "@/lib/encryption";
import Stripe from "stripe";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function requireAdmin() {
  const session = await auth();
  const roles = session?.user?.roles;
  const actorId = session?.user?.id ?? (session?.user as any)?.userId;

  if (
    !session?.user ||
    !actorId ||
    !Array.isArray(roles) ||
    !roles.includes("ADMIN")
  ) {
    throw new Error("Unauthorized");
  }

  return { session, actorId };
}

/* ─────────────────────────────────────────────
   Get Stripe settings (masked for display)
   ───────────────────────────────────────────── */

export type StripeSettingsDisplay = {
  hasSecretKey: boolean;
  secretKeyLast4: string | null;
  secretKeyPrefix: string | null; // "sk_live" or "sk_test"
  publishableKey: string | null;
  hasWebhookSecret: boolean;
  webhookSecretLast4: string | null;
};

export async function getStripeSettings(): Promise<StripeSettingsDisplay> {
  await requireAdmin();

  const settings = await db.companySettings.findUnique({
    where: { id: "default" },
    select: {
      stripeSecretKeyEncrypted: true,
      stripePublishableKey: true,
      stripeWebhookSecretEncrypted: true,
    },
  });

  let hasSecretKey = false;
  let secretKeyLast4: string | null = null;
  let secretKeyPrefix: string | null = null;

  if (settings?.stripeSecretKeyEncrypted) {
    try {
      const decrypted = decrypt(settings.stripeSecretKeyEncrypted);
      if (decrypted && decrypted.startsWith("sk_")) {
        hasSecretKey = true;
        secretKeyLast4 = decrypted.slice(-4);
        secretKeyPrefix = decrypted.startsWith("sk_live_")
          ? "sk_live"
          : "sk_test";
      }
    } catch {
      // Decryption failed — key is invalid
    }
  }

  let hasWebhookSecret = false;
  let webhookSecretLast4: string | null = null;

  if (settings?.stripeWebhookSecretEncrypted) {
    try {
      const decrypted = decrypt(settings.stripeWebhookSecretEncrypted);
      if (decrypted && decrypted.startsWith("whsec_")) {
        hasWebhookSecret = true;
        webhookSecretLast4 = decrypted.slice(-4);
      }
    } catch {
      // Decryption failed
    }
  }

  return {
    hasSecretKey,
    secretKeyLast4,
    secretKeyPrefix,
    publishableKey: settings?.stripePublishableKey ?? null,
    hasWebhookSecret,
    webhookSecretLast4,
  };
}

/* ─────────────────────────────────────────────
   Save Stripe keys
   ───────────────────────────────────────────── */

type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveStripeKeys(data: {
  secretKey?: string;
  publishableKey?: string;
  webhookSecret?: string;
}): Promise<SaveResult> {
  await requireAdmin();

  const updates: Record<string, any> = {};
  const { secretKey, publishableKey, webhookSecret } = data;

  // ── Validate & encrypt secret key ──
  if (secretKey !== undefined && secretKey.trim() !== "") {
    const sk = secretKey.trim();

    if (!sk.startsWith("sk_live_") && !sk.startsWith("sk_test_")) {
      return {
        ok: false,
        error: "Invalid secret key. Must start with sk_live_ or sk_test_.",
      };
    }

    // Validate by making a test API call
    try {
      const testStripe = new Stripe(sk, {
        apiVersion: "2025-12-15.clover",
      });
      await testStripe.balance.retrieve();
    } catch (e: any) {
      return {
        ok: false,
        error: `Secret key validation failed: ${e?.message || "Invalid key"}`,
      };
    }

    updates.stripeSecretKeyEncrypted = encrypt(sk);
  }

  // ── Validate publishable key ──
  if (publishableKey !== undefined && publishableKey.trim() !== "") {
    const pk = publishableKey.trim();

    if (!pk.startsWith("pk_live_") && !pk.startsWith("pk_test_")) {
      return {
        ok: false,
        error: "Invalid publishable key. Must start with pk_live_ or pk_test_.",
      };
    }

    updates.stripePublishableKey = pk;
  }

  // ── Validate & encrypt webhook secret ──
  if (webhookSecret !== undefined && webhookSecret.trim() !== "") {
    const ws = webhookSecret.trim();

    if (!ws.startsWith("whsec_")) {
      return {
        ok: false,
        error: "Invalid webhook secret. Must start with whsec_.",
      };
    }

    updates.stripeWebhookSecretEncrypted = encrypt(ws);
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No keys provided." };
  }

  // ── Check mode consistency ──
  const modes = new Set<string>();

  if (updates.stripeSecretKeyEncrypted) {
    const sk = secretKey!.trim();
    modes.add(sk.startsWith("sk_live_") ? "live" : "test");
  }

  if (updates.stripePublishableKey) {
    const pk = publishableKey!.trim();
    modes.add(pk.startsWith("pk_live_") ? "live" : "test");
  }

  if (modes.size > 1) {
    return {
      ok: false,
      error:
        "Mode mismatch: your secret key and publishable key must both be live or both be test.",
    };
  }

  // ── Save ──
  try {
    await db.companySettings.upsert({
      where: { id: "default" },
      update: updates,
      create: { id: "default", ...updates },
    });

    revalidatePath("/admin/earnings");

    return { ok: true };
  } catch (e: any) {
    console.error("[saveStripeKeys] Error:", e);
    return { ok: false, error: "Failed to save keys." };
  }
}

/* ─────────────────────────────────────────────
   Remove a specific key
   ───────────────────────────────────────────── */

export async function removeStripeKey(
  keyType: "secret" | "publishable" | "webhook",
): Promise<SaveResult> {
  await requireAdmin();

  const updates: Record<string, any> = {};

  switch (keyType) {
    case "secret":
      updates.stripeSecretKeyEncrypted = null;
      break;
    case "publishable":
      updates.stripePublishableKey = null;
      break;
    case "webhook":
      updates.stripeWebhookSecretEncrypted = null;
      break;
    default:
      return { ok: false, error: "Invalid key type." };
  }

  try {
    await db.companySettings.update({
      where: { id: "default" },
      data: updates,
    });

    revalidatePath("/admin/earnings");

    return { ok: true };
  } catch (e: any) {
    console.error("[removeStripeKey] Error:", e);
    return { ok: false, error: "Failed to remove key." };
  }
}
