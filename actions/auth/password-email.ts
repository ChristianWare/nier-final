"use server";

import {
  generatePasswordResetToken,
  getPasswordResetTokenByEmail,
  sendPasswordResetEmail,
} from "@/lib/passwordResetToken";
import { getUserByEmail } from "@/lib/user";
import {
  PasswordEmailSchema,
  PasswordEmailSchemaType,
} from "@/schemas/PasswordEmailSchema";

// Minimum time (in minutes) before allowing a new reset email
const RESEND_COOLDOWN_MINUTES = 5;

export const passwordEmail = async (values: PasswordEmailSchemaType) => {
  const validated = PasswordEmailSchema.safeParse(values);
  if (!validated.success) return { error: "Invalid email!" };

  const { email } = validated.data;

  const user = await getUserByEmail(email);
  if (!user || !user.email) {
    // Don't reveal whether email exists for security
    // Still return success to prevent email enumeration
    return { success: "If an account exists, a password reset link was sent." };
  }

  // Check for existing unexpired token
  const existingToken = await getPasswordResetTokenByEmail(email);

  if (existingToken) {
    const now = new Date();
    const tokenExpires = new Date(existingToken.expires);
    const tokenCreatedAt = new Date(
      tokenExpires.getTime() - 60 * 60 * 1000, // Token expires in 1 hour, so created = expires - 1hr
    );

    // Check if token was created within cooldown period
    const cooldownMs = RESEND_COOLDOWN_MINUTES * 60 * 1000;
    const timeSinceCreated = now.getTime() - tokenCreatedAt.getTime();

    if (timeSinceCreated < cooldownMs) {
      const minutesRemaining = Math.ceil(
        (cooldownMs - timeSinceCreated) / 60000,
      );
      return {
        error: `A reset email was recently sent. Please check your inbox or wait ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""} before requesting another.`,
        alreadySent: true,
      };
    }

    // Token exists but cooldown passed - check if expired
    if (tokenExpires > now) {
      // Token still valid but cooldown passed - allow resend
      // The generatePasswordResetToken will delete the old one
    }
  }

  const token = await generatePasswordResetToken(email);
  const result = await sendPasswordResetEmail(token.email, token.token);

  if (result.error) {
    return {
      error:
        typeof result.error === "string"
          ? result.error
          : "Something went wrong while sending the password reset email!",
    };
  }

  return { success: "Password reset link was sent to your email!" };
};
