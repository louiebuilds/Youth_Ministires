import { z } from "zod";

const optionalDate = z.union([z.literal(""), z.iso.date()]);

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000),
  documentKind: z.enum(["permission_slip", "medical_release"]),
});

export const versionDraftSchema = z
  .object({
    templateId: z.string().uuid(),
    versionId: z.union([z.literal(""), z.string().uuid()]).default(""),
    validityPolicy: z.enum([
      "event_specific",
      "fixed_interval",
      "explicit_expiration",
    ]),
    validFor: z.string().trim().max(100),
    explicitExpiresOn: optionalDate,
    effectiveFrom: optionalDate,
    effectiveTo: optionalDate,
  })
  .superRefine((value, context) => {
    if (value.validityPolicy === "fixed_interval" && !value.validFor) {
      context.addIssue({
        code: "custom",
        message: "A validity interval is required.",
        path: ["validFor"],
      });
    }
    if (
      value.validityPolicy === "explicit_expiration" &&
      !value.explicitExpiresOn
    ) {
      context.addIssue({
        code: "custom",
        message: "An expiration date is required.",
        path: ["explicitExpiresOn"],
      });
    }
    if (
      value.effectiveFrom &&
      value.effectiveTo &&
      value.effectiveTo < value.effectiveFrom
    ) {
      context.addIssue({
        code: "custom",
        message: "The effective end cannot precede the start.",
        path: ["effectiveTo"],
      });
    }
  });

export const templateIdSchema = z.string().uuid();
export const versionIdSchema = z.string().uuid();
