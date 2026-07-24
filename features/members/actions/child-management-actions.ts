"use server";

import { revalidatePath } from "next/cache";

import {
  createChildSchema,
  createTagSchema,
  childDetailsSchema,
  childRelationshipSchema,
  setChildTagsSchema,
} from "@/features/members/schemas/child-management-schema";
import {
  createChild,
  createMemberTag,
  setChildTags,
  updateChildDetails,
  updateChildRelationship,
} from "@/features/members/services/child-workspace-service";

import type { FamilyManagementState } from "@/features/members/types/family-management";
import { redirect } from "next/navigation";

const checked = (formData: FormData, name: string) =>
  formData.get(name) === "on";

export async function updateChildDetailsAction(
  _state: FamilyManagementState,
  formData: FormData,
): Promise<FamilyManagementState> {
  const parsed = childDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Review the child details and try again." };
  }
  const result = await updateChildDetails(parsed.data);
  if (!result.success) {
    return { success: false, message: "This child update was not allowed." };
  }
  revalidatePath(`/students/${parsed.data.studentId}`);
  revalidatePath("/students");
  return { success: true, message: "Child details updated and audited." };
}

export async function updateChildRelationshipAction(
  _state: FamilyManagementState,
  formData: FormData,
): Promise<FamilyManagementState> {
  const parsed = childRelationshipSchema.safeParse({
    studentId: formData.get("studentId"),
    personId: formData.get("personId"),
    relationshipType: formData.get("relationshipType"),
    isLegalGuardian: checked(formData, "isLegalGuardian"),
    isEmergencyContact: checked(formData, "isEmergencyContact"),
    isAuthorizedPickup: checked(formData, "isAuthorizedPickup"),
    maySignPermissionForms: checked(formData, "maySignPermissionForms"),
    mayViewStudentInformation: checked(
      formData,
      "mayViewStudentInformation",
    ),
    receiveEmail: checked(formData, "receiveEmail"),
    receiveSms: checked(formData, "receiveSms"),
  });
  if (!parsed.success) {
    return { success: false, message: "Review the relationship and try again." };
  }
  const result = await updateChildRelationship(parsed.data);
  if (!result.success) {
    return { success: false, message: "This permission update was not allowed." };
  }
  revalidatePath(`/students/${parsed.data.studentId}`);
  return { success: true, message: "Relationship permissions updated and audited." };
}

export async function createChildAction(
  _state: FamilyManagementState,
  formData: FormData,
): Promise<FamilyManagementState> {
  const parsed = createChildSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Review the child and guardian details." };
  }
  const result = await createChild(parsed.data);
  if (!result.success) {
    return { success: false, message: "This child could not be created." };
  }
  revalidatePath("/students");
  revalidatePath(`/families/${parsed.data.householdId}`);
  redirect(`/students/${result.studentId}`);
}

export async function createTagAction(
  _state: FamilyManagementState,
  formData: FormData,
): Promise<FamilyManagementState> {
  const parsed = createTagSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: "Enter a valid tag name and color." };
  }
  const result = await createMemberTag(parsed.data.name, parsed.data.color);
  if (!result.success) {
    return { success: false, message: "This tag could not be created." };
  }
  revalidatePath(`/students/${parsed.data.studentId}`);
  return { success: true, message: "Tag created. Select it below to assign it." };
}

export async function setChildTagsAction(
  _state: FamilyManagementState,
  formData: FormData,
): Promise<FamilyManagementState> {
  const parsed = setChildTagsSchema.safeParse({
    studentId: formData.get("studentId"),
    tagIds: formData.getAll("tagIds"),
  });
  if (!parsed.success) {
    return { success: false, message: "One or more selected tags are invalid." };
  }
  const result = await setChildTags(parsed.data.studentId, parsed.data.tagIds);
  if (!result.success) {
    return { success: false, message: "Tag assignments could not be saved." };
  }
  revalidatePath(`/students/${parsed.data.studentId}`);
  revalidatePath("/students");
  return { success: true, message: "Child tags updated and audited." };
}
