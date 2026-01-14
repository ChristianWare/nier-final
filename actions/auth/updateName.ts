/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { auth } from "../../auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function cleanName(v: unknown) {
  const s = String(v ?? "").trim();
  return s.replace(/\s+/g, " ").slice(0, 60);
}

function toProfileOk(message: string) {
  redirect(`/dashboard/profile?ok=${encodeURIComponent(message)}`);
}

function toProfileErr(message: string) {
  redirect(`/dashboard/profile?err=${encodeURIComponent(message)}`);
}

async function resolveUserId(session: any) {
  const sessionUserId = (session?.user as { id?: string })?.id ?? null;
  if (sessionUserId) return sessionUserId;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function updateName(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login?next=/dashboard/profile");

  const userId = await resolveUserId(session);
  if (!userId) redirect("/login?next=/dashboard/profile");

  const incomingUserId = String(formData.get("userId") ?? "");
  if (incomingUserId !== userId) toProfileErr("Unauthorized");

  const name = cleanName(formData.get("name"));

  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const nextName = name.length ? name : null;
  if ((existing?.name ?? null) === nextName) {
    toProfileOk("No changes to save");
  }

  await db.user.update({
    where: { id: userId },
    data: { name: nextName },
  });

  revalidatePath("/dashboard/profile");
  toProfileOk("Name updated");
}
