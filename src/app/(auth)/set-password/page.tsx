// src/app/set-password/page.tsx
import { redirect } from "next/navigation";
import Nav from "@/components/shared/Nav/Nav";
import SetPasswordFormClient from "./SetPasswordFormClient";
import { validatePasswordSetToken } from "@/lib/corporateOnboarding";

export const runtime = "nodejs";

export const metadata = {
  title: `Set Your Password | ${process.env.CLIENT_NAME || "Nier Transportation"}`,
  description: "Set your password to access your corporate account dashboard.",
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function SetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  // No token? Redirect to login
  if (!token) {
    redirect("/login");
  }

  // Validate token exists and isn't expired
  const user = await validatePasswordSetToken(token);
  const isValidToken = !!user;

  return (
    <main>
      <Nav background='white' />
      <SetPasswordFormClient
        token={token}
        isValidToken={isValidToken}
        email={user?.email ?? undefined}
        name={user?.name ?? undefined}
      />
    </main>
  );
}
