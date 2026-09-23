import "server-only";

import { randomUUID } from "node:crypto";

import { lessonWorkspaceSchema } from "@/features/curriculum/schemas/lesson-schema";
import { curriculumPlanWorkspaceSchema } from "@/features/curriculum/schemas/curriculum-plan-schema";
import { createClient } from "@/lib/supabase/server";

import type {
  CurriculumPlanEntry,
  CurriculumPlanLesson,
  CurriculumPlanWorkspace,
  LessonLibraryEntry,
  LessonWorkspace,
  TeachingResource,
} from "@/features/curriculum/types/curriculum";
import type { LessonStatus } from "@/lib/supabase/database.types";
import type { CurriculumStatus } from "@/lib/supabase/database.types";

type LessonInput = {
  title: string;
  summary: string | null;
  teachingObjective: string | null;
  scriptureReferences: string | null;
  lessonBody: string | null;
  discussionGuide: string | null;
  preparationNotes: string | null;
  audience: string | null;
  status: Exclude<LessonStatus, "archived">;
};

const rpcInput = (input: LessonInput) => ({
  p_title: input.title,
  p_summary: input.summary,
  p_teaching_objective: input.teachingObjective,
  p_scripture_references: input.scriptureReferences,
  p_lesson_body: input.lessonBody,
  p_discussion_guide: input.discussionGuide,
  p_preparation_notes: input.preparationNotes,
  p_audience: input.audience,
  p_status: input.status,
});

export async function listLessonLibrary(input: {
  search: string | null;
  status: LessonStatus | null;
}): Promise<LessonLibraryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_lesson_library", {
    p_search: input.search,
    p_status: input.status,
  });
  if (error) return [];
  return (data ?? []).map((lesson) => ({
    lessonId: lesson.lesson_id,
    title: lesson.title,
    summary: lesson.summary,
    scriptureReferences: lesson.scripture_references,
    audience: lesson.audience,
    lessonStatus: lesson.lesson_status,
    updatedAt: lesson.updated_at,
    canManage: lesson.can_manage,
  }));
}

export async function getLessonWorkspace(
  lessonId: string,
): Promise<LessonWorkspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_lesson_workspace", {
    p_lesson_id: lessonId,
  });
  if (error) return null;
  const parsed = lessonWorkspaceSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function createLesson(input: LessonInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_lesson", rpcInput(input));
  return error || !data
    ? { success: false as const }
    : { success: true as const, lessonId: data };
}

export async function updateLesson(lessonId: string, input: LessonInput) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_lesson", {
    p_lesson_id: lessonId,
    ...rpcInput(input),
  });
  return !error;
}

export async function archiveLesson(lessonId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_lesson", {
    p_lesson_id: lessonId,
  });
  return !error;
}

type CurriculumPlanInput = {
  title: string;
  summary: string | null;
  audience: string | null;
  status: Exclude<CurriculumStatus, "archived">;
  startsOn: string | null;
  endsOn: string | null;
};

const planRpcInput = (input: CurriculumPlanInput) => ({
  p_title: input.title,
  p_summary: input.summary,
  p_audience: input.audience,
  p_status: input.status,
  p_starts_on: input.startsOn,
  p_ends_on: input.endsOn,
});

export async function listCurriculumPlans(input: {
  search: string | null;
  status: CurriculumStatus | null;
}): Promise<CurriculumPlanEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_curriculum_plans", {
    p_search: input.search,
    p_status: input.status,
  });
  if (error) return [];
  return (data ?? []).map((plan) => ({
    curriculumPlanId: plan.curriculum_plan_id,
    title: plan.title,
    summary: plan.summary,
    audience: plan.audience,
    curriculumStatus: plan.curriculum_status,
    startsOn: plan.starts_on,
    endsOn: plan.ends_on,
    lessonCount: plan.lesson_count,
    canManage: plan.can_manage,
  }));
}

export async function getCurriculumPlanWorkspace(
  curriculumPlanId: string,
): Promise<CurriculumPlanWorkspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_curriculum_plan_workspace",
    { p_curriculum_plan_id: curriculumPlanId },
  );
  if (error) return null;
  const parsed = curriculumPlanWorkspaceSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function listCurriculumPlanLessons(
  curriculumPlanId: string,
): Promise<CurriculumPlanLesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "list_curriculum_plan_lessons",
    { p_curriculum_plan_id: curriculumPlanId },
  );
  if (error) return [];
  return (data ?? []).map((lesson) => ({
    planLessonId: lesson.plan_lesson_id,
    lessonId: lesson.lesson_id,
    lessonTitle: lesson.lesson_title,
    lessonStatus: lesson.lesson_status,
    scriptureReferences: lesson.scripture_references,
    audience: lesson.audience,
    sequenceNumber: lesson.sequence_number,
  }));
}

export async function createCurriculumPlan(input: CurriculumPlanInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_curriculum_plan",
    planRpcInput(input),
  );
  return error || !data
    ? { success: false as const }
    : { success: true as const, curriculumPlanId: data };
}

