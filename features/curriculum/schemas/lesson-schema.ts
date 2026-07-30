import { z } from "zod";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null);

export const lessonDetailsSchema = z.object({
  lessonId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  summary: optionalText(4000),
  teachingObjective: optionalText(2000),
  scriptureReferences: optionalText(1000),
  lessonBody: optionalText(50000),
  discussionGuide: optionalText(20000),
  preparationNotes: optionalText(10000),
  audience: optionalText(150),
  status: z.enum(["draft", "published"]),
});

export const archiveLessonSchema = z.object({
  lessonId: z.string().uuid(),
});

export const lessonWorkspaceSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string(),
  summary: z.string().nullable(),
  teachingObjective: z.string().nullable(),
  scriptureReferences: z.string().nullable(),
  lessonBody: z.string().nullable(),
  discussionGuide: z.string().nullable(),
  preparationNotes: z.string().nullable(),
  audience: z.string().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  canManage: z.boolean(),
});
