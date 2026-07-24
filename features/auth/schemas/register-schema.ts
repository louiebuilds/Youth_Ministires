import { z } from "zod";

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Enter your email address.")
      .max(254, "Enter a valid email address.")
      .email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(1024, "Password is too long."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
