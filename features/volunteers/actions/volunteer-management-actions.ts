"use server";

import { revalidatePath } from "next/cache";

import {
  availabilitySchema,
  assignmentStatusSchema,
  certificationSchema,
  skillAssignmentSchema,
  skillSchema,
  volunteerScheduleSchema,
  volunteerProfileSchema,
} from "@/features/volunteers/schemas/volunteer-management-schema";
import {
  createSkill,
  saveAvailability,
  saveCertification,
  saveSkillAssignment,
  saveVolunteerProfile,
  scheduleVolunteer,
  setAssignmentStatus,
} from "@/features/volunteers/services/volunteer-management-service";

import type { VolunteerActionState } from "@/features/volunteers/types/volunteer-management";

const value = (formData: FormData, name: string) => formData.get(name) ?? "";
const nullableId = (formData: FormData, name: string) => {
  const item = formData.get(name);
  return typeof item === "string" && item ? item : null;
};
const finish = (profileId: string) => {
  revalidatePath("/volunteers");
  revalidatePath(`/volunteers/${profileId}`);
};

export async function saveVolunteerProfileAction(
  _state: VolunteerActionState, formData: FormData,
): Promise<VolunteerActionState> {
  const parsed = volunteerProfileSchema.safeParse({
    ...Object.fromEntries(formData),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { success: false, message: "Review the profile details." };
  if (!await saveVolunteerProfile(parsed.data)) {
    return { success: false, message: "This profile change was not allowed." };
  }
  finish(parsed.data.profileId);
  return { success: true, message: "Volunteer profile saved and audited." };
}

export async function saveCertificationAction(
  _state: VolunteerActionState, formData: FormData,
): Promise<VolunteerActionState> {
  const parsed = certificationSchema.safeParse({
    id: nullableId(formData, "id"), profileId: value(formData, "profileId"),
    name: value(formData, "name"), issuer: value(formData, "issuer"),
    issuedAt: value(formData, "issuedAt"),
    expiresAt: value(formData, "expiresAt"), status: value(formData, "status"),
    reference: value(formData, "reference"),
  });
  if (!parsed.success) return { success: false, message: "Review the certification." };
  if (!await saveCertification(parsed.data)) {
    return { success: false, message: "This certification could not be saved." };
  }
  finish(parsed.data.profileId);
  return { success: true, message: "Certification saved and audited." };
}

export async function createSkillAction(
  _state: VolunteerActionState, formData: FormData,
): Promise<VolunteerActionState> {
  const parsed = skillSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Review the skill." };
  if (!await createSkill(parsed.data)) {
    return { success: false, message: "This skill could not be created." };
  }
  finish(parsed.data.profileId);
  return { success: true, message: "Skill created and audited." };
}

export async function saveSkillAssignmentAction(
  _state: VolunteerActionState, formData: FormData,
): Promise<VolunteerActionState> {
  const parsed = skillAssignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Review the skill selection." };
  if (!await saveSkillAssignment(parsed.data)) {
    return { success: false, message: "This skill could not be assigned." };
  }
  finish(parsed.data.profileId);
  return { success: true, message: "Skill assignment saved and audited." };
}

export async function saveAvailabilityAction(
  _state: VolunteerActionState, formData: FormData,
): Promise<VolunteerActionState> {
  const parsed = availabilitySchema.safeParse({
    ...Object.fromEntries(formData), id: nullableId(formData, "id"),
  });
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt) {
    return { success: false, message: "Review the availability window." };
  }
  if (!await saveAvailability(parsed.data)) {
    return { success: false, message: "This availability could not be saved." };
  }
  finish(parsed.data.profileId);
  return { success: true, message: "Availability saved and audited." };
}

export async function scheduleVolunteerAction(
  _state: VolunteerActionState, formData: FormData,
): Promise<VolunteerActionState> {
  const parsed = volunteerScheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || Boolean(parsed.data.startsAt) !== Boolean(parsed.data.endsAt) ||
    (parsed.data.startsAt && parsed.data.endsAt &&
      parsed.data.endsAt <= parsed.data.startsAt)) {
    return { success: false, message: "Review the volunteer assignment." };
  }
  if (!await scheduleVolunteer(parsed.data)) {
    return { success: false, message: "This assignment could not be scheduled." };
  }
  finish(parsed.data.profileId);
  return { success: true, message: "Volunteer assignment scheduled and audited." };
}

export async function setAssignmentStatusAction(
  _state: VolunteerActionState, formData: FormData,
): Promise<VolunteerActionState> {
  const parsed = assignmentStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, message: "Invalid assignment response." };
  if (!await setAssignmentStatus(parsed.data.assignmentId, parsed.data.status)) {
    return { success: false, message: "This assignment response was not allowed." };
  }
  finish(parsed.data.profileId);
  return { success: true, message: "Assignment response saved and audited." };
}