export async function updateCurriculumPlan(
  curriculumPlanId: string,
  input: CurriculumPlanInput,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_curriculum_plan", {
    p_curriculum_plan_id: curriculumPlanId,
    ...planRpcInput(input),
  });
  return !error;
}

export async function archiveCurriculumPlan(curriculumPlanId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_curriculum_plan", {
    p_curriculum_plan_id: curriculumPlanId,
  });
  return !error;
}

export async function addLessonToCurriculumPlan(
  curriculumPlanId: string,
  lessonId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_lesson_to_curriculum_plan", {
    p_curriculum_plan_id: curriculumPlanId,
    p_lesson_id: lessonId,
  });
  return !error;
}

export async function removeLessonFromCurriculumPlan(planLessonId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "remove_lesson_from_curriculum_plan",
    { p_plan_lesson_id: planLessonId },
  );
  return !error;
}

export async function moveCurriculumPlanLesson(
  planLessonId: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "move_curriculum_plan_lesson" as never,
    {
      p_plan_lesson_id: planLessonId,
      p_direction: direction,
    } as never,
  );
  return error || typeof data !== "number"
    ? { success: false as const }
    : { success: true as const, sequenceNumber: data };
}

export async function listLessonTeachingResources(
  lessonId: string,
): Promise<TeachingResource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "list_lesson_teaching_resources",
    { p_lesson_id: lessonId },
  );
  if (error) return [];
  return (data ?? []).map((resource) => ({
    teachingResourceId: resource.teaching_resource_id,
    title: resource.title,
    resourceType: resource.resource_type,
    description: resource.description,
    externalUrl: resource.external_url,
    originalFileName: resource.original_file_name,
    contentType: resource.content_type,
    fileSizeBytes: resource.file_size_bytes,
    hasFile: resource.has_file,
  }));
}

export async function createTeachingResourceLink(input: {
  lessonId: string;
  title: string;
  resourceType: "video" | "link" | "other";
  description: string | null;
  externalUrl: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_teaching_resource_link", {
    p_lesson_id: input.lessonId,
    p_title: input.title,
    p_resource_type: input.resourceType,
    p_description: input.description,
    p_external_url: input.externalUrl,
  });
  return !error;
}

export async function archiveTeachingResource(teachingResourceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_teaching_resource", {
    p_teaching_resource_id: teachingResourceId,
  });
  return !error;
}

type TeachingResourceUploadInput = {
  lessonId: string;
  title: string;
  resourceType: "document" | "pdf" | "video" | "other";
  description: string | null;
  originalFileName: string;
  contentType:
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    | "text/plain"
    | "video/mp4";
  fileSizeBytes: number;
};

export async function prepareTeachingResourceUpload(
  input: TeachingResourceUploadInput,
) {
  const supabase = await createClient();
  const teachingResourceId = randomUUID();
  const extension = input.originalFileName.toLowerCase().match(
    /\.(pdf|docx|pptx|txt|mp4)$/,
  )?.[1];
  if (!extension) return { success: false as const };
  const storageObjectPath =
    `${input.lessonId}/${teachingResourceId}/upload.${extension}`;
  const { data, error } = await supabase.storage
    .from("curriculum-files")
    .createSignedUploadUrl(storageObjectPath);
  if (error) return { success: false as const };
  return {
    success: true as const,
    teachingResourceId,
    storageObjectPath,
    token: data.token,
  };
}

export async function finalizeTeachingResourceUpload(
  input: TeachingResourceUploadInput & {
    teachingResourceId: string;
    storageObjectPath: string;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_teaching_resource_file", {
    p_teaching_resource_id: input.teachingResourceId,
    p_lesson_id: input.lessonId,
    p_title: input.title,
    p_resource_type: input.resourceType,
    p_description: input.description,
    p_storage_object_path: input.storageObjectPath,
    p_original_file_name: input.originalFileName,
    p_content_type: input.contentType,
    p_file_size_bytes: input.fileSizeBytes,
  });
  if (!error) return { success: true as const };
  const code = typeof error.code === "string" && error.code
    ? error.code
    : "unknown";
  const category = code === "42501"
    ? "authorization"
    : code === "22023" || code === "23514"
    ? "validation"
    : "unavailable";
  console.error("Curriculum upload finalization failed", {
    operation: "create_teaching_resource_file",
    code,
    category,
  });
  return { success: false as const, category };
}

export async function createTeachingResourceDownloadUrl(
  teachingResourceId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "authorize_curriculum_resource_download",
    { p_teaching_resource_id: teachingResourceId },
  );
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const value = data as Record<string, unknown>;
  if (typeof value.bucket !== "string" ||
    typeof value.objectPath !== "string" ||
    typeof value.fileName !== "string") return null;
  const signed = await supabase.storage.from(value.bucket).createSignedUrl(
    value.objectPath,
    60,
    { download: value.fileName },
  );
  return signed.error ? null : signed.data.signedUrl;
}
