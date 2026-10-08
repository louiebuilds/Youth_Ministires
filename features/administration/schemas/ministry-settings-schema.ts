import { z } from "zod";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null);

export const ministrySettingsSchema = z.object({
  contactEmail: z.union([
    z.literal("").transform(() => null),
    z.email("Enter a valid contact email.").max(320),
  ]),
  contactPhone: optionalText(50),
  defaultCampusName: optionalText(150),
  defaultCommunicationChannel: z.enum(["in_app", "email", "sms"]),
  defaultEventAddress: optionalText(300),
  familyCheckinInstructions: z.string().trim().min(1).max(1000).superRefine(
    (value, context) => {
      const normalized = value.toLowerCase();
      if (
        !normalized.includes("household") ||
        !normalized.includes("does not authorize") ||
        (!normalized.includes("pickup") && !normalized.includes("release"))
      ) {
        context.addIssue({
          code: "custom",
          message: "Keep the household identification and pickup/release safety statement.",
        });
      }
    },
  ),
  ministryDisplayName: z.string().trim().min(1).max(150),
  timezone: z.literal("America/Chicago"),
});
