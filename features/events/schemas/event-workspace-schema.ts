import { z } from "zod";

export const eventWorkspaceSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string(),
  eventType: z.string(),
  status: z.enum(["draft", "published", "active", "completed", "archived"]),
  description: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  timezone: z.string(),
  capacity: z.number().int().nullable(),
  campus: z.string().nullable(),
  building: z.string().nullable(),
  room: z.string().nullable(),
  address: z.string().nullable(),
  meetingInstructions: z.string().nullable(),
  canManage: z.boolean(),
});
