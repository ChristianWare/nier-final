"use server";

import { auth } from "../../auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// If you already use bcrypt in your project, this will work.
// If not installed yet: npm i bcryptjs
import bcrypt from "bcryptjs";

function str(v: unknown) {
  return String(v ?? "");
}

export async function changePassword(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/profile");

  const sessionUserId = (session.user as { id?: string }).id ?? null;
  const email = session.user?.email ?? null;

  let userId = sessionUserId;

  if (!userId && email) {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  if (!userId) redirect("/login?next=/dashboard/profile");

  const incomingUserId = str(formData.get("userId"));
  if (incomingUserId !== userId)
    redirect("/dashboard/profile?err=Unauthorized");

  const currentPassword = str(formData.get("currentPassword"));
  const newPassword = str(formData.get("newPassword"));
  const confirmPassword = str(formData.get("confirmPassword"));

  if (newPassword.length < 8) {
    redirect(
      "/dashboard/profile?err=New%20password%20must%20be%20at%20least%208%20characters"
    );
  }

  if (newPassword !== confirmPassword) {
    redirect("/dashboard/profile?err=Passwords%20do%20not%20match");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) redirect("/dashboard/profile?err=Account%20not%20found");

  if (!user.password) {
    // Per your requirement: only allow change if using credentials auth (password exists)
    redirect(
      "/dashboard/profile?err=This%20account%20does%20not%20have%20a%20password%20set"
    );
  }

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok)
    redirect("/dashboard/profile?err=Current%20password%20is%20incorrect");

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?ok=Password%20updated");
}
