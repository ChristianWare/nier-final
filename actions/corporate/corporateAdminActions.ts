// actions/corporate/corporateAdminActions.ts
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";
import {
  CorporateAccountStatus,
  CorporateBillingCycle,
  CorporatePaymentMethod,
  PaymentTerms,
  Role,
} from "@prisma/client";
import {
  generatePasswordSetToken,
  sendCorporateWelcomeEmail,
} from "@/lib/corporateOnboarding";

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

    // ─── 1. Check if a user already exists with this email ───
    let user = await db.user.findUnique({
      where: { email: inquiry.email },
      select: { id: true, roles: true },
    });

    if (user) {
      // User exists — make sure they have the CORPORATE role
      const currentRoles = (user.roles ?? []) as Role[];
      if (!currentRoles.includes("CORPORATE" as Role)) {
        await db.user.update({
          where: { id: user.id },
          data: { roles: [...currentRoles, "CORPORATE" as Role] },
        });
      }
    } else {
      // ─── 2. Create new user with no password, CORPORATE role ───
      user = await db.user.create({
        data: {
          name: inquiry.contactName,
          email: inquiry.email,
          // password is null — they'll set it via the welcome email link
          roles: ["CORPORATE" as Role],
        },
        select: { id: true, roles: true },
      });
    }

    // ─── 3. Create the corporate account ───
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

    // ─── 4. Create CorporateContact linking user → account ───
    await db.corporateContact.create({
      data: {
        corporateAccountId: account.id,
        userId: user.id,
        phone: inquiry.phone ?? undefined,
        role: "PRIMARY",
      },
    });

    // ─── 5. Update inquiry to approved with link to account ───
    await db.corporateInquiry.update({
      where: { id: inquiryId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: admin.id,
        corporateAccountId: account.id,
      },
    });

    // ─── 6. Generate password-set token & send welcome email ───
    const token = await generatePasswordSetToken(user.id);

    const emailResult = await sendCorporateWelcomeEmail({
      to: inquiry.email,
      contactName: inquiry.contactName,
      companyName: inquiry.companyName,
      billingCycle: data.billingCycle,
      paymentMethod: data.paymentMethod,
      paymentTerms: data.paymentTerms,
      discountPercent: data.discountPercent,
      setPasswordToken: token,
    });

    if (emailResult.error) {
      console.error(
        "[approveInquiry] Welcome email failed:",
        emailResult.error,
      );
      // Account is still created — admin can resend the email later
    }

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

/* ─────────────────────────────────────────────
   RESEND WELCOME EMAIL (for cases where the
   original email failed or token expired)
   ───────────────────────────────────────────── */

export async function resendCorporateWelcomeEmail(accountId: string) {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not authorized" };

  try {
    // Get the account + primary contact
    const account = await db.corporateAccount.findUnique({
      where: { id: accountId },
      include: {
        contacts: {
          where: { role: "PRIMARY" },
          include: {
            user: {
              select: { id: true, name: true, email: true, password: true },
            },
          },
          take: 1,
        },
      },
    });

    if (!account) return { ok: false, error: "Account not found." };

    const contact = account.contacts[0];
    if (!contact) return { ok: false, error: "No primary contact found." };
    if (!contact.user)
      return { ok: false, error: "No user linked to contact." };

    // Only resend if user hasn't set a password yet
    if (contact.user.password) {
      return { ok: false, error: "This user has already set their password." };
    }

    // Generate new token and send email
    const token = await generatePasswordSetToken(contact.user.id);

    const emailResult = await sendCorporateWelcomeEmail({
      to: contact.user.email!,
      contactName: contact.user.name ?? "",
      companyName: account.name,
      billingCycle: account.billingCycle,
      paymentMethod: account.paymentMethod,
      paymentTerms: account.paymentTerms,
      discountPercent: account.discountPercent
        ? Number(account.discountPercent)
        : null,
      setPasswordToken: token,
    });

    if (emailResult.error) {
      return { ok: false, error: `Email failed: ${emailResult.error}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("resendCorporateWelcomeEmail error:", err);
    return { ok: false, error: "Failed to resend welcome email." };
  }
}
