import { z } from "zod";

const localDateTime = z.string().min(1).transform((value, context) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    context.addIssue({ code: "custom", message: "Enter a valid date and time." });
    return z.NEVER;
  }
  return parsed.toISOString();
});

export const leadershipCalendarEntrySchema = z.object({
  entryId: z.uuid().optional(),
  title: z.string().trim().min(1).max(200),
  details: z.string().trim().max(2000).transform((value) => value || null),
  startsAt: localDateTime,
  endsAt: localDateTime,
  timezone: z.string().trim().min(1).max(100),
}).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
  message: "The end must be after the start.",
  path: ["endsAt"],
});

export const leadershipCalendarEntryIdSchema = z.object({ entryId: z.uuid() });
