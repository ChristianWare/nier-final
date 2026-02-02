import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import PasswordEmailForm from "@/components/auth/PasswordEmailForm/PasswordEmailForm";
import Nav from "@/components/shared/Nav/Nav";

export const metadata = {
  title: "Forgot Password | Nier Transportation",
};

export default async function ForgotPasswordPage() {
  const session = await auth();

  // Already logged in? Redirect to profile to change password there
  if (session) {
    redirect("/dashboard/profile");
  }

  return (
    <main>
      <Nav background='white' />
      <PasswordEmailForm />
    </main>
  );
}
