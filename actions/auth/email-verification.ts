"use server";

import { db } from "@/lib/db";
import { getUserByEmail } from "@/lib/user";
import { sendWelcomeEmail } from "@/lib/email/sendWelcome";

export const verifyEmail = async (token: string) => {
  const emailVerificationToken = await db.emailVerificationToken.findUnique({
    where: { token },
  });
  if (!emailVerificationToken)
    return { error: "Verification token does not exist!" };

  const isExpired = new Date(emailVerificationToken.expires) < new Date();
  if (isExpired) return { error: "Verification token expired!" };

  const existingUser = await getUserByEmail(emailVerificationToken.email);
  if (!existingUser) return { error: "User does not exist!" };

  const alreadyVerified = !!existingUser.emailVerified;

  await db.$transaction([
    db.user.update({
      where: { id: existingUser.id },
      data: { emailVerified: new Date(), email: emailVerificationToken.email },
    }),
    db.emailVerificationToken.delete({
      where: { id: emailVerificationToken.id },
    }),
  ]);

  if (!alreadyVerified) {
    // fire-and-forget; don’t block verification UX on email
    sendWelcomeEmail(existingUser.email, existingUser.name).catch((e) =>
      console.error("welcome email failed:", e)
    );
  }

  return { success: "Email verified!" };
};
