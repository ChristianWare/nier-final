/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { db } from "@/lib/db";
import { auth } from "../../../auth";

export async function adminSearchUsers(input: { query: string }) {
  const session = await auth();

  const role = (session?.user as any)?.role ?? null;
  const roles = ((session?.user as any)?.roles ?? []) as string[];
  const isAdmin = role === "ADMIN" || roles.includes("ADMIN");

  if (!session || !isAdmin) return { users: [] as any[] };

  const q = (input.query ?? "").trim();
  if (q.length < 2) return { users: [] as any[] };

  const users = await db.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    take: 8,
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
    },
  });

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: Boolean(u.emailVerified),
      phone: u.phone ?? null, 
    })),
  };
}
