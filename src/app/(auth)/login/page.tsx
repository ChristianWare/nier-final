/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import LoginPageIntro from "@/components/loginPage/LoginPageIntro/LoginPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function derivePrimaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("DRIVER")) return "DRIVER";
  return "USER";
}

function roleHomeFromRoles(roles: AppRole[]) {
  const primary = derivePrimaryRole(roles);
  if (primary === "ADMIN") return "/admin";
  if (primary === "DRIVER") return "/driver-dashboard";
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

    const roles: AppRole[] = (session.user as any)?.roles?.length
      ? ((session.user as any).roles as AppRole[])
      : (session.user as any)?.role
        ? ([(session.user as any).role] as AppRole[])
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
