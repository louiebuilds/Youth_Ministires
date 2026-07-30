import { z } from "zod";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null);

const optionalCapacity = z.preprocess(
  (value) => value === "" ? null : value,
  z.coerce.number().int().min(0).max(100000).nullable(),
);

export const eventDetailsSchema = z.object({
  eventId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  eventType: z.string().trim().min(1).max(100),
  status: z.enum(["draft", "published", "active", "completed"]),
  description: optionalText(4000),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  timezone: z.string().trim().min(1).max(100),
  capacity: optionalCapacity,
  campus: optionalText(150),
  building: optionalText(150),
  room: optionalText(100),
  address: optionalText(300),
  meetingInstructions: optionalText(2000),
});

export const archiveEventSchema = z.object({ eventId: z.string().uuid() });

export const eventRegistrationSettingsSchema = z.object({
  eventId: z.string().uuid(),
  capacity: optionalCapacity,
  waitlistCapacity: optionalCapacity,
  registrationOpensAt: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .nullable(),
  registrationClosesAt: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .nullable(),
}).superRefine((value, context) => {
  const hasOpen = value.registrationOpensAt !== null;
  const hasClose = value.registrationClosesAt !== null;
  if (hasOpen !== hasClose) {
    context.addIssue({
      code: "custom",
      message: "Enter both registration dates or leave both blank.",
    });
  }
  if (value.registrationOpensAt && value.registrationClosesAt &&
    value.registrationClosesAt <= value.registrationOpensAt) {
    context.addIssue({
      code: "custom",
      message: "Registration must close after it opens.",
    });
  }
});
