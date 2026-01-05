import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import RegisterPageIntro from "@/components/registerPage/RegisterPageIntro";
import Nav from "@/components/shared/Nav/Nav";
import FinalCTA2 from "@/components/shared/FinalCTA2/FinalCTA2";
import Footer from "@/components/shared/Footer/Footer";

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect("/account");
  return (
    <main>
      <Nav />
      <RegisterPageIntro />
      <FinalCTA2 />
      <Footer />
    </main>
  );
}
