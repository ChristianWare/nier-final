import PasswordResetFormClient from "@/components/auth/PasswordResetFormClient/PasswordResetFormClient";

export const metadata = {
  title: "Reset Password | Nier Transportation",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return <PasswordResetFormClient token={token} />;
}
