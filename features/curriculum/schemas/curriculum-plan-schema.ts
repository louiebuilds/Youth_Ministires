import { z } from "zod";

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null);
const optionalDate = z.string().transform((value) => value || null).pipe(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
);

export const curriculumPlanDetailsSchema = z.object({
  curriculumPlanId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  summary: optionalText(4000),
  audience: optionalText(150),
  status: z.enum(["draft", "published", "completed"]),
  startsOn: optionalDate,
  endsOn: optionalDate,
});

export const curriculumPlanWorkspaceSchema = z.object({
  curriculumPlanId: z.string().uuid(),
  title: z.string(),
  summary: z.string().nullable(),
  audience: z.string().nullable(),
  status: z.enum(["draft", "published", "completed", "archived"]),
  startsOn: z.string().nullable(),
  endsOn: z.string().nullable(),
  canManage: z.boolean(),
});

export const curriculumPlanLessonSchema = z.object({
  curriculumPlanId: z.string().uuid(),
  lessonId: z.string().uuid(),
});

export const removeCurriculumPlanLessonSchema = z.object({
  curriculumPlanId: z.string().uuid(),
  planLessonId: z.string().uuid(),
});

export const moveCurriculumPlanLessonSchema = z.object({
  curriculumPlanId: z.string().uuid(),
  planLessonId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

export const archiveCurriculumPlanSchema = z.object({
  curriculumPlanId: z.string().uuid(),
});
