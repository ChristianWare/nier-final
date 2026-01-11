"use server";

import { auth } from "../../auth"; 
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function cleanName(v: unknown) {
  const s = String(v ?? "").trim();
  // keep it simple + safe
  return s.replace(/\s+/g, " ").slice(0, 60);
}

export async function updateName(formData: FormData) {
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

  const incomingUserId = String(formData.get("userId") ?? "");
  if (incomingUserId !== userId)
    redirect("/dashboard/profile?err=Unauthorized");

  const name = cleanName(formData.get("name"));

  await db.user.update({
    where: { id: userId },
    data: { name: name.length ? name : null },
  });

  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile?ok=Name%20updated");
}
