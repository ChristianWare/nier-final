// src/lib/sessionUser.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../auth";

/** The signed-in user's id, or null when nobody is signed in. */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  const user: any = session?.user ?? null;
  return (user?.id ?? user?.userId ?? null) as string | null;
}

/** The signed-in user's id when that user is an admin, otherwise null. */
export async function getAdminUserId(): Promise<string | null> {
  const session = await auth();
  const user: any = session?.user ?? null;
  const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
  const id = (user?.id ?? user?.userId ?? null) as string | null;
  if (!id || !roles.includes("ADMIN")) return null;
  return id;
}
