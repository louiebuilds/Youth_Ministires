import { z } from "zod";

const optionalUuid = z.preprocess(
  (value) => value === "" || value === undefined || value === null ? null : value,
  z.uuid().nullable(),
);

export const prayerRequestSchema = z.object({
  personId: z.uuid(),
  categoryId: optionalUuid,
  title: z.string().trim().min(1).max(200),
  requestDetails: z.string().trim().min(1).max(10000),
  visibility: z.enum(["public", "leadership", "private"]),
});

export const editPrayerRequestSchema = prayerRequestSchema.extend({
  prayerRequestId: z.uuid(),
});

export const answerPrayerRequestSchema = z.object({
  prayerRequestId: z.uuid(),
  answerSummary: z.string().trim().min(1).max(5000),
});

export const prayerRequestIdSchema = z.object({
  prayerRequestId: z.uuid(),
});

export const careNoteSchema = z.object({
  personId: z.uuid(),
  categoryId: optionalUuid,
  title: z.string().trim().min(1).max(200),
  noteContent: z.string().trim().min(1).max(10000),
  occurredAt: z.preprocess(
    (value) => value === "" ? null : value,
    z.iso.datetime({ local: true }).nullable(),
  ),
});

export const careNoteIdSchema = z.object({
  careNoteId: z.uuid(),
});

export const editCareNoteSchema = careNoteSchema.extend({
  careNoteId: z.uuid(),
});

export const careFollowUpSchema = z.object({
  personId: z.uuid(),
  assignedToProfileId: z.uuid(),
  careNoteId: optionalUuid,
  title: z.string().trim().min(1).max(200),
  instructions: z.preprocess(
    (value) => value === "" ? null : value,
    z.string().trim().min(1).max(5000).nullable(),
  ),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueAt: z.preprocess(
    (value) => value === "" ? null : value,
    z.iso.datetime({ local: true }).nullable(),
  ),
});

export const editCareFollowUpSchema = careFollowUpSchema.extend({
  careFollowUpId: z.uuid(),
  status: z.enum(["pending", "in_progress"]),
});

export const completeFollowUpSchema = z.object({
  careFollowUpId: z.uuid(),
  completionNotes: z.preprocess(
    (value) => value === "" ? null : value,
    z.string().trim().min(1).max(5000).nullable(),
  ),
});

export const cancelFollowUpSchema = z.object({
  careFollowUpId: z.uuid(),
  cancellationReason: z.string().trim().min(1).max(1000),
});