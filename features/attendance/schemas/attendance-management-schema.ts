import { z } from "zod";

export const attendanceSessionSchema = z.object({
  eventId: z.string().uuid(),
  sessionDate: z.string().date(),
  className: z.string().trim().min(1).max(100),
  startsAt: z.string().transform((value) => value || null),
  endsAt: z.string().transform((value) => value || null),
});

export const attendanceRecordSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  status: z.enum(["pending", "present", "absent", "excused"]),
  notes: z.string().trim().max(1000).transform((value) => value || null),
});

export const attendanceSessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});
