/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import LoginPageIntro from "@/components/loginPage/LoginPageIntro/LoginPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function roleHomeFromRoles(roles: AppRole[]) {
  // priority: ADMIN > DRIVER > USER
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.includes("DRIVER")) return "/driver-dashboard";
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const session = await auth();

  if (session) {
    const next = searchParams?.next;
    if (next && next.startsWith("/")) redirect(next);

    const roles: AppRole[] = Array.isArray((session.user as any)?.roles)
      ? (((session.user as any).roles as AppRole[]) ?? ["USER"])
      : (["USER"] as AppRole[]);

    redirect(roleHomeFromRoles(roles));
  }

  return (
    <main>
      <Nav background='white' />
      <LoginPageIntro />
      <AboutNumbers />
    </main>
  );
}
