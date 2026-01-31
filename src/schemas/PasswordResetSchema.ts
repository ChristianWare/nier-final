import { z } from "zod";

const passwordRequirements = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasNumber: /[0-9]/,
};

export const PasswordResetSchema = z
  .object({
    password: z
      .string()
      .min(passwordRequirements.minLength, {
        message: `Password must be at least ${passwordRequirements.minLength} characters`,
      })
      .regex(passwordRequirements.hasUppercase, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(passwordRequirements.hasNumber, {
        message: "Password must contain at least one number",
      }),
    confirmPassword: z.string(),
  })
  .refine(
    (values) => {
      return values.password === values.confirmPassword;
    },
    {
      message: "Passwords must match!",
      path: ["confirmPassword"],
    },
  );

export type PasswordResetSchemaType = z.infer<typeof PasswordResetSchema>;

export { passwordRequirements };
