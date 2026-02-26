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
      .min(2, { message: "Name must be at least 2 characters" })
      .max(50, { message: "Name must be fewer than 50 characters" })
      .regex(/^[a-zA-ZÀ-ÿ\s'\-\.]+$/, {
        message:
          "Name can only contain letters, spaces, hyphens, and apostrophes",
      })
      .refine(
        (val) =>
          /[aeiouAEIOUàáâãäåèéêëìíîïòóôõöùúûüÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ]/.test(
            val,
          ),
        {
          message: "Please enter a valid name",
        },
      )
      .refine(
        (val) => !/[^aeiouAEIOUàáâãäåèéêëìíîïòóôõöùúûü\s'\-\.]{6,}/i.test(val),
        {
          message: "Please enter a valid name",
        },
      ),
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
