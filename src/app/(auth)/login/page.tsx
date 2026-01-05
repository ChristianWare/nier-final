import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import LoginPageIntro from "@/components/loginPage/LoginPageIntro/LoginPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import Footer from "@/components/shared/Footer/Footer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/account");
  return (
    <main>
      <Nav />
      <LoginPageIntro />
      <Footer />
    </main>
  );
}
