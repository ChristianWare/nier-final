"use server";

import {
  generatePasswordResetToken,
  sendPasswordResetEmail,
} from "@/lib/passwordResetToken";
import { getUserByEmail } from "@/lib/user";
import {
  PasswordEmailSchema,
  PasswordEmailSchemaType,
} from "@/schemas/PasswordEmailSchema";

export const passwordEmail = async (values: PasswordEmailSchemaType) => {
  const validated = PasswordEmailSchema.safeParse(values);
  if (!validated.success) return { error: "Invalid email!" };

  const { email } = validated.data;

  const user = await getUserByEmail(email);
  if (!user || !user.email) return { error: "User not found!" };

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
