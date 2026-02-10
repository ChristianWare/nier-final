"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

/* ─────────────────────────────────────────────
   Helper: get caller's corporate account
   ───────────────────────────────────────────── */

async function getCallerAccount() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const contact = await db.corporateContact.findFirst({
    where: { userId: session.user.id },
    select: { corporateAccountId: true, userId: true },
  });

  return contact;
}

/* ─────────────────────────────────────────────
   Update billing address
   ───────────────────────────────────────────── */

export async function updateBillingAddress(data: {
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
}) {
  const contact = await getCallerAccount();
  if (!contact) return { ok: false, error: "Not authorized" };

  try {
    await db.corporateAccount.update({
      where: { id: contact.corporateAccountId },
      data: {
        billingAddress: data.billingAddress || null,
        billingCity: data.billingCity || null,
        billingState: data.billingState || null,
        billingZip: data.billingZip || null,
      },
    });
    revalidatePath("/corporate/settings");
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to update billing address." };
  }
}

/* ─────────────────────────────────────────────
   Update billing email
   ───────────────────────────────────────────── */

export async function updateBillingEmail(billingEmail: string) {
  const contact = await getCallerAccount();
  if (!contact) return { ok: false, error: "Not authorized" };

  if (!billingEmail?.trim() || !/\S+@\S+\.\S+/.test(billingEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  try {
    await db.corporateAccount.update({
      where: { id: contact.corporateAccountId },
      data: { billingEmail: billingEmail.trim() },
    });
    revalidatePath("/corporate/settings");
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to update billing email." };
  }
}

/* ─────────────────────────────────────────────
   Update contact info (title, phone)
   ───────────────────────────────────────────── */

export async function updateContactInfo(data: {
  title: string;
  phone: string;
}) {
  const contact = await getCallerAccount();
  if (!contact) return { ok: false, error: "Not authorized" };

  try {
    await db.corporateContact.updateMany({
      where: {
        corporateAccountId: contact.corporateAccountId,
        userId: contact.userId,
      },
      data: {
        title: data.title || null,
        phone: data.phone || null,
      },
    });
    revalidatePath("/corporate/settings");
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to update contact info." };
  }
}

/* ─────────────────────────────────────────────
   Get card on file info (server-side helper)
   ───────────────────────────────────────────── */

export async function getCardOnFile(corporateAccountId: string) {
  try {
    const account = await db.corporateAccount.findUnique({
      where: { id: corporateAccountId },
      select: { stripeCustomerId: true },
    });

    if (!account?.stripeCustomerId) return null;

    const customer = (await stripe.customers.retrieve(
      account.stripeCustomerId,
    )) as Stripe.Customer;

    if (customer.deleted) return null;

    const defaultPmId =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id;

    if (!defaultPmId) {
      // Check if there are any payment methods attached
      const methods = await stripe.paymentMethods.list({
        customer: account.stripeCustomerId,
        type: "card",
        limit: 1,
      });

      if (methods.data.length === 0) return null;

      const pm = methods.data[0];
      return {
        id: pm.id,
        brand: pm.card?.brand ?? "unknown",
        last4: pm.card?.last4 ?? "****",
        expMonth: pm.card?.exp_month ?? 0,
        expYear: pm.card?.exp_year ?? 0,
      };
    }

    const pm = await stripe.paymentMethods.retrieve(defaultPmId);
    return {
      id: pm.id,
      brand: pm.card?.brand ?? "unknown",
      last4: pm.card?.last4 ?? "****",
      expMonth: pm.card?.exp_month ?? 0,
      expYear: pm.card?.exp_year ?? 0,
    };
  } catch (err) {
    console.error("[getCardOnFile] Error:", err);
    return null;
  }
}

/* ─────────────────────────────────────────────
   Create Stripe Checkout session (setup mode)
   to add or update a card
   ───────────────────────────────────────────── */

export async function createCardSetupSession() {
  const contact = await getCallerAccount();
  if (!contact) return { ok: false, error: "Not authorized" };

  try {
    const account = await db.corporateAccount.findUnique({
      where: { id: contact.corporateAccountId },
      select: {
        id: true,
        stripeCustomerId: true,
        name: true,
        billingEmail: true,
      },
    });

    if (!account) return { ok: false, error: "Account not found." };

    // Create or retrieve Stripe customer
    let customerId = account.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: account.name,
        email: account.billingEmail,
        metadata: { corporateAccountId: account.id },
      });
      customerId = customer.id;

      await db.corporateAccount.update({
        where: { id: account.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://niertransportation.com";

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      success_url: `${baseUrl}/corporate/settings?card_updated=true`,
      cancel_url: `${baseUrl}/corporate/settings?card_cancelled=true`,
      metadata: { corporateAccountId: account.id },
    });

    return { ok: true, url: session.url };
  } catch (err) {
    console.error("[createCardSetupSession] Error:", err);
    return { ok: false, error: "Failed to start card setup." };
  }
}

/* ─────────────────────────────────────────────
   Remove card on file
   ───────────────────────────────────────────── */

export async function removeCardOnFile() {
  const contact = await getCallerAccount();
  if (!contact) return { ok: false, error: "Not authorized" };

  try {
    const account = await db.corporateAccount.findUnique({
      where: { id: contact.corporateAccountId },
      select: { stripeCustomerId: true },
    });

    if (!account?.stripeCustomerId) {
      return { ok: false, error: "No Stripe customer found." };
    }

    // Get all card payment methods
    const methods = await stripe.paymentMethods.list({
      customer: account.stripeCustomerId,
      type: "card",
    });

    // Detach all cards
    for (const pm of methods.data) {
      await stripe.paymentMethods.detach(pm.id);
    }

    revalidatePath("/corporate/settings");
    return { ok: true };
  } catch (err) {
    console.error("[removeCardOnFile] Error:", err);
    return { ok: false, error: "Failed to remove card." };
  }
}
