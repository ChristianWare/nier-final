/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import LoginPageIntro from "@/components/loginPage/LoginPageIntro/LoginPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER" | "CORPORATE";

function roleHomeFromRoles(roles: AppRole[]) {
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.includes("DRIVER")) return "/driver-dashboard";
  if (roles.includes("CORPORATE")) return "/corporate";
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const session = await auth();

  if (session) {
    console.log("SESSION DUMP:", JSON.stringify(session, null, 2));

    const user = session.user as any;
    const rawRoles =
      user?.roles ??
      (session as any)?.roles ??
      (session as any)?.token?.roles ??
      null;

    const roles: AppRole[] = Array.isArray(rawRoles)
      ? (rawRoles as AppRole[])
      : ["USER"];

    const roleBasedHome = roleHomeFromRoles(roles);

    // Role-specific areas that should never be overridden by `next`
    const roleOwnedPrefixes = [
      "/admin",
      "/driver-dashboard",
      "/corporate",
      "/dashboard",
    ];

    const resolvedParams = await searchParams;
    const next = resolvedParams?.next;

    const useNext =
      next &&
      next.startsWith("/") &&
      !roleOwnedPrefixes.some((prefix) => next.startsWith(prefix));

    redirect(useNext ? next : roleBasedHome);
  }

  return (
    <main>
      <Nav background='white' />
      <LoginPageIntro />
      <AboutNumbers />
    </main>
  );
}
