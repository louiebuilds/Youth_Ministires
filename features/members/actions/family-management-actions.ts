"use server";

import { revalidatePath } from "next/cache";

import {
  addFamilyAdultSchema,
  createFamilySchema,
  familyAdultSchema,
  familyDetailsSchema,
} from "@/features/members/schemas/family-management-schema";
import {
  addFamilyAdult,
  createFamily,
  updateFamilyAdult,
  updateFamilyDetails,
} from "@/features/members/services/family-directory-service";

import type { FamilyManagementState } from "@/features/members/types/family-management";
import { redirect } from "next/navigation";

const checked = (formData: FormData, name: string) =>
  formData.get(name) === "on";

export async function updateFamilyDetailsAction(
  _state: FamilyManagementState,
  formData: FormData,
): Promise<FamilyManagementState> {
  const parsed = familyDetailsSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: "Review the family details and try again." };
  }

  const result = await updateFamilyDetails(parsed.data);

  if (!result.success) {
    return { success: false, message: "This family update was not allowed." };
  }

  revalidatePath(`/families/${parsed.data.householdId}`);
  revalidatePath("/families");
  return { success: true, message: "Family details updated and audited." };
}

export async function updateFamilyAdultAction(
  _state: FamilyManagementState,
  formData: FormData,
): Promise<FamilyManagementState> {
  const parsed = familyAdultSchema.safeParse({
    householdId: formData.get("householdId"),
    personId: formData.get("personId"),
    firstName: formData.get("firstName"),
    preferredName: formData.get("preferredName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    relationshipLabel: formData.get("relationshipLabel"),
    isResponsibleAdult: checked(formData, "isResponsibleAdult"),
    isPrimaryContact: checked(formData, "isPrimaryContact"),
    receiveEmail: checked(formData, "receiveEmail"),
    receiveSms: checked(formData, "receiveSms"),
    receiveEmergencyNotifications: checked(
      formData,
      "receiveEmergencyNotifications",
    ),
  });

  if (!parsed.success) {
    return { success: false, message: "Review the contact details and try again." };
  }

  const result = await updateFamilyAdult(parsed.data);

  if (!result.success) {
    return { success: false, message: "This contact update was not allowed." };
  }

  revalidatePath(`/families/${parsed.data.householdId}`);
  return { success: true, message: "Contact and permissions updated and audited." };
}

export async function createFamilyAction(
  _state: FamilyManagementState,
  formData: FormData,
): Promise<FamilyManagementState> {
  const parsed = createFamilySchema.safeParse({
    ...Object.fromEntries(formData),
    receiveEmail: checked(formData, "receiveEmail"),
    receiveSms: checked(formData, "receiveSms"),
    receiveEmergencyNotifications: checked(
      formData,
      "receiveEmergencyNotifications",
    ),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Review the family and responsible-adult details.",
    };
  }
  const result = await createFamily(parsed.data);
  if (!result.success) {
    return { success: false, message: "This family could not be created." };
  }
  revalidatePath("/families");
  redirect(`/families/${result.householdId}`);
}

export async function addFamilyAdultAction(
  _state: FamilyManagementState,
  formData: FormData,
): Promise<FamilyManagementState> {
  const parsed = addFamilyAdultSchema.safeParse({
    householdId: formData.get("householdId"),
    firstName: formData.get("firstName"),
    preferredName: formData.get("preferredName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    relationshipLabel: formData.get("relationshipLabel"),
    isResponsibleAdult: checked(formData, "isResponsibleAdult"),
    isPrimaryContact: checked(formData, "isPrimaryContact"),
    receiveEmail: checked(formData, "receiveEmail"),
    receiveSms: checked(formData, "receiveSms"),
    receiveEmergencyNotifications: checked(
      formData,
      "receiveEmergencyNotifications",
    ),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Provide valid contact details and an email address or phone.",
    };
  }
  const result = await addFamilyAdult(parsed.data);
  if (!result.success) {
    return { success: false, message: "This adult contact could not be added." };
  }
  revalidatePath(`/families/${parsed.data.householdId}`);
  return { success: true, message: "Adult contact added and audited." };
}
