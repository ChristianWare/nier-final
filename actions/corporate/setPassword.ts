// actions/corporate/setPassword.ts
"use server";

import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";
import {
  validatePasswordSetToken,
  clearPasswordSetToken,
} from "@/lib/corporateOnboarding";

export async function setCorporatePassword(token: string, password: string) {
  // ─── Validate token ───
  const user = await validatePasswordSetToken(token);
  if (!user) {
    return {
      ok: false,
      error:
        "Invalid or expired link. Please contact Nier Transportation for a new one.",
    };
  }

  // ─── Validate password requirements ───
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      ok: false,
      error: "Password must contain at least one uppercase letter.",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      ok: false,
      error: "Password must contain at least one number.",
    };
  }

  try {
    // ─── Hash and save password ───
    const hashed = await bcryptjs.hash(password, 10);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        emailVerified: new Date(), // mark email as verified since they clicked the link
      },
    });

    // ─── Clear the token so it can't be reused ───
    await clearPasswordSetToken(user.id);

    return { ok: true };
  } catch (err) {
    console.error("setCorporatePassword error:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
