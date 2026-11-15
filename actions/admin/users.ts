/* eslint-disable @typescript-eslint/no-explicit-any */
// actions/admin/users.ts
"use server";

import { db } from "@/lib/db";
import { auth } from "../../auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

type AppRole = "USER" | "DRIVER" | "ADMIN" | "CORPORATE";

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

      // Prevent removing ADMIN from the last remaining admin
      if (hadAdmin && !willHaveAdmin) {
        const adminCount = await tx.user.count({
          where: { roles: { has: "ADMIN" } },
        });

        if (adminCount <= 1) {
          throw new Error("There needs to be at least 1 admin");
        }
      }

      // CORPORATE isn't one of the toggles: it comes with a link to a
      // corporate account (linkUserToCorporateAccount below). Keep it.
      const finalRoles: AppRole[] = currentRoles.includes("CORPORATE")
        ? Array.from(new Set<AppRole>([...nextRoles, "CORPORATE"]))
        : nextRoles;

      await tx.user.update({
        where: { id: userId },
        data: {
          roles: finalRoles as unknown as any,
        },
      });
    });

    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update roles." };
  }
}

const UpdateProfileSchema = z.object({
  userId: z.string().min(1),
  phone: z.string().trim().max(30).optional().nullable(),
  name: z.string().trim().max(100).optional().nullable(),
});

export async function updateUserProfile(formData: FormData) {
  await requireAdmin();

  const parsed = UpdateProfileSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    phone: String(formData.get("phone") ?? "").trim() || null,
    name: String(formData.get("name") ?? "").trim() || null,
  });

  if (!parsed.success) return { error: "Invalid data." };

  const { userId, phone, name } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) return { error: "User not found." };

    await db.user.update({
      where: { id: userId },
      data: {
        ...(phone !== undefined && { phone }),
        ...(name !== undefined && { name }),
      },
    });

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/users");

    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update profile." };
  }
}

/* ─────────────────────────────────────────────
   CORPORATE ACCESS
   A user can use the corporate portal (/corporate) when they have the
   CORPORATE role and are a contact on a corporate account. Linking does
   both; unlinking the last account takes the role away again.
   ───────────────────────────────────────────── */

const CorporateLinkSchema = z.object({
  userId: z.string().min(1),
  accountId: z.string().min(1),
});

export async function linkUserToCorporateAccount(
  userId: string,
  accountId: string,
) {
  await requireAdmin();

  const parsed = CorporateLinkSchema.safeParse({ userId, accountId });
  if (!parsed.success) return { error: "Choose a corporate account." };

  try {
    const accountName = await db.$transaction(async (tx) => {
      const [user, account] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            roles: true,
          },
        }),
        tx.corporateAccount.findUnique({
          where: { id: accountId },
          select: { id: true, name: true },
        }),
      ]);
      if (!user) throw new Error("User not found.");
      if (!account) throw new Error("Corporate account not found.");

      // A contact who can book and manage rides for the company.
      await tx.corporateContact.upsert({
        where: {
          corporateAccountId_userId: {
            corporateAccountId: account.id,
            userId: user.id,
          },
        },
        create: {
          corporateAccountId: account.id,
          userId: user.id,
          role: "ADMIN",
          phone: user.phone ?? undefined,
        },
        update: { active: true },
      });

      // On the passenger list too, so they can book rides for themselves.
      if (user.email) {
        const onRoster = await tx.corporatePassenger.findFirst({
          where: { corporateAccountId: account.id, email: user.email },
          select: { id: true },
        });
        if (!onRoster) {
          await tx.corporatePassenger.create({
            data: {
              corporateAccountId: account.id,
              name: user.name?.trim() || user.email,
              email: user.email,
              phone: user.phone ?? null,
              active: true,
            },
          });
        }
      }

      const roles = (user.roles ?? []) as unknown as AppRole[];
      if (!roles.includes("CORPORATE")) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            roles: Array.from(
              new Set<AppRole>([...roles, "USER", "CORPORATE"]),
            ) as unknown as any,
          },
        });
      }

      return account.name;
    });

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath(`/admin/corporate/${accountId}`);
    return { success: true, accountName };
  } catch (err: any) {
    return { error: err?.message || "Couldn't link the account." };
  }
}

export async function unlinkUserFromCorporateAccount(
  userId: string,
  accountId: string,
) {
  await requireAdmin();

  const parsed = CorporateLinkSchema.safeParse({ userId, accountId });
  if (!parsed.success) return { error: "Invalid request." };

  try {
    await db.$transaction(async (tx) => {
      const contact = await tx.corporateContact.findUnique({
        where: {
          corporateAccountId_userId: { corporateAccountId: accountId, userId },
        },
        select: { id: true, role: true },
      });
      if (!contact) return;

      // The primary contact gets the invoices; the account needs one.
      if (contact.role === "PRIMARY") {
        throw new Error(
          "This is the account's primary contact, who receives its invoices, so they can't be removed here.",
        );
      }

      await tx.corporateContact.delete({ where: { id: contact.id } });

      const remaining = await tx.corporateContact.count({ where: { userId } });
      if (remaining === 0) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { roles: true },
        });
        const roles = ((user?.roles ?? []) as unknown as AppRole[]).filter(
          (r) => r !== "CORPORATE",
        );
        await tx.user.update({
          where: { id: userId },
          data: {
            roles: (roles.length ? roles : ["USER"]) as unknown as any,
          },
        });
      }
    });

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath(`/admin/corporate/${accountId}`);
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Couldn't remove the account." };
  }
}
