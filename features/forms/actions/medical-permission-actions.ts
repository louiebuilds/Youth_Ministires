"use server";

import { revalidatePath } from "next/cache";

import {
  eventPermissionSlipRequirementSchema,
  schoolYearMedicalRequirementSchema,
} from "@/features/forms/schemas/medical-permission-schema";
import {
  recordPaperMedicalRelease,
  setEventPermissionSlipRequirement,
  setSchoolYearMedicalRequirement,
} from "@/features/forms/services/medical-permission-service";
import type { DocumentSubmissionActionState } from "@/features/forms/types/document-submissions";

export async function setSchoolYearMedicalRequirementAction(
  _: DocumentSubmissionActionState,
  formData: FormData,
): Promise<DocumentSubmissionActionState> {
  const parsed =
    schoolYearMedicalRequirementSchema.safeParse(
      Object.fromEntries(formData),
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Choose an August 1 school-year start and published Medical Release version.",
    };
  }

  try {
    await setSchoolYearMedicalRequirement(
      parsed.data.schoolYearStart,
      parsed.data.templateVersionId,
    );

    revalidatePath("/permission-forms");

    return {
      success: true,
      message:
        "Current school-year medical form configured and audited.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Medical form configuration was denied.",
    };
  }
}

export async function recordPaperMedicalReleaseAction(
  _: DocumentSubmissionActionState,
  formData: FormData,
): Promise<DocumentSubmissionActionState> {
  const studentId = String(
    formData.get("studentId") ?? "",
  ).trim();

  const templateVersionId = String(
    formData.get("templateVersionId") ?? "",
  ).trim();

  const reason = String(
    formData.get("reason") ?? "",
  ).trim();

  if (!studentId || !templateVersionId) {
    return {
      success: false,
      message:
        "Student and current Medical Release version are required.",
    };
  }

  if (reason && (reason.length < 5 || reason.length > 1000)) {
    return {
      success: false,
      message:
        "The optional receipt note must be between 5 and 1000 characters.",
    };
  }

  try {
    await recordPaperMedicalRelease(
      studentId,
      templateVersionId,
      reason || undefined,
    );

    revalidatePath("/permission-forms");

    return {
      success: true,
      message:
        "Paper Medical Release recorded and retained in history.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Paper Medical Release receipt was denied.",
    };
  }
}

export async function setEventPermissionSlipRequirementAction(
  _: DocumentSubmissionActionState,
  formData: FormData,
): Promise<DocumentSubmissionActionState> {
  const parsed =
    eventPermissionSlipRequirementSchema.safeParse(
      Object.fromEntries(formData),
    );

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Review the permission-slip requirement.",
    };
  }

  try {
    await setEventPermissionSlipRequirement(
      parsed.data.eventId,
      parsed.data.required,
      parsed.data.templateVersionId,
    );

    revalidatePath(`/events/${parsed.data.eventId}`);

    return {
      success: true,
      message:
        "Event permission-slip requirement updated with history retained.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Permission-slip configuration was denied.",
    };
  }
}