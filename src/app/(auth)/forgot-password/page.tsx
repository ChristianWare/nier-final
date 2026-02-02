import PasswordEmailForm from "@/components/auth/PasswordEmailForm/PasswordEmailForm";
import Nav from "@/components/shared/Nav/Nav";

export const metadata = {
  title: "Forgot Password | Nier Transportation",
};

export default function ForgotPasswordPage() {
  return (
    <main>
      <Nav background='white' />
      <PasswordEmailForm />
    </main>
  );
}
