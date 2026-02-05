/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";
import {
  CorporateInquiryStatus,
  CorporateAccountStatus,
  CorporateBillingCycle,
  CorporatePaymentMethod,
  PaymentTerms,
} from "@prisma/client";

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, roles: true },
  });
  if (!user?.roles.includes("ADMIN")) return null;
  return user;
}

/* ─────────────────────────────────────────────
   INQUIRY ACTIONS
   ───────────────────────────────────────────── */

export async function updateInquiryStatus(
  inquiryId: string,
  status: "CONTACTED" | "DECLINED",
) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not authorized" };

  try {
    await db.corporateInquiry.update({
      where: { id: inquiryId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    });
    revalidatePath("/admin/corporate/inquiries");
    revalidatePath(`/admin/corporate/inquiries/${inquiryId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to update inquiry status." };
  }
}

export async function updateInquiryNotes(inquiryId: string, notes: string) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not authorized" };

  try {
    await db.corporateInquiry.update({
      where: { id: inquiryId },
      data: { adminNotes: notes },
    });
    revalidatePath(`/admin/corporate/inquiries/${inquiryId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to save notes." };
  }
}

export async function approveInquiryAndCreateAccount(
  inquiryId: string,
  data: {
    billingCycle: CorporateBillingCycle;
    paymentMethod: CorporatePaymentMethod;
    paymentTerms: PaymentTerms;
    discountPercent?: number | null;
    monthlyLimitCents?: number | null;
    internalNotes?: string;
  },
) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not authorized" };

  try {
    const inquiry = await db.corporateInquiry.findUnique({
      where: { id: inquiryId },
    });

    if (!inquiry) return { ok: false, error: "Inquiry not found." };
    if (inquiry.status === "APPROVED")
      return { ok: false, error: "Inquiry already approved." };

    // Create the corporate account
    const account = await db.corporateAccount.create({
      data: {
        name: inquiry.companyName,
        billingEmail: inquiry.email,
        billingCycle: data.billingCycle,
        paymentMethod: data.paymentMethod,
        paymentTerms: data.paymentTerms,
        discountPercent: data.discountPercent ?? undefined,
        monthlyLimitCents: data.monthlyLimitCents ?? undefined,
        internalNotes: data.internalNotes ?? undefined,
        status: "ACTIVE",
      },
    });

    // Update inquiry to approved with link to account
    await db.corporateInquiry.update({
      where: { id: inquiryId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: admin.id,
        corporateAccountId: account.id,
      },
    });

    revalidatePath("/admin/corporate");
    revalidatePath("/admin/corporate/inquiries");
    revalidatePath(`/admin/corporate/inquiries/${inquiryId}`);
    return { ok: true, accountId: account.id };
  } catch (err) {
    console.error("approveInquiryAndCreateAccount error:", err);
    return { ok: false, error: "Failed to create account." };
  }
}

/* ─────────────────────────────────────────────
   ACCOUNT ACTIONS
   ───────────────────────────────────────────── */

export async function updateCorporateAccount(
  accountId: string,
  data: {
    name?: string;
    billingEmail?: string;
    billingAddress?: string;
    billingCity?: string;
    billingState?: string;
    billingZip?: string;
    billingCycle?: CorporateBillingCycle;
    paymentMethod?: CorporatePaymentMethod;
    paymentTerms?: PaymentTerms;
    discountPercent?: number | null;
    monthlyLimitCents?: number | null;
    internalNotes?: string;
  },
) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not authorized" };

  try {
    await db.corporateAccount.update({
      where: { id: accountId },
      data,
    });
    revalidatePath("/admin/corporate");
    revalidatePath(`/admin/corporate/${accountId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to update account." };
  }
}

export async function updateAccountStatus(
  accountId: string,
  status: CorporateAccountStatus,
) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not authorized" };

  try {
    await db.corporateAccount.update({
      where: { id: accountId },
      data: { status },
    });
    revalidatePath("/admin/corporate");
    revalidatePath(`/admin/corporate/${accountId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to update account status." };
  }
}

export async function addCorporatePassenger(
  accountId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    department?: string;
    employeeId?: string;
  },
) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not authorized" };

  try {
    await db.corporatePassenger.create({
      data: {
        corporateAccountId: accountId,
        ...data,
      },
    });
    revalidatePath(`/admin/corporate/${accountId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to add passenger." };
  }
}

export async function togglePassengerActive(
  passengerId: string,
  active: boolean,
) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not authorized" };

  try {
    const passenger = await db.corporatePassenger.update({
      where: { id: passengerId },
      data: { active },
      select: { corporateAccountId: true },
    });
    revalidatePath(`/admin/corporate/${passenger.corporateAccountId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to update passenger." };
  }
}
