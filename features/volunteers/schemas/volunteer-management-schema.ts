import { z } from "zod";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null);
const optionalDate = z.string().transform((value) => value || null);

export const volunteerProfileSchema = z.object({
  profileId: z.string().uuid(),
  ministryTitle: optionalText(100),
  backgroundCheckStatus: z.enum([
    "not_required", "pending", "cleared", "review_required", "expired",
  ]),
  backgroundCheckCompletedAt: optionalDate,
  backgroundCheckExpiresAt: optionalDate,
  backgroundCheckReference: optionalText(100),
  isActive: z.boolean(),
});

export const certificationSchema = z.object({
  id: z.string().uuid().nullable(),
  profileId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  issuer: optionalText(100),
  issuedAt: optionalDate,
  expiresAt: optionalDate,
  status: z.enum(["active", "expired", "revoked"]),
  reference: optionalText(100),
});

export const skillSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  description: optionalText(300),
});

export const skillAssignmentSchema = z.object({
  profileId: z.string().uuid(),
  skillId: z.string().uuid(),
  skillLevel: z.enum(["interested", "beginner", "proficient", "advanced"]),
  notes: optionalText(500),
});

export const availabilitySchema = z.object({
  id: z.string().uuid().nullable(),
  profileId: z.string().uuid(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startsAt: z.string().regex(/^\d{2}:\d{2}$/),
  endsAt: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().trim().min(1).max(100),
  effectiveFrom: z.string().date(),
  effectiveUntil: optionalDate,
  notes: optionalText(500),
});

export const volunteerScheduleSchema = z.object({
  eventId: z.string().uuid(),
  profileId: z.string().uuid(),
  assignmentRole: z.string().trim().min(1).max(100),
  startsAt: z.string().transform((value) => value || null),
  endsAt: z.string().transform((value) => value || null),
});

export const assignmentStatusSchema = z.object({
  assignmentId: z.string().uuid(),
  profileId: z.string().uuid(),
  status: z.enum([
    "assigned", "confirmed", "declined", "cancelled", "completed",
  ]),
});
