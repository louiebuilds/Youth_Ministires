import { z } from "zod";

const uuid = z.string().uuid();

export const studentCheckInSchema = z.object({
  eventId: uuid,
  studentId: uuid,
});

export const studentCheckOutSchema = z.object({
  eventId: uuid,
  studentId: uuid,
  pickupPersonId: z.string().transform((value) => value || null)
    .pipe(z.string().uuid().nullable()),
  overrideReason: z.string().trim().max(1000).transform((value) => value || null),
});

export const correctStudentCheckInSchema = z.object({
  eventId: uuid,
  studentId: uuid,
  reason: z.string().trim().min(3).max(1000),
});

export const visitorCheckInSchema = z.object({
  eventId: uuid,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  grade: z.string().trim().max(50).transform((value) => value || null),
  guardianName: z.string().trim().min(1).max(200),
  guardianContact: z.string().trim().min(3).max(320),
});

export const visitorCheckOutSchema = z.object({ visitorId: uuid });
export const familyTokenSchema = z.object({ householdId: uuid });
export const resolveFamilyTokenSchema = z.object({
  eventId: uuid,
  token: z.string().trim().min(70).max(500),
});
