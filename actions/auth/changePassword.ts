/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "../../auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

function str(v: unknown) {
  return String(v ?? "");
}

function toProfileOk(message: string): never {
  redirect(`/dashboard/profile?ok=${encodeURIComponent(message)}`);
}

function toProfileErr(message: string): never {
  redirect(`/dashboard/profile?err=${encodeURIComponent(message)}`);
}

async function resolveUserId(session: any) {
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

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/profile");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/dashboard/profile");

  const incomingUserId = str(formData.get("userId"));
  if (incomingUserId !== userId) toProfileErr("Unauthorized");

  const currentPassword = str(formData.get("currentPassword"));
  const newPassword = str(formData.get("newPassword"));
  const confirmPassword = str(formData.get("confirmPassword"));

  if (newPassword.length < 8) {
    toProfileErr("New password must be at least 8 characters");
  }

  if (newPassword !== confirmPassword) {
    toProfileErr("Passwords do not match");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) toProfileErr("Account not found");

  const hash = user.password;
  if (!hash) toProfileErr("This account does not have a password set");

  const ok = await bcrypt.compare(currentPassword, hash);
  if (!ok) toProfileErr("Current password is incorrect");

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  revalidatePath("/dashboard/profile");
  toProfileOk("Password updated");
}
