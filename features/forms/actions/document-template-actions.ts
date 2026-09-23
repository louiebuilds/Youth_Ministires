"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createTemplateSchema,
  templateIdSchema,
  versionDraftSchema,
  versionIdSchema,
} from "@/features/forms/schemas/document-template-schema";
import {
  archiveDocumentTemplate,
  createDocumentTemplate,
  finalizeBlankMasterUpload,
  prepareBlankMasterUpload,
  publishDocumentTemplateVersion,
  retireDocumentTemplateVersion,
  saveDocumentTemplateVersion,
} from "@/features/forms/services/document-template-service";
import type { DocumentTemplateActionState } from "@/features/forms/types/document-templates";

const failed = (message: string): DocumentTemplateActionState => ({ success: false, message });
const completed = (message: string): DocumentTemplateActionState => ({ success: true, message });

export async function createDocumentTemplateAction(
  _state: DocumentTemplateActionState,
  formData: FormData,
): Promise<DocumentTemplateActionState> {
  const parsed = createTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed("Review the template details.");
  let templateId: string;
  try {
    templateId = await createDocumentTemplate(parsed.data);
  } catch (error) {
    return failed(error instanceof Error ? error.message : "The template could not be created.");
  }
  redirect(`/permission-forms/${templateId}`);
}

export async function saveDocumentTemplateVersionAction(
  _state: DocumentTemplateActionState,
  formData: FormData,
): Promise<DocumentTemplateActionState> {
  const parsed = versionDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed("Review the version validity details.");
  try {
    await saveDocumentTemplateVersion(parsed.data);
    revalidatePath(`/permission-forms/${parsed.data.templateId}`);
    return completed(parsed.data.versionId ? "Draft version updated." : "Draft version created.");
  } catch (error) {
    return failed(error instanceof Error ? error.message : "The draft version could not be saved.");
  }
}

export async function prepareBlankMasterUploadAction(versionId: string) {
  const parsed = versionIdSchema.parse(versionId);
  return prepareBlankMasterUpload(parsed);
}

export async function finalizeBlankMasterUploadAction(
  versionId: string,
  originalFileName: string,
) {
  const parsed = versionIdSchema.parse(versionId);
  await finalizeBlankMasterUpload(parsed, originalFileName);
  revalidatePath("/permission-forms");
}

export async function publishDocumentTemplateVersionAction(
  _state: DocumentTemplateActionState,
  formData: FormData,
): Promise<DocumentTemplateActionState> {
  const parsed = versionIdSchema.safeParse(formData.get("versionId"));
  if (!parsed.success) return failed("The template version is invalid.");
  try {
    await publishDocumentTemplateVersion(parsed.data);
    revalidatePath("/permission-forms");
    return completed("Template version published and locked.");
  } catch (error) {
    return failed(error instanceof Error ? error.message : "The version could not be published.");
  }
}

export async function retireDocumentTemplateVersionAction(
  _state: DocumentTemplateActionState,
  formData: FormData,
): Promise<DocumentTemplateActionState> {
  const parsed = versionIdSchema.safeParse(formData.get("versionId"));
  if (!parsed.success) return failed("The template version is invalid.");
  try {
    await retireDocumentTemplateVersion(parsed.data);
    revalidatePath("/permission-forms");
    return completed("Template version retired; its history and master remain retained.");
  } catch (error) {
    return failed(error instanceof Error ? error.message : "The version could not be retired.");
  }
}

export async function archiveDocumentTemplateAction(
  _state: DocumentTemplateActionState,
  formData: FormData,
): Promise<DocumentTemplateActionState> {
  const parsed = templateIdSchema.safeParse(formData.get("templateId"));
  if (!parsed.success) return failed("The template is invalid.");
  try {
    await archiveDocumentTemplate(parsed.data);
    revalidatePath("/permission-forms");
    return completed("Template archived; version history remains retained.");
  } catch (error) {
    return failed(error instanceof Error ? error.message : "The template could not be archived.");
  }
}
