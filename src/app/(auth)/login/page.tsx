import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import LoginPageIntro from "@/components/loginPage/LoginPageIntro/LoginPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import Footer from "@/components/shared/Footer/Footer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function roleHome(role?: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "DRIVER") return "/driver-dashboard";
  return "/dashboard";
}

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect(roleHome(session.user.role));
  return (
    <main>
      <Nav background='white' />
      <LoginPageIntro />
      <Footer />
    </main>
  );
}
