import { z } from "zod";

const studentStatuses = [
  "prospective",
  "registered",
  "active",
  "inactive",
  "archived",
] as const;

const optionalQueryText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || null);

export const memberDirectoryQuerySchema = z.object({
  q: optionalQueryText(100),
  grade: optionalQueryText(40),
  status: z.enum(studentStatuses).optional().nullable(),
  tag: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => value || null),
});
