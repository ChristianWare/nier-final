// lib/stripe.ts
import Stripe from "stripe";
import { db } from "@/lib/db";
import { decrypt } from "./encryption";

const STRIPE_API_VERSION = "2025-12-15.clover";

/**
 * Get a Stripe client instance.
 *
 * Priority:
 *  1. Database (CompanySettings.stripeSecretKeyEncrypted)
 *  2. Environment variable (STRIPE_SECRET_KEY)
 *
 * Always creates a fresh instance since the key could change.
 */
export async function getStripe(): Promise<Stripe> {
  // 1. Try database first
  try {
    const settings = await db.companySettings.findUnique({
      where: { id: "default" },
      select: { stripeSecretKeyEncrypted: true },
    });

    if (settings?.stripeSecretKeyEncrypted) {
      const secretKey = decrypt(settings.stripeSecretKeyEncrypted);
      if (secretKey && secretKey.startsWith("sk_")) {
        return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
      }
    }
  } catch (e) {
    console.warn("[getStripe] Failed to load from DB, falling back to env:", e);
  }

  // 2. Fall back to env
  const envKey = process.env.STRIPE_SECRET_KEY;
  if (!envKey) {
    throw new Error(
      "No Stripe secret key configured. Add one in Admin → Earnings → Payment Settings, or set STRIPE_SECRET_KEY in .env",
    );
  }

  return new Stripe(envKey, { apiVersion: STRIPE_API_VERSION });
}

/**
 * Get the Stripe webhook secret.
 *
 * Priority:
 *  1. Database (CompanySettings.stripeWebhookSecretEncrypted)
 *  2. Environment variable (STRIPE_WEBHOOK_SECRET)
 */
export async function getStripeWebhookSecret(): Promise<string> {
  try {
    const settings = await db.companySettings.findUnique({
      where: { id: "default" },
      select: { stripeWebhookSecretEncrypted: true },
    });

    if (settings?.stripeWebhookSecretEncrypted) {
      const secret = decrypt(settings.stripeWebhookSecretEncrypted);
      if (secret && secret.startsWith("whsec_")) {
        return secret;
      }
    }
  } catch (e) {
    console.warn(
      "[getStripeWebhookSecret] Failed to load from DB, falling back to env:",
      e,
    );
  }

  const envSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!envSecret) {
    throw new Error(
      "No Stripe webhook secret configured. Add one in Admin → Earnings → Payment Settings, or set STRIPE_WEBHOOK_SECRET in .env",
    );
  }

  return envSecret;
}

/**
 * Get the Stripe publishable key for client-side usage.
 *
 * Priority:
 *  1. Database (CompanySettings.stripePublishableKey)
 *  2. Environment variable (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
 */
export async function getStripePublishableKey(): Promise<string | null> {
  try {
    const settings = await db.companySettings.findUnique({
      where: { id: "default" },
      select: { stripePublishableKey: true },
    });

    if (
      settings?.stripePublishableKey &&
      settings.stripePublishableKey.startsWith("pk_")
    ) {
      return settings.stripePublishableKey;
    }
  } catch (e) {
    console.warn(
      "[getStripePublishableKey] Failed to load from DB, falling back to env:",
      e,
    );
  }

  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
}

// ─────────────────────────────────────────────────────
// LEGACY: Keep a sync export during transition.
// Files that import { stripe } will still work with env vars.
// Migrate these to `await getStripe()` over time.
// ─────────────────────────────────────────────────────

const envKey = process.env.STRIPE_SECRET_KEY;
export const stripe = envKey
  ? new Stripe(envKey, { apiVersion: STRIPE_API_VERSION })
  : (null as unknown as Stripe);
