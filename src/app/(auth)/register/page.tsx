import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import RegisterPageIntro from "@/components/registerPage/RegisterPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import AboutNumbers from "@/components/shared/AboutNumbers/AboutNumbers";

function roleHome(role?: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "DRIVER") return "/driver-dashboard";
  return "/dashboard";
}

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect(roleHome(session.user.role));
  return (
    <main>
      <Nav background='white' />
      <RegisterPageIntro />
      <AboutNumbers />
    </main>
  );
}
