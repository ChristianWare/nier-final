
"use server";

import { auth } from "../../auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

type ActionResult = { ok?: boolean; error?: string };

async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  if (!session) return null;

  const sessionUserId = (session?.user as { id?: string })?.id ?? null;
  if (sessionUserId) return sessionUserId;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return u?.id ?? null;
}

/* ─────────────────────────────────────────────
   Update display name
   ───────────────────────────────────────────── */

export async function updateProfileName(
  userId: string,
  name: string,
): Promise<ActionResult> {
  const authId = await getAuthUserId();
  if (!authId || authId !== userId) return { error: "Unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name cannot be empty." };
  if (trimmed.length > 60)
    return { error: "Name is too long (max 60 characters)." };

  await db.user.update({
    where: { id: userId },
    data: { name: trimmed },
  });

  revalidatePath("/dashboard/profile");
  return { ok: true };
}

/* ─────────────────────────────────────────────
   Update phone number
   ───────────────────────────────────────────── */

export async function updateProfilePhone(
  userId: string,
  phone: string,
): Promise<ActionResult> {
  const authId = await getAuthUserId();
  if (!authId || authId !== userId) return { error: "Unauthorized" };

  const trimmed = phone.trim();
  if (trimmed.length > 20) return { error: "Phone number is too long." };

  await db.user.update({
    where: { id: userId },
    data: { phone: trimmed || null },
  });

  revalidatePath("/dashboard/profile");
  return { ok: true };
}

/* ─────────────────────────────────────────────
   Update email (requires current password)
   ───────────────────────────────────────────── */

export async function updateProfileEmail(
  userId: string,
  newEmail: string,
  currentPassword: string,
): Promise<ActionResult> {
  const authId = await getAuthUserId();
  if (!authId || authId !== userId) return { error: "Unauthorized" };

  const trimmed = newEmail.trim().toLowerCase();

  if (!trimmed) return { error: "Email cannot be empty." };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: "Please enter a valid email address." };
  }

  if (!currentPassword) {
    return { error: "Current password is required to change your email." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, password: true },
  });

  if (!user) return { error: "Account not found." };

  if (trimmed === user.email.toLowerCase()) {
    return { error: "This is already your email address." };
  }

  if (!user.password) {
    return { error: "Cannot change email on accounts without a password set." };
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { error: "Incorrect password." };

  const existing = await db.user.findUnique({
    where: { email: trimmed },
    select: { id: true },
  });

  if (existing)
    return { error: "This email is already in use by another account." };

  await db.user.update({
    where: { id: userId },
    data: {
      email: trimmed,
      emailVerified: null,
    },
  });

  revalidatePath("/dashboard/profile");
  return { ok: true };
}

/* ─────────────────────────────────────────────
   Change password
   ───────────────────────────────────────────── */

export async function updateProfilePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ActionResult> {
  const authId = await getAuthUserId();
  if (!authId || authId !== userId) return { error: "Unauthorized" };

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  if (!/[A-Z]/.test(newPassword)) {
    return {
      error: "New password must contain at least one uppercase letter.",
    };
  }

  if (!/[0-9]/.test(newPassword)) {
    return { error: "New password must contain at least one number." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) return { error: "Account not found." };

  if (!user.password) {
    return { error: "This account does not have a password set." };
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return { error: "Current password is incorrect." };

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  revalidatePath("/dashboard/profile");
  return { ok: true };
}
