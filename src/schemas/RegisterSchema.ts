import { z } from "zod";

// Password requirements
const passwordRequirements = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasNumber: /[0-9]/,
};

export const RegisterSchema = z
  .object({
    name: z
      .string()
      .min(4, { message: "Name must be at least 4 characters" })
      .max(30, { message: "Name must be fewer than 30 characters" }),
    email: z.string().email(),
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
      message: "Passwords must match",
      path: ["confirmPassword"],
    },
  );

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;

// Export for use in UI components
export { passwordRequirements };
