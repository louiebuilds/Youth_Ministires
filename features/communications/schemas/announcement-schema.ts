import { z } from "zod";

const audience = z.enum(["ministry", "parents", "volunteers"]);

export const announcementDetailsSchema = z.object({
  announcementId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  messageBody: z.string().trim().min(1).max(10000),
  audienceType: audience,
  expiresAt: z.string().trim().max(40).transform((value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "invalid" : parsed.toISOString();
  }),
});

export const announcementIdSchema = z.object({
  announcementId: z.string().uuid(),
});

export const communicationTemplateSchema = z.object({
  templateId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(150),
  channel: z.enum(["in_app", "email", "sms"]),
  subject: z.string().trim().max(200).transform((value) => value || null),
  messageBody: z.string().trim().min(1).max(10000),
}).superRefine((value, context) => {
  if (value.channel === "email" && !value.subject) {
    context.addIssue({
      code: "custom",
      message: "Email templates require a subject.",
      path: ["subject"],
    });
  }
  if (value.channel !== "email" && value.subject) {
    context.addIssue({
      code: "custom",
      message: "Only email templates use a subject.",
      path: ["subject"],
    });
  }
});

export const communicationTemplateIdSchema = z.object({
  templateId: z.string().uuid(),
});

export const syntheticCommunicationSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subject: z.string().trim().max(200).transform((value) => value || null),
  messageBody: z.string().trim().min(1).max(10000),
  channel: z.enum(["in_app", "email", "sms"]),
  audienceType: z.enum(["parents", "volunteers"]),
  templateId: z.string().trim().transform((value) => value || null)
    .refine((value) => value === null || z.string().uuid().safeParse(value).success),
}).superRefine((value, context) => {
  if (value.channel === "email" && !value.subject) {
    context.addIssue({
      code: "custom", path: ["subject"],
      message: "Email messages require a subject.",
    });
  }
  if (value.channel !== "email" && value.subject) {
    context.addIssue({
      code: "custom", path: ["subject"],
      message: "Only email messages use a subject.",
    });
  }
});

export const notificationIdSchema = z.object({
  notificationId: z.string().uuid(),
});
