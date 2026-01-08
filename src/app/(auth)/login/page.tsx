import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import LoginPageIntro from "@/components/loginPage/LoginPageIntro/LoginPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function roleHome(role?: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "DRIVER") return "/driver-dashboard";
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
    redirect(roleHome(session.user.role));
  }

  return (
    <main>
      <Nav background='white' />
      <LoginPageIntro />
      <AboutNumbers />
    </main>
  );
}
