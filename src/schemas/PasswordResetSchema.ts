import { z } from "zod";

export const PasswordResetSchema = z
  .object({
    password: z.string().min(6, {
      message: "Password must be at least 6 characters",
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
    }
  );

export type PasswordResetSchemaType = z.infer<typeof PasswordResetSchema>;
