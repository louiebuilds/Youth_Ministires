import { z } from "zod";

const accountRoles = [
  "platform_administrator",
  "youth_pastor",
  "staff_member",
  "volunteer",
  "parent",
] as const;

export const createManagedInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter an email address.")
    .max(320, "Enter a valid email address.")
    .email("Enter a valid email address."),
  intendedPrimaryRole: z.enum(accountRoles),
  expirationDays: z
    .enum(["7", "14", "30"])
    .transform((value) => Number(value)),
});

export type CreateManagedInvitationInput = z.infer<
  typeof createManagedInvitationSchema
>;

export const revokeManagedInvitationSchema = z.object({
  invitationId: z.string().uuid(),
});
