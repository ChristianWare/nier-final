/* eslint-disable @typescript-eslint/no-explicit-any */
// actions/admin/users.ts
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { z } from "zod";

type AppRole = "USER" | "DRIVER" | "ADMIN";

async function requireAdmin() {
  const session = await auth();
  const roles =
    session?.user?.roles ?? (session?.user?.role ? [session.user.role] : []);

  if (!session?.user?.userId || !roles.includes("ADMIN")) {
    throw new Error("Unauthorized");
  }

  return session;
}

const RoleEnum = z.enum(["USER", "DRIVER", "ADMIN"]);

function derivePrimaryRole(roles: AppRole[]): AppRole {
  // priority: ADMIN > DRIVER > USER
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("DRIVER")) return "DRIVER";
  return "USER";
}

const UpdateRolesSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(RoleEnum).min(1),
});

export async function updateUserRoles(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const rolesRaw = formData.getAll("roles").map(String).filter(Boolean);

  const parsed = UpdateRolesSchema.safeParse({
    userId,
    roles: rolesRaw,
  });

  if (!parsed.success) return { error: "Invalid role update." };

  const nextRoles = Array.from(new Set(parsed.data.roles)) as AppRole[];

  if (nextRoles.length === 0) {
    return { error: "User must have at least 1 role." };
  }

  try {
    await db.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, roles: true },
      });

      if (!target) {
        throw new Error("User not found.");
      }

      const currentRoles: AppRole[] =
        target.roles && target.roles.length > 0
          ? (target.roles as unknown as AppRole[])
          : ([target.role] as unknown as AppRole[]);

      const hadAdmin = currentRoles.includes("ADMIN");
      const willHaveAdmin = nextRoles.includes("ADMIN");

      // ✅ Prevent removing ADMIN from the last remaining admin
      if (hadAdmin && !willHaveAdmin) {
        const adminCount = await tx.user.count({
          where: {
            OR: [
              { roles: { has: "ADMIN" } },
              { role: "ADMIN" }, // legacy support during transition
            ],
          },
        });

        if (adminCount <= 1) {
          // exact toast message user requested
          throw new Error("There needs to be at least 1 admin");
        }
      }

      const primary = derivePrimaryRole(nextRoles);

      // ✅ Update both fields during transition
      await tx.user.update({
        where: { id: userId },
        data: {
          roles: nextRoles as unknown as any,
          role: primary as unknown as any,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update roles." };
  }
}
