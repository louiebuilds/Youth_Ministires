"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { categoryIdSchema, categorySchema, resourceDownloadSchema, resourceIdSchema, resourceSchema, resourceUploadFinalizeSchema, resourceUploadRequestSchema } from "@/features/resource-library/schemas/resource-library-schema";
import { archiveLibraryResource, archiveResourceCategory, createLibraryResource, createLibraryResourceDownloadUrl, createResourceCategory, finalizeLibraryResourceUpload, prepareLibraryResourceUpload, publishLibraryResource, updateResourceCategory } from "@/features/resource-library/services/resource-library-service";
import type { ResourceLibraryActionState } from "@/features/resource-library/types/resource-library";

export async function saveCategoryAction(_state: ResourceLibraryActionState, formData: FormData): Promise<ResourceLibraryActionState> {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Review the category details." };
  const ok = parsed.data.categoryId
    ? await updateResourceCategory(parsed.data.categoryId, parsed.data.name, parsed.data.description)
    : await createResourceCategory(parsed.data.name, parsed.data.description);
  if (!ok) return { success: false, message: "The category could not be saved." };
  revalidatePath("/resources");
  return { success: true, message: parsed.data.categoryId ? "Category updated." : "Category created." };
}

export async function archiveCategoryAction(_state: ResourceLibraryActionState, formData: FormData): Promise<ResourceLibraryActionState> {
  const parsed = categoryIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await archiveResourceCategory(parsed.data.categoryId)) return { success: false, message: "The category was not archived." };
  revalidatePath("/resources");
  return { success: true, message: "Category archived." };
}

export async function createResourceAction(_state: ResourceLibraryActionState, formData: FormData): Promise<ResourceLibraryActionState> {
  const parsed = resourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await createLibraryResource(parsed.data)) return { success: false, message: "The draft resource could not be created." };
  revalidatePath("/resources");
  return { success: true, message: "Draft resource created. Add a file before publishing." };
}

export async function publishResourceAction(_state: ResourceLibraryActionState, formData: FormData): Promise<ResourceLibraryActionState> {
  const parsed = resourceIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await publishLibraryResource(parsed.data.resourceId)) return { success: false, message: "Add a file version before publishing this resource." };
  revalidatePath("/resources");
  return { success: true, message: "Resource published." };
}

export async function archiveResourceAction(_state: ResourceLibraryActionState, formData: FormData): Promise<ResourceLibraryActionState> {
  const parsed = resourceIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !await archiveLibraryResource(parsed.data.resourceId)) return { success: false, message: "The resource was not archived." };
  revalidatePath("/resources");
  return { success: true, message: "Resource archived." };
}

export async function prepareLibraryResourceUploadAction(input: unknown) {
  const parsed = resourceUploadRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, message: "Review the selected file." };
  const result = await prepareLibraryResourceUpload(parsed.data);
  return result.success ? result : { success: false as const, message: "Upload authorization failed." };
}

export async function finalizeLibraryResourceUploadAction(input: unknown) {
  const parsed = resourceUploadFinalizeSchema.safeParse(input);
  if (!parsed.success || !await finalizeLibraryResourceUpload(parsed.data)) return { success: false as const, message: "The uploaded file could not be registered." };
  revalidatePath("/resources");
  return { success: true as const, message: "Private file version uploaded and audited." };
}

export async function downloadLibraryResourceAction(formData: FormData) {
  const parsed = resourceDownloadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/resources");
  const url = await createLibraryResourceDownloadUrl(parsed.data.resourceId, parsed.data.versionId);
  if (!url) redirect("/resources");
  redirect(url);
}
