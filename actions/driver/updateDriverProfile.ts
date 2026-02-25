"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "../../auth";
import { revalidatePath } from "next/cache";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function requireDriver() {
  const session = await auth();
  const id =
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined);
  const roles = (session?.user as any)?.roles as string[] | undefined;

  if (!session?.user || !id) throw new Error("Unauthorized");
  if (
    !Array.isArray(roles) ||
    (!roles.includes("DRIVER") && !roles.includes("ADMIN"))
  ) {
    throw new Error("Unauthorized");
  }

  return { userId: id };
}

const UpdateDriverProfileSchema = z.object({
  name: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
});

export async function updateDriverProfile(formData: FormData) {
  const { userId } = await requireDriver();

  const parsed = UpdateDriverProfileSchema.safeParse({
    name: String(formData.get("name") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
  });

  if (!parsed.success) return { error: "Invalid data." };

  const { name, phone } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return { error: "User not found." };

    await db.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
      },
    });

    revalidatePath("/driver-dashboard/profile");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update profile." };
  }
}
