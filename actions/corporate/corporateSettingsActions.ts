"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";

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