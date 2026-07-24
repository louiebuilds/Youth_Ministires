import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(254, "Enter a valid email address.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(1024, "Password is too long."),
});

export type LoginInput = z.infer<typeof loginSchema>;
