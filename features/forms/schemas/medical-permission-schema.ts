import { z } from "zod";

export const schoolYearMedicalRequirementSchema = z.object({
  schoolYearStart: z.string().regex(/^\d{4}-08-01$/),
  templateVersionId: z.string().uuid(),
});
export const eventPermissionSlipRequirementSchema = z.object({
  eventId: z.string().uuid(),
  required: z.enum(["yes", "no"]).transform((value) => value === "yes"),
  templateVersionId: z.string().uuid().or(z.literal("")).transform((value) => value || null),
}).refine((value) => !value.required || value.templateVersionId !== null, {
  message: "Select a published Permission Slip version.",
});
