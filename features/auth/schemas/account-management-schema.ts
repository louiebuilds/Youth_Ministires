import { z } from "zod";

const accountRoles = [
  "platform_administrator",
  "youth_pastor",
  "staff_member",
  "volunteer",
  "parent",
] as const;

const accountStatuses = [
  "invited",
  "active",
  "suspended",
  "disabled",
  "archived",
] as const;

export const accountSearchSchema = z
  .string()
  .trim()
  .max(100, "Search must be 100 characters or fewer.");

export const updateManagedAccountSchema = z.object({
  profileId: z.string().uuid("The selected account is invalid."),
  displayName: z
    .string()
    .trim()
    .min(1, "Enter a display name.")
    .max(150, "Display name must be 150 characters or fewer."),
  primaryRole: z.enum(accountRoles),
  status: z.enum(accountStatuses),
});
