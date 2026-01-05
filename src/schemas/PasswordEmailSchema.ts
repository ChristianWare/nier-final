import { z } from "zod";

export const PasswordEmailSchema = z.object({
  email: z.string().email(),
});

export type PasswordEmailSchemaType = z.infer<typeof PasswordEmailSchema>;
