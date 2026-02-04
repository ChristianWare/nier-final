import { redirect } from "next/navigation";
import PasswordResetFormClient from "@/components/auth/PasswordResetFormClient/PasswordResetFormClient";
import Nav from "@/components/shared/Nav/Nav";
import { getPasswordResetTokenByToken } from "@/lib/passwordResetToken";

export const metadata = {
  title: `Reset Password | ${process.env.CLIENT_NAME}`,
  description: `Reset your ${process.env.CLIENT_NAME} account password.`,
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  // No token? Redirect to forgot password
  if (!token) {
    redirect("/forgot-password");
  }

  // Validate token exists and isn't expired
  const tokenRecord = await getPasswordResetTokenByToken(token);
  const isValidToken =
    !!tokenRecord && new Date(tokenRecord.expires) > new Date();

  return (
    <main>
      <Nav background='white' />
      <PasswordResetFormClient
        token={token}
        isValidToken={isValidToken}
        email={tokenRecord?.email}
      />
    </main>
  );
}
