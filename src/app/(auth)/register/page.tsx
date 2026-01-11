/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import RegisterPageIntro from "@/components/registerPage/RegisterPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";

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

export default async function RegisterPage() {
  const session = await auth();

  if (session) {
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
      <RegisterPageIntro />
      <AboutNumbers />
    </main>
  );
}
