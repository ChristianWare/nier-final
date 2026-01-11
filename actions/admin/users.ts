/* eslint-disable @typescript-eslint/no-explicit-any */
// actions/admin/users.ts
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { z } from "zod";

type AppRole = "USER" | "DRIVER" | "ADMIN";

function getActorId(session: any) {
  return (
    (session?.user?.id as string | undefined) ??
    (session?.user?.userId as string | undefined)
  );
}

function getSessionRoles(session: any): AppRole[] {
  const roles = session?.user?.roles;
  return Array.isArray(roles) && roles.length > 0 ? (roles as AppRole[]) : [];
}

async function requireAdmin() {
  const session = await auth();
  const actorId = getActorId(session);
  const roles = getSessionRoles(session);

  if (!session?.user || !actorId || !roles.includes("ADMIN")) {
    throw new Error("Unauthorized");
  }

  return { session, actorId, roles };
}

const RoleEnum = z.enum(["USER", "DRIVER", "ADMIN"]);

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
        select: { id: true, roles: true },
      });

      if (!target) {
        throw new Error("User not found.");
      }

      const currentRoles: AppRole[] =
        Array.isArray(target.roles) && target.roles.length > 0
          ? (target.roles as unknown as AppRole[])
          : (["USER"] as AppRole[]);

      const hadAdmin = currentRoles.includes("ADMIN");
      const willHaveAdmin = nextRoles.includes("ADMIN");

      // ✅ Prevent removing ADMIN from the last remaining admin (roles-only)
      if (hadAdmin && !willHaveAdmin) {
        const adminCount = await tx.user.count({
          where: { roles: { has: "ADMIN" } },
        });

        if (adminCount <= 1) {
          throw new Error("There needs to be at least 1 admin");
        }
      }

      // ✅ Update roles only
      await tx.user.update({
        where: { id: userId },
        data: {
          roles: nextRoles as unknown as any,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update roles." };
  }
}
