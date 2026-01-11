/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import RegisterPageIntro from "@/components/registerPage/RegisterPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";

type AppRole = "USER" | "ADMIN" | "DRIVER";

function roleHomeFromRoles(roles: AppRole[]) {
  // priority: ADMIN > DRIVER > USER
  if (roles.includes("ADMIN")) return "/admin";
  if (roles.includes("DRIVER")) return "/driver-dashboard";
  return "/dashboard";
}

export default async function RegisterPage() {
  const session = await auth();

  if (session) {
    const roles: AppRole[] = Array.isArray((session.user as any)?.roles)
      ? (((session.user as any).roles as AppRole[]) ?? ["USER"])
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
