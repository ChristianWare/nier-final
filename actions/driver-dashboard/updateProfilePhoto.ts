"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function resolveSessionUserId(session: any) {
  const direct =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);

  if (direct) return direct;

  const email = session?.user?.email ?? null;
  if (!email) return null;

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return u?.id ?? null;
}

export async function updateProfilePhoto(imageUrl: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const userId = await resolveSessionUserId(session);
  if (!userId) {
    return { error: "User not found" };
  }

  // Check if user is a driver or admin
  const roles = (session.user as any)?.roles as string[] | undefined;
  const hasAccess = Array.isArray(roles)
    ? roles.includes("DRIVER") || roles.includes("ADMIN")
    : false;

  if (!hasAccess) {
    return { error: "Unauthorized" };
  }

  // Validate URL
  if (!imageUrl || !imageUrl.startsWith("https://")) {
    return { error: "Invalid image URL" };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { image: imageUrl },
    });

    // Revalidate pages that show the profile photo
    revalidatePath("/driver-dashboard");
    revalidatePath("/driver-dashboard/profile");

    return { success: true };
  } catch (error) {
    console.error("Failed to update profile photo:", error);
    return { error: "Failed to update profile photo" };
  }
}

/**
 * Admin action to update any driver's photo
 */
export async function adminUpdateDriverPhoto(
  driverId: string,
  imageUrl: string,
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  // Check if user is admin
  const roles = (session.user as any)?.roles as string[] | undefined;
  const isAdmin = Array.isArray(roles) && roles.includes("ADMIN");

  if (!isAdmin) {
    return { error: "Unauthorized - Admin only" };
  }

  // Validate URL
  if (!imageUrl || !imageUrl.startsWith("https://")) {
    return { error: "Invalid image URL" };
  }

  try {
    await db.user.update({
      where: { id: driverId },
      data: { image: imageUrl },
    });

    // Revalidate admin pages
    revalidatePath(`/admin/users/${driverId}`);
    revalidatePath("/admin/users");

    return { success: true };
  } catch (error) {
    console.error("Failed to update driver photo:", error);
    return { error: "Failed to update profile photo" };
  }
}
