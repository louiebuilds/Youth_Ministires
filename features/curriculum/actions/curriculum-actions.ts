"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveLessonSchema,
  lessonDetailsSchema,
} from "@/features/curriculum/schemas/lesson-schema";
import {
  archiveCurriculumPlanSchema,
  curriculumPlanDetailsSchema,
  curriculumPlanLessonSchema,
  removeCurriculumPlanLessonSchema,
} from "@/features/curriculum/schemas/curriculum-plan-schema";
import {
  archiveTeachingResourceSchema,
  teachingResourceLinkSchema,
  teachingResourceUploadFinalizeSchema,
  teachingResourceUploadRequestSchema,
  downloadTeachingResourceSchema,
} from "@/features/curriculum/schemas/teaching-resource-schema";
import {
  archiveLesson,
  addLessonToCurriculumPlan,
  archiveCurriculumPlan,
  archiveTeachingResource,
  createCurriculumPlan,
  createTeachingResourceLink,
  createTeachingResourceDownloadUrl,
  createLesson,
  updateLesson,
  removeLessonFromCurriculumPlan,
  updateCurriculumPlan,
  finalizeTeachingResourceUpload,
  prepareTeachingResourceUpload,
} from "@/features/curriculum/services/curriculum-service";

import type { CurriculumActionState } from "@/features/curriculum/types/curriculum";

export async function createLessonAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const parsed = lessonDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Review the lesson details." };
  }
  const result = await createLesson(parsed.data);
  if (!result.success) {
    return { success: false, message: "This lesson could not be created." };
  }
  revalidatePath("/curriculum");
  redirect(`/curriculum/lessons/${result.lessonId}`);
}

export async function updateLessonAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const parsed = lessonDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !parsed.data.lessonId ||
    !await updateLesson(parsed.data.lessonId, parsed.data)) {
    return { success: false, message: "This lesson could not be updated." };
  }
  revalidatePath("/curriculum");
  revalidatePath(`/curriculum/lessons/${parsed.data.lessonId}`);
  return { success: true, message: "Lesson updated and audited." };
}

export async function archiveLessonAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const parsed = archiveLessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await archiveLesson(parsed.data.lessonId)) {
    return { success: false, message: "This lesson could not be archived." };
  }
  revalidatePath("/curriculum");
  redirect("/curriculum");
}

export async function createCurriculumPlanAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const parsed = curriculumPlanDetailsSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success || (parsed.data.startsOn && parsed.data.endsOn &&
    parsed.data.endsOn < parsed.data.startsOn)) {
    return { success: false, message: "Review the curriculum plan details." };
  }
  const result = await createCurriculumPlan(parsed.data);
  if (!result.success) {
    return { success: false, message: "This curriculum plan could not be created." };
  }
  revalidatePath("/curriculum");
  redirect(`/curriculum/plans/${result.curriculumPlanId}`);
}

export async function updateCurriculumPlanAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const parsed = curriculumPlanDetailsSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success || !parsed.data.curriculumPlanId ||
    (parsed.data.startsOn && parsed.data.endsOn &&
      parsed.data.endsOn < parsed.data.startsOn) ||
    !await updateCurriculumPlan(
      parsed.data.curriculumPlanId,
      parsed.data,
    )) {
    return { success: false, message: "This curriculum plan could not be updated." };
  }
  revalidatePath("/curriculum");
  revalidatePath(`/curriculum/plans/${parsed.data.curriculumPlanId}`);
  return { success: true, message: "Curriculum plan updated and audited." };
}

export async function archiveCurriculumPlanAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const parsed = archiveCurriculumPlanSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success ||
    !await archiveCurriculumPlan(parsed.data.curriculumPlanId)) {
    return { success: false, message: "This curriculum plan could not be archived." };
  }
  revalidatePath("/curriculum");
  redirect("/curriculum");
}

export async function addLessonToCurriculumPlanAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const parsed = curriculumPlanLessonSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success || !await addLessonToCurriculumPlan(
    parsed.data.curriculumPlanId,
    parsed.data.lessonId,
  )) {
    return { success: false, message: "This lesson could not be added." };
  }
  revalidatePath(`/curriculum/plans/${parsed.data.curriculumPlanId}`);
  return { success: true, message: "Lesson added to the plan and audited." };
}

export async function removeLessonFromCurriculumPlanAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const parsed = removeCurriculumPlanLessonSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success ||
    !await removeLessonFromCurriculumPlan(parsed.data.planLessonId)) {
    return { success: false, message: "This lesson could not be removed." };
  }
  revalidatePath(`/curriculum/plans/${parsed.data.curriculumPlanId}`);
  return { success: true, message: "Lesson removed and sequence updated." };
}

export async function createTeachingResourceLinkAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const parsed = teachingResourceLinkSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success || !await createTeachingResourceLink(parsed.data)) {
    return { success: false, message: "Review the teaching resource link." };
  }
  revalidatePath(`/curriculum/lessons/${parsed.data.lessonId}`);
  return { success: true, message: "Teaching resource added and audited." };
}

export async function archiveTeachingResourceAction(
  _state: CurriculumActionState,
  formData: FormData,
): Promise<CurriculumActionState> {
  const parsed = archiveTeachingResourceSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success ||
    !await archiveTeachingResource(parsed.data.teachingResourceId)) {
    return { success: false, message: "Teaching resource was not archived." };
  }
  revalidatePath(`/curriculum/lessons/${parsed.data.lessonId}`);
  return { success: true, message: "Teaching resource archived." };
}

export async function prepareTeachingResourceUploadAction(input: unknown) {
  const parsed = teachingResourceUploadRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, message: "Review the selected file." };
  }
  const result = await prepareTeachingResourceUpload(parsed.data);
  return result.success
    ? result
    : { success: false as const, message: "Upload authorization failed." };
}

export async function finalizeTeachingResourceUploadAction(input: unknown) {
  const parsed = teachingResourceUploadFinalizeSchema.safeParse(input);
  if (!parsed.success ||
    !await finalizeTeachingResourceUpload(parsed.data)) {
    return {
      success: false as const,
      message: "The uploaded file could not be finalized.",
    };
  }
  revalidatePath(`/curriculum/lessons/${parsed.data.lessonId}`);
  return {
    success: true as const,
    message: "Private teaching resource uploaded and audited.",
  };
}

export async function downloadTeachingResourceAction(formData: FormData) {
  const parsed = downloadTeachingResourceSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) redirect("/curriculum");
  const url = await createTeachingResourceDownloadUrl(
    parsed.data.teachingResourceId,
  );
  if (!url) redirect("/curriculum");
  redirect(url);
}
