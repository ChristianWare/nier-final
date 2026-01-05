"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { z } from "zod";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.userId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

const UpdateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "DRIVER", "ADMIN"]),
});

export async function updateUserRole(formData: FormData) {
  await requireAdmin();

  const parsed = UpdateRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid role update." };

  const { userId, role: nextRole } = parsed.data;

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });

  if (!target) return { error: "User not found." };

  // ✅ Prevent demoting the last remaining ADMIN
  if (target.role === "ADMIN" && nextRole !== "ADMIN") {
    const adminCount = await db.user.count({ where: { role: "ADMIN" } });

    if (adminCount <= 1) {
      return {
        error:
          "There needs to be at least 1 admin. Create another admin before changing this role.",
      };
    }
  }

  await db.user.update({
    where: { id: userId },
    data: { role: nextRole },
  });

  return { success: true };
}
